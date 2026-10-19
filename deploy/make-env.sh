#!/bin/sh
# สร้างไฟล์ .env สำหรับ production บน VPS — สุ่มความลับให้เอง ไม่ต้องพิมพ์รหัสผ่าน/secret ใด ๆ
#
# วิธีใช้ (ในโฟลเดอร์ ~/app บน VPS ในฐานะ user deploy):
#   sh make-env.sh <ghcr.io/user/repo> <โดเมน> <อีเมลแอดมิน> <เบอร์ทดสอบ OTP คั่นด้วย , หรือ *>
# ตัวอย่าง:
#   sh make-env.sh ghcr.io/nawaphorn47/kuvin kuvinn.tech me@example.com 0812345678,0898765432
#
# - สุ่ม POSTGRES_PASSWORD, JWT_SECRET (96 ตัวอักษร) และรหัสผ่านแอดมินคนแรก
# - ทุก port bind ที่ 127.0.0.1 → เข้าได้ผ่าน Nginx เท่านั้น
# - OTP_MODE=test: ยังไม่ได้ซื้อ SMS แอปโชว์รหัสแทน — จำกัดเฉพาะเบอร์ที่ระบุ ("*" = ทุกเบอร์ ใครก็เข้าบัญชีคนอื่นได้ ใช้เฉพาะเดโม)
# - ไม่เขียนทับ .env เดิม (กันรหัสผ่านไม่ตรงกับฐานข้อมูลที่สร้างไปแล้ว)
set -e

if [ "$#" -lt 4 ]; then
  echo "วิธีใช้: sh make-env.sh <ghcr.io/user/repo> <โดเมน> <อีเมลแอดมิน> <เบอร์ทดสอบ OTP คั่นด้วย , หรือ *>"
  exit 1
fi

if [ -f .env ]; then
  echo "มีไฟล์ .env อยู่แล้ว — ไม่เขียนทับ (ถ้าต้องการสร้างใหม่ ให้ลบ .env ก่อน แต่รหัสฐานข้อมูลใหม่จะไม่ตรงกับ volume เดิม)"
  exit 1
fi

# ชื่อ image บน GHCR ต้องเป็นตัวพิมพ์เล็ก
IMAGE=$(echo "$1" | tr '[:upper:]' '[:lower:]')
DOMAIN=$(echo "$2" | tr '[:upper:]' '[:lower:]')
ADMIN_EMAIL="$3"
OTP_PHONES="$4"
DB_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 48)
ADMIN_PASSWORD=$(openssl rand -hex 12)

cat > .env <<EOT
POSTGRES_USER=kuvin
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=kuvin
DATABASE_URL=postgresql://kuvin:$DB_PASSWORD@db:5432/kuvin?schema=public

# bind เฉพาะ 127.0.0.1 → เข้าได้ผ่าน Nginx เท่านั้น
API_BIND=127.0.0.1:3301
WEB_BIND=127.0.0.1:3302
ADMIN_BIND=127.0.0.1:3303
API_IMAGE=$IMAGE-api:latest
WEB_IMAGE=$IMAGE-web:latest
ADMIN_IMAGE=$IMAGE-admin:latest

JWT_SECRET=$JWT_SECRET
CORS_ORIGINS=https://$DOMAIN,https://admin.$DOMAIN
OTP_MODE=test
OTP_TEST_PHONES=$OTP_PHONES
# ปิดตรวจสลิปอัตโนมัติ (คนขับกดยืนยันรับเงินเอง) จนกว่าจะต่อ EasySlip — ห้ามใช้ mock บน production
SLIP_PROVIDER=off

# บัญชีแอดมินคนแรก — ล็อกอินแล้ว "ลบบรรทัด SEED_ADMIN_PASSWORD ทิ้ง" (ตั้งไว้ทุกครั้งที่ deploy = รีเซ็ตรหัสแอดมินเป็นค่านี้)
SEED_ADMIN_EMAIL=$ADMIN_EMAIL
SEED_ADMIN_PASSWORD=$ADMIN_PASSWORD
EOT

chmod 600 .env
echo "สร้าง .env แล้ว (image: $IMAGE, โดเมน: $DOMAIN)"
echo "รหัสผ่านแอดมินคนแรกอยู่ใน .env:  grep SEED_ADMIN_PASSWORD .env"
