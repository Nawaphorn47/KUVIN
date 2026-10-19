# Deploy KU VIN ขึ้น Hostinger VPS

แนวทางตาม `DEPLOY_GUIDE.md` ของอาจารย์ ([suriyapi/nextjs-crud-starter](https://github.com/suriyapi/nextjs-crud-starter))
ค่าจริงของโปรเจกต์นี้: VPS Ubuntu 24.04 (KVM 1) · IP `187.127.100.24` · โดเมน `kuvinn.tech` · repo `Nawaphorn47/KUVIN`

```text
git push (main) → CI (test + docker build) → Deploy: build 3 image → GHCR (Private, tag latest + sha)
   → VPS: docker compose pull + up -d → health check
VPS: Nginx + HTTPS (certbot) → 127.0.0.1:3301-3303 → container → db (volume)
```

| บริการ | โดเมน | พอร์ตบน VPS | image |
|---|---|---|---|
| เว็บแอปผู้โดยสาร/คนขับ | `kuvinn.tech` | `127.0.0.1:3302` | `ghcr.io/nawaphorn47/kuvin-web` |
| API + Socket.IO | `api.kuvinn.tech` | `127.0.0.1:3301` | `ghcr.io/nawaphorn47/kuvin-api` |
| แดชบอร์ดแอดมิน | `admin.kuvinn.tech` | `127.0.0.1:3303` | `ghcr.io/nawaphorn47/kuvin-admin` |
| PostgreSQL | – (ไม่เปิดออกนอก) | – | `postgres:16-alpine` + volume `pgdata` |

ข้อมูลที่ต้องไม่หาย: volume `pgdata` (ฐานข้อมูล) และ `uploads` (เอกสารคนขับ/เซลฟี่) — **ห้ามใช้ `docker compose down -v`**

## ไฟล์ใน repo

| ไฟล์ | หน้าที่ |
|---|---|
| `docker-compose.yml` | db → api → web, admin ใช้ได้ทั้งเครื่อง dev และ VPS (ชื่อ image อ่านจาก `.env`) |
| `docker-compose.override.yml` | เฉพาะ dev: เปิด port ฐานข้อมูล `127.0.0.1:5533` (ไม่ copy ไป VPS) |
| `.env.example` | ตัวอย่างค่าสำหรับ dev (`cp .env.example .env`) |
| `apps/*/Dockerfile` | รันด้วย user ที่ไม่ใช่ root + `HEALTHCHECK` (api = `node`, web/admin = `nginx`) |
| `deploy/make-env.sh` | สร้าง `.env` บน VPS โดยสุ่ม `JWT_SECRET`/รหัส DB/รหัสแอดมิน ไม่ต้องพิมพ์ความลับเอง |
| `deploy/nginx.conf` | reverse proxy 3 โดเมน (มี WebSocket สำหรับ Socket.IO) |
| `.github/workflows/ci.yml` | ทดสอบ + ทดลอง `docker build` ทั้ง 3 image |
| `.github/workflows/deploy.yml` | build + push GHCR → deploy ผ่าน SSH → health check (ข้าม job deploy ถ้ายังไม่ตั้ง `APP_URL`) |

`/health` ตรวจการเชื่อมต่อ DB จริง: ตอบ 200 เมื่อพร้อม และ **503 เมื่อ DB ล่ม โดย API ไม่ crash** (กลับมา 200 เองเมื่อ DB กลับมา)

ต่างจากตัวอย่างอาจารย์: ไม่มี image `migrator` แยก — API รัน `prisma migrate deploy` (และ seed ถ้าตั้ง `SEED_ADMIN_PASSWORD`) เองตอนเริ่ม container
ซึ่งเป็นแบบเดียวกับที่ใช้บน Railway และรันซ้ำได้ ไม่แตะข้อมูลเดิม

## ขั้นที่ต้องทำเอง

### 1) Commit + merge
1. ตรวจไฟล์ แล้ว commit + push (branch `feat/redesign-one-account`) ดูแท็บ **Actions** ว่า CI ผ่าน (รวมงาน `docker build`)
2. **Merge PR เข้า `main`** — workflow Deploy รันเฉพาะบน `main` และปุ่ม "Run workflow" ต้องมีไฟล์อยู่บน `main` ก่อนถึงจะขึ้น

### 2) DNS (Hostinger → โดเมน → DNS / Nameservers)
เพิ่ม A record 3 ตัวชี้มาที่ `187.127.100.24`: `@`, `api`, `admin` — ตรวจ: `nslookup api.kuvinn.tech`

### 3) บน VPS (ล็อกอินด้วย `ssh -i $env:USERPROFILE\.ssh\kuvin_vps deploy@187.127.100.24`)
```bash
mkdir -p ~/app
```
จากเครื่องคุณ (PowerShell) copy ไฟล์ตั้งต้นไป (ไฟล์ compose ตัวถัดไป workflow จะส่งให้เอง):
```powershell
scp -i $env:USERPROFILE\.ssh\kuvin_vps deploy\make-env.sh deploy\nginx.conf docker-compose.yml deploy@187.127.100.24:app/
```
กลับมาบน VPS สร้าง `.env` (ใส่เบอร์ที่จะใช้ทดสอบ OTP คั่นด้วย `,` — ตอนนี้ยังไม่มี SMS จริง แอปจะโชว์รหัสให้):
```bash
cd ~/app && sh make-env.sh ghcr.io/nawaphorn47/kuvin kuvinn.tech <อีเมลแอดมิน> 0812345678,0898765432
```
ดูรหัสแอดมินคนแรก (อยู่ใน `.env` ที่ VPS เท่านั้น ไม่ต้องส่งให้ใคร): `grep SEED_ADMIN_PASSWORD ~/app/.env`

### 4) ให้ VPS ดึง image จาก GHCR (image เป็น Private)
สร้าง token ที่ GitHub → Settings → Developer settings → Personal access tokens (classic) สิทธิ์ **`read:packages`** อย่างเดียว แล้วบน VPS:
```bash
docker login ghcr.io -u nawaphorn47
```
(วาง token ตอนถามรหัสผ่าน — พิมพ์เองบน VPS ห้ามส่งให้ใคร/ใส่ในไฟล์)

### 5) GitHub repo → Settings → Secrets and variables → Actions
| ชนิด | ชื่อ | ค่า |
|---|---|---|
| Secret | `VPS_HOST` | `187.127.100.24` |
| Secret | `VPS_USER` | `deploy` |
| Secret | `VPS_SSH_KEY` | เนื้อไฟล์ **private key** `kuvin_vps` ทั้งไฟล์ (รวมบรรทัด BEGIN/END) |
| Variable | `APP_URL` | `https://kuvinn.tech` |
| Variable | `API_URL` | `https://api.kuvinn.tech` |

จากนั้น Actions → **Deploy** → **Run workflow** (ครั้งแรก build 3 image ใช้เวลาหลายนาที)

### 6) Nginx + HTTPS (บน VPS ในฐานะ root: `ssh -i ... root@187.127.100.24`)
```bash
sed 's/example\.com/kuvinn.tech/g' /home/deploy/app/nginx.conf > /etc/nginx/sites-available/kuvin
ln -s /etc/nginx/sites-available/kuvin /etc/nginx/sites-enabled/kuvin
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d kuvinn.tech -d api.kuvinn.tech -d admin.kuvinn.tech --redirect
```
(certbot ใช้ได้เมื่อ DNS ชี้มาแล้วเท่านั้น)

### 7) ตรวจ
- `https://api.kuvinn.tech/health` → `{"ok":true,"db":"up"}`
- `https://kuvinn.tech` เปิดแอปได้ · `https://admin.kuvinn.tech` ล็อกอินด้วยอีเมลแอดมินกับรหัสจากข้อ 3
- ล็อกอินแอดมินได้แล้ว: ลบบรรทัด `SEED_ADMIN_PASSWORD` ออกจาก `~/app/.env` แล้ว `docker compose up -d` (ถ้าตั้งไว้ทุกครั้งที่ deploy = รีเซ็ตรหัสแอดมินเป็นค่านั้น)
- จะ deploy ใหม่: merge เข้า `main` (หรือ Run workflow) — ย้อนเวอร์ชัน: ตั้ง `API_IMAGE`/`WEB_IMAGE`/`ADMIN_IMAGE` เป็น tag `sha-xxxxxxx` เดิมแล้ว `docker compose up -d`

## ข้อควรระวัง
- **ความปลอดภัย:** `.env` อยู่เฉพาะบน VPS (`chmod 600`) ไม่อยู่ใน git/image — อ่านเช็กลิสต์ใน [SECURITY.md](SECURITY.md) หัวข้อ "เช็กลิสต์ก่อนเปิดใช้งานจริง"
- **OTP:** ยังเป็นโหมดทดสอบ (`OTP_MODE=test`) ให้รหัสเฉพาะเบอร์ใน `OTP_TEST_PHONES` เปลี่ยนเบอร์ได้โดยแก้ `.env` แล้ว `docker compose up -d`
- **สำรองข้อมูล:** volume `uploads` (เอกสารบัตร/เซลฟี่) และ `pgdata` — ถ้าอยากสำรองอัตโนมัติ Hostinger มีสแนปช็อตรายวัน (มีค่าใช้จ่ายเพิ่ม)
- **ลิงก์แชร์ทริป/APK:** แอป Android ต้อง build ด้วย `VITE_API_URL=https://api.kuvinn.tech/api` และ `VITE_PUBLIC_APP_URL=https://kuvinn.tech`
- **Railway:** `api` ตอนนี้รันด้วย user `node` — ถ้ายังใช้ Railway ต่อ ให้ตั้ง `RAILWAY_RUN_UID=0` ที่ service `api` ไม่งั้น volume `uploads` ที่ Railway mount เป็น root จะเขียนไฟล์ไม่ได้
