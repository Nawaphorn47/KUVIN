# CI/CD

## สถานะตอนนี้

| ส่วน | สถานะ |
|---|---|
| CI (build + test อัตโนมัติทุก push/PR) | ✅ พร้อมใช้ — `.github/workflows/ci.yml` |
| Docker image สำหรับ 3 แอป | ✅ เขียนแล้ว ทดสอบ build จริงแล้ว (ยกเว้น `apps/api` — ดู "ที่ยังไม่ได้ทำ" ด้านล่าง) |
| CD (deploy อัตโนมัติขึ้นจริง) | ❌ ยังไม่มี — รอ 2 การตัดสินใจ (ดูหัวข้อถัดไป) |
| GitHub repo | ❌ ยังไม่ได้สร้าง/push โค้ดยังอยู่ในเครื่องอย่างเดียว |

## CI ทำอะไรให้ (`.github/workflows/ci.yml`)

ทุกครั้งที่ push (ทุก branch) หรือเปิด PR เข้า `main`:

1. **`apps/api`** — เปิด Postgres จริงใน CI (image เดียวกับ `docker/docker-compose.yml`), รัน migration, seed
   ข้อมูลเดโม แล้วรันชุดทดสอบทั้ง 3 ชุด (`test:queue`, `test:suspension`, `test:payment` — รวม 57 เคส)
   ตั้ง `SLIP_PROVIDER=mock` ให้อัตโนมัติ (ไม่กินโควตา EasySlip จริง) และรีสตาร์ต server ระหว่างชุดทดสอบตามที่
   `apps/api/README.md` บันทึกไว้ว่าจำเป็น (กันชนตัวจำกัดล็อกอิน 20 ครั้ง/15 นาที)
2. **`apps/mobile`** และ **`apps/web-dashboard`** — `npm run build` เฉย ๆ (ยังไม่มี automated test ฝั่ง frontend)

**ทดสอบแล้วจริงก่อนเขียนไฟล์นี้:** รันทุกขั้นตอนข้างต้นด้วยมือกับ Postgres container ใหม่เอี่ยม (ไม่ใช่ DB dev
ที่ migrate สะสมมานาน) เพื่อพิสูจน์ว่า migration ทั้งหมดยัง apply จากศูนย์ได้จริง ไม่ใช่แค่ "เคย migrate มาเรื่อย ๆ
จนลืมว่ามีปัญหาอะไรซ่อนอยู่" — ผ่านหมด 57/57

ยังไม่รันจริงบน GitHub Actions เพราะยังไม่มี repo — โครงสร้าง workflow ถูกต้องตามที่ทดสอบจำลองไว้ แต่ควรดู run แรกจริง ๆ
บน GitHub สักรอบเผื่อมีความต่างของ environment (เช่น เวอร์ชัน Docker, network policy ของ GitHub-hosted runner)

## ต้องตัดสินใจ 2 เรื่องก่อนต่อ CD ได้

### 1. จะ push ขึ้น GitHub เมื่อไหร่/แบบไหน
ต้องมี repo ก่อน CI ถึงจะรันได้จริง (ตอนนี้ไฟล์ workflow อยู่ในเครื่องเฉย ๆ) และต้องตัดสินใจว่า repo เป็น public
หรือ private — โค้ดมีข้อมูลอย่างเบอร์โทร/บัญชีเดโม (รหัสผ่านง่าย ๆ) ใน `apps/api/prisma/seed.js` และ credentials
จริงอยู่ใน `apps/api/.env` (ซึ่ง gitignore ไว้อยู่แล้ว ไม่หลุดไปกับ commit แต่ก็ควรระวังตอน push ครั้งแรก)

### 2. จะ deploy ที่ไหน (สำหรับ CD)
ต้องมี hosting 3 จุด:

| ส่วน | ต้องการอะไร | ตัวเลือกที่เข้ากับโปรเจกต์นี้ได้ |
|---|---|---|
| `apps/api` | Node runtime + PostgreSQL ที่ต่อกันได้ตลอดเวลา (ไม่ใช่ serverless เพราะมี Socket.io + background sweeper ที่ต้องรันค้างไว้) | Railway, Render, Fly.io, หรือ VPS เอง |
| `apps/mobile`, `apps/web-dashboard` | เสิร์ฟไฟล์ static (Docker image ที่เตรียมไว้ใช้ได้เลย) | Railway/Render (เสิร์ฟ Docker image เดียวกัน), Netlify/Vercel/Cloudflare Pages (deploy จาก `dist/` โดยตรง ไม่ต้องใช้ Docker เลยก็ได้) |

