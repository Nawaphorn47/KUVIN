#!/bin/sh
# สำรองข้อมูล KU VIN บน VPS: ฐานข้อมูล (pg_dump) + โฟลเดอร์อัปโหลด (เอกสารบัตร/ใบขับขี่ของคนขับ, เซลฟี่ผู้โดยสาร, โลโก้)
#
# วิธีใช้ (ในโฟลเดอร์ ~/app บน VPS ในฐานะ user deploy):
#   sh backup.sh                 # สำรองหนึ่งครั้งไปที่ ~/backups
#   sh backup.sh /path/to/dir    # ระบุโฟลเดอร์ปลายทาง
# ตั้งให้รันทุกคืนด้วย cron (crontab -e):
#   30 2 * * * cd ~/app && sh backup.sh >> ~/backups/backup.log 2>&1
#
# - เก็บ 7 วันล่าสุดเท่านั้น (ลบของเก่ากว่านั้นเอง) กันดิสก์เต็ม
# - ไฟล์สำรองมีข้อมูลส่วนบุคคล (PDPA): โฟลเดอร์ปลายทางสิทธิ์ 700 ไฟล์สิทธิ์ 600 — **อย่า** ส่งขึ้น cloud สาธารณะ/แชร์ต่อ
# - สำรองไว้เครื่องเดียวกันกับข้อมูลไม่พอ (ดิสก์เสีย = หายหมดทั้งคู่) ให้ดึงออกไปเก็บเครื่องอื่นเป็นระยะ:
#     scp -i ~/.ssh/kuvin_vps deploy@<IP>:backups/<ไฟล์> .
# ไม่แตะข้อมูลเดิม ไม่หยุด container (pg_dump อ่านขณะระบบทำงานได้)
set -eu

DEST="${1:-$HOME/backups}"
KEEP_DAYS=7
STAMP=$(date +%Y%m%d-%H%M%S)

if [ ! -f docker-compose.yml ] || [ ! -f .env ]; then
  echo "ต้องรันในโฟลเดอร์ที่มี docker-compose.yml และ .env (เช่น ~/app)"
  exit 1
fi

umask 077
mkdir -p "$DEST"
chmod 700 "$DEST"

# 1) ฐานข้อมูล — ชื่อ user/db อ่านจากตัวแปรใน container เอง ไม่ต้องอ่านรหัสผ่านจาก .env
# เขียนเป็นไฟล์ .sql ก่อนแล้วค่อยบีบ — ถ้า pipe ตรงเข้า gzip แล้ว pg_dump ล้มเหลว (เช่น container ไม่ได้รัน) gzip จะยังคืนสถานะสำเร็จ
# และได้ไฟล์ว่างที่ดูเหมือนสำรองสำเร็จ (sh ไม่มี pipefail)
cleanup() { rm -f "$DEST/db-$STAMP.sql" "$DEST/db-$STAMP.sql.gz" "$DEST/uploads-$STAMP.tar.gz"; }
trap 'rc=$?; [ "$rc" -eq 0 ] || { cleanup; echo "สำรองไม่สำเร็จ (ไม่ได้ลบของเก่า)"; }' EXIT
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' > "$DEST/db-$STAMP.sql"
[ "$(wc -c < "$DEST/db-$STAMP.sql")" -gt 1000 ] || { echo "สำรองฐานข้อมูลได้ไฟล์เล็กผิดปกติ — ตรวจว่า container db รันอยู่"; exit 1; }
gzip "$DEST/db-$STAMP.sql"

# 2) โฟลเดอร์อัปโหลดทั้งหมด (รวม .private)
docker compose exec -T api tar czf - -C /app/apps/api uploads > "$DEST/uploads-$STAMP.tar.gz"

# ตรวจว่าไฟล์ไม่ว่างและ gzip อ่านได้ ก่อนลบของเก่า (กันสำรองพังแล้วลบของดีทิ้ง)
gzip -t "$DEST/db-$STAMP.sql.gz"
gzip -t "$DEST/uploads-$STAMP.tar.gz"
[ -s "$DEST/uploads-$STAMP.tar.gz" ] || { echo "สำรองไฟล์อัปโหลดได้ไฟล์ว่าง"; exit 1; }

find "$DEST" -maxdepth 1 -type f \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete

echo "$(date -Is) สำรองสำเร็จ: db-$STAMP.sql.gz ($(du -h "$DEST/db-$STAMP.sql.gz" | cut -f1)), uploads-$STAMP.tar.gz ($(du -h "$DEST/uploads-$STAMP.tar.gz" | cut -f1))"
