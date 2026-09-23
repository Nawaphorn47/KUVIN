# CI/CD และการ deploy

## ระบบที่ใช้งานจริง (Railway, region Southeast Asia)

| ส่วน | URL | service บน Railway |
|---|---|---|
| เว็บแอป (ผู้โดยสาร/คนขับ ใช้ได้ทั้ง iPhone และ Android ผ่านเบราว์เซอร์) | https://web-app-production-6f95.up.railway.app | `web-app` |
| หน้าแอดมิน | https://admin-production-2219.up.railway.app | `admin` |
| API + Socket.io | https://kuvin-production.up.railway.app | `api` (+ volume `/app/apps/api/uploads`) |
| ฐานข้อมูล | ภายใน Railway เท่านั้น | `Postgres` (+ volume) |

## ขั้นตอนตั้งแต่ push จนขึ้นระบบจริง

1. push ขึ้น `main` ที่ [github.com/Nawaphorn47/KUVIN](https://github.com/Nawaphorn47/KUVIN)
2. **CI** (`.github/workflows/ci.yml`) รันอัตโนมัติ:
   - `apps/api`: เปิด Postgres ใน CI → `prisma migrate deploy` → seed → ชุดทดสอบ `test:queue`, `test:auth`,
     `test:suspension`, `test:payment` (ตั้ง `SLIP_PROVIDER=mock` ให้เอง ไม่เปลืองโควตา EasySlip)
   - `apps/mobile`, `apps/web-dashboard`: `vite build`
3. **CD**: ทุก service บน Railway เปิด "Wait for CI" ไว้ — CI ผ่านแล้ว Railway build Docker image ใหม่และ deploy ให้เอง
   (CI ไม่ผ่าน = ไม่ deploy) แต่ละ service build ใหม่เฉพาะเมื่อไฟล์ใน `watchPatterns` ของตัวเองเปลี่ยน
   (ดู `apps/*/railway.json`)
4. `api` ตอนเริ่ม container: `prisma migrate deploy` (ไม่แตะข้อมูลเดิม) → ถ้าตั้ง `SEED_ADMIN_PASSWORD` ไว้จะ seed
   สถานที่ + ตั้งรหัสผ่านแอดมินตามค่านั้น → เปิด server

## ตั้งค่า service บน Railway

ทุก service สร้างจาก GitHub repo เดียวกัน **ไม่ตั้ง Root Directory** (Dockerfile ทุกตัว build จาก root ของ repo เพราะต้องใช้
`package-lock.json` ของ workspace) และกำหนด Dockerfile ด้วยตัวแปร `RAILWAY_DOCKERFILE_PATH`

**`api`** — Variables:

| ตัวแปร | ค่า |
|---|---|
| `RAILWAY_DOCKERFILE_PATH` | `apps/api/Dockerfile` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | สุ่มเอง: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `SEED_ADMIN_EMAIL` | อีเมลแอดมิน |
| `SEED_ADMIN_PASSWORD` | ตั้งเฉพาะตอนสร้าง/รีเซ็ตรหัสแอดมิน (≥ 12 ตัว) — deploy ครั้งถัดไปจะตั้งรหัสแอดมินเป็นค่านี้ ใช้เสร็จแล้วลบทิ้ง |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | เนื้อหาทั้งไฟล์ service account ของ Firebase (push notification) |
| `SLIP_PROVIDER` / `EASYSLIP_API_KEY` | `easyslip` / key จาก EasySlip |
| `BREVO_API_KEY` / `MAIL_FROM` | ส่งรหัสรีเซ็ตรหัสผ่าน — `MAIL_FROM` เช่น `KU VIN <you@gmail.com>` ต้องยืนยันใน Brevo → Senders แล้ว |

ไม่ต้องตั้ง `PORT` (Railway ตั้งให้ ตอนนี้คือ 8080 — ใช้เลขนี้ตอน Generate Domain) และ `NODE_ENV=production` อยู่ใน Dockerfile แล้ว

**`web-app` / `admin`** — Variables:

| ตัวแปร | ค่า |
|---|---|
| `RAILWAY_DOCKERFILE_PATH` | `apps/mobile/Dockerfile` / `apps/web-dashboard/Dockerfile` |
| `VITE_API_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api` (ชื่อใน `${{ }}` ต้องตรงกับชื่อ service ของ API ทุกตัวอักษร) |

`VITE_API_URL` ถูกฝังลงในไฟล์ตอน build — แก้ค่าแล้วต้อง deploy ใหม่ถึงจะมีผล

## ข้อจำกัดที่ต้องรู้

- **Railway แผน Trial/Hobby บล็อก SMTP ขาออก** (พอร์ต 25/465/587/2525) — อีเมลจึงส่งผ่าน Brevo HTTPS API แทน
  (`apps/api/src/services/mail.service.js`) Gmail App Password ใช้ได้เฉพาะตอนรันในเครื่อง
- **API ต้องมี replica เดียว** (`numReplicas: 1` ใน `apps/api/railway.json`) — ตัวจับเวลาข้อเสนองานและ room ของ Socket.io
  อยู่ในหน่วยความจำของ process
- **`api` กับ `Postgres` ต้องอยู่ region เดียวกัน** — ตอน `api` อยู่สิงคโปร์แต่ DB อยู่ US West ทุก query ช้าเพิ่ม ~175 ms
  (วัดจริง: endpoint ที่ query DB 1 ครั้ง 224 ms → 56 ms หลังย้าย DB มาสิงคโปร์)
- **Railway trial** ใช้ได้ 30 วัน / $5 — ใช้ต่อหลังจากนั้นต้องเป็นแผน Hobby ($5/เดือน)
- **Push notification ทำงานเฉพาะแอป Android** (Capacitor + FCM) เวอร์ชันเว็บไม่มี push และคนขับบนเว็บต้องเปิดหน้าค้างไว้ถึงจะรับงานได้

## ทดสอบ image บนเครื่องตัวเอง

```bash
docker build -f apps/api/Dockerfile -t kuvin-api .
docker build -f apps/mobile/Dockerfile --build-arg VITE_API_URL=https://example.test/api -t kuvin-web .
docker build -f apps/web-dashboard/Dockerfile --build-arg VITE_API_URL=https://example.test/api -t kuvin-admin .
```

frontend image ฟังพอร์ตตาม `$PORT` (ค่าเริ่มต้น 80) เช่น `docker run -e PORT=8080 -p 5190:8080 kuvin-web`