Docker image ของทั้ง 3 แอปพร้อมใช้แล้ว (ดูหัวข้อถัดไป) เลือก host ไหนก็ต่อ CD เข้า `.github/workflows/ci.yml`
เพิ่มได้เลย (เพิ่ม step build+push image หรือ deploy hook ต่อท้าย job ที่ build ผ่านแล้ว)

## Docker

- **`apps/api/Dockerfile`** — มีอยู่ก่อนแล้ว ยังไม่ได้ทดสอบ build ในรอบนี้ (เครื่อง dev พื้นที่ดิสก์เต็มระหว่างทดสอบ
  ดูหัวข้อ "ปัญหาด่วน" ท้ายไฟล์) **จุดที่น่าจะมีปัญหา:** `npm install --omit=dev` ข้าม `prisma` CLI (อยู่ใน
  devDependencies ส่วน `@prisma/client` อยู่ใน dependencies) แล้วบรรทัดถัดไปเรียก `npx prisma generate` ซึ่งจะไป
  ดึง `prisma` CLI จาก npm registry สด ๆ ตอน build แทนที่จะใช้เวอร์ชันที่ pin ไว้ใน `package.json` — น่าจะยังทำงาน
  ได้ (npx จัดการให้) แต่ไม่ reproducible เท่าที่ควร และช้ากว่าที่จำเป็น ควรแก้เป็น multi-stage ที่ install ครบ
  (รวม dev) ในสเตจ build, รัน `prisma generate`, แล้ว copy เฉพาะ `node_modules` ที่ prune แล้ว + โค้ดไปสเตจ
  รันจริง — ยังไม่แก้ตอนนี้เพราะทดสอบ build ไม่ได้ (ดิสก์เต็ม) ไม่อยากแก้โค้ดที่ verify ไม่ได้
- **`apps/mobile/Dockerfile`**, **`apps/web-dashboard/Dockerfile`** — เขียนใหม่ในรอบนี้ (เดิมไม่มี) multi-stage:
  build ด้วย Vite แล้วเสิร์ฟไฟล์ static ด้วย nginx พร้อม fallback ให้ React Router (`nginx.conf` ข้างไฟล์)
  **ทดสอบ build + รันจริงแล้ว** ทั้งหน้าแรกและ deep route (เช่น `/driver/home`) โหลดผ่าน (HTTP 200) ทั้งคู่
  รับ build arg `VITE_API_URL` (ต้องระบุตอน build ไม่ใช่ runtime เพราะ Vite ฝังค่าไว้ในบันเดิลแล้ว) ไม่ตั้งค่า
  จะ fallback ไปใช้ hostname เดียวกับหน้าเว็บที่เปิดอยู่ตามที่โค้ดเดิมออกแบบไว้ — ใช้ไม่ได้ถ้า frontend กับ
  backend อยู่คนละโดเมนกันตอน deploy จริง ต้องตั้งค่านี้ให้ถูกตอน build

## ⚠️ ปัญหาด่วนที่เจอระหว่างทำ (ไม่เกี่ยวกับ CI/CD โดยตรง)

**ไดรฟ์ C: ของเครื่อง dev เหลือพื้นที่ว่างแค่ ~30MB จากทั้งหมด 252GB (แทบเต็ม 100%)** ทำให้ `docker build` ของ
`apps/api` ล้มเหลวกลางทาง (`no space left on device`) — D: ยังปกติ (เหลือ ~128GB จาก 196GB) แต่ Docker Desktop
เก็บ image/cache ไว้ที่ C: โดยปริยาย ควรเช็คเร็ว ๆ นี้ (Docker Desktop → Settings → Resources → Disk image
location, หรือย้ายไป D:, หรือลบไฟล์ที่ไม่ใช้บน C: ทั่วไป) ไม่งั้นจะกระทบมากกว่าแค่ build Docker image เฉย ๆ
