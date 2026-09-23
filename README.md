# KU VIN

ระบบเรียกวินมอเตอร์ไซค์ภายในมหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน (ปัญหาพิเศษ 02739498)

> **ใช้งานจริง:** https://web-app-production-6f95.up.railway.app (เว็บแอป) ·
> https://admin-production-2219.up.railway.app (แอดมิน) — push ขึ้น `main` แล้ว CI (GitHub Actions) ทดสอบ → ผ่านแล้ว
> Railway deploy ให้เอง ดูรายละเอียดที่ [`docs/CI_CD.md`](docs/CI_CD.md)

## โครงสร้างโปรเจกต์

```
kuvin/
├── apps/
│   ├── api/             # Backend: Node.js + Express + Prisma + PostgreSQL/PostGIS
│   ├── mobile/          # React + Vite + Tailwind — ผู้ใช้บริการ + ผู้ขับขี่ (สลับโหมดในแอปเดียว, mobile-first)
│   └── web-dashboard/   # React + Vite + Tailwind — Web Dashboard สำหรับผู้ดูแลระบบ
├── ui/
│   └── mobile/          # Wireframe / mockup อ้างอิงหน้าจอ (HTML)
├── docker/
│   └── docker-compose.yml
├── docs/
└── Proposal-....pdf
```

## เทคโนโลยีหลัก

| ส่วนประกอบ | เทคโนโลยี |
|---|---|
| Mobile | React + Vite + Tailwind CSS (mobile-first web app) + Capacitor (แอป Android)¹ |
| Web Dashboard | React + Vite + Tailwind CSS |
| Backend | Node.js + Express + Prisma |
| Database | PostgreSQL (image PostGIS — ยังไม่ได้ใช้ฟังก์ชัน PostGIS) |
| Real-time | Socket.io |
| Push Notification | Firebase Cloud Messaging (แอป Android) |
| Email | Brevo (HTTPS API) — ส่งรหัสรีเซ็ตรหัสผ่าน |
| Maps / Routing | Leaflet + OpenStreetMap + OSRM (ตอนนี้ใช้ demo server สาธารณะ) |
| Deploy | Docker + Railway, CI ด้วย GitHub Actions |

## สถานะปัจจุบัน (อัปเดต 24 ก.ย. 2569)

ระบบใช้งานจริงบน Railway แล้ว — เว็บแอป https://web-app-production-6f95.up.railway.app ·
แอดมิน https://admin-production-2219.up.railway.app · API https://kuvin-production.up.railway.app
(รายละเอียดการ deploy และตัวแปรทั้งหมดดู [`docs/CI_CD.md`](docs/CI_CD.md))

### ใช้งานได้แล้ว
- **บัญชี 3 role:** ผู้โดยสาร (สมัคร/ล็อกอินด้วยอีเมลไหนก็ได้ ไม่สนตัวพิมพ์เล็ก/ใหญ่), คนขับ (เบอร์โทร + ส่งเอกสาร
  ยืนยันตัวตน 5 ใบ ให้แอดมินอนุมัติ), แอดมิน — **ลืมรหัสผ่าน** (ผู้โดยสาร) ส่งรหัส 6 หลักทางอีเมลผ่าน Brevo
- **เรียกวินครบวงจร:** เลือกปลายทาง/ปักหมุด → ดูราคาก่อนยืนยัน (ในมหาวิทยาลัย 20 บาท, นอกมหาวิทยาลัย 10 บาท/กม.
  ตามระยะถนนจริง ขั้นต่ำ 20) → เสนองานให้คนขับ**ตามคิวทีละคน** (15 วินาที/คน) → ติดตามคนขับสดบนแผนที่ → จบทริป →
  ชำระเงินสดหรือพร้อมเพย์ + ตรวจสลิปอัตโนมัติ (EasySlip) → ให้คะแนนทั้งสองฝ่าย
- **Realtime:** Socket.io ต้อง auth ด้วย JWT; หน้าผู้โดยสาร/คนขับต่อกลับและดึงสถานะใหม่เองเมื่อการเชื่อมต่อหลุด
  (เช่น server restart ตอน deploy) และ poll สำรองทุก 5 วินาที
- **Push notification:** FCM ใช้งานจริงแล้วในแอป Android (ทดสอบบน emulator ส่งถึงเครื่องจริง) — เวอร์ชันเว็บไม่มี push
- **แอป Android:** Capacitor (`apps/mobile/android`) build APK ทดสอบด้วย `npm run android:dev` — ยังไม่มี build สำหรับแจก
- **SOS:** แจ้งเหตุพร้อมพิกัดให้แอดมินแบบ realtime + เบอร์ฉุกเฉินจริง (รปภ. 034-351-151, ตำรวจ 191, EMS 1669)
- **แอดมิน:** สถิติวันนี้, อนุมัติ/ปฏิเสธคนขับ, รายการทริป + แก้ข้อพิพาทการชำระเงิน, SOS realtime, จัดการสถานที่
  บนแผนที่ (รวมติ๊ก "ยอดนิยม" ที่ขึ้นหน้าแรกผู้โดยสาร), จัดการผู้ใช้/คนขับ + ระงับบัญชี
- **ข้อมูลทุกหน้าเป็นของจริง** — ลบ `mockData.js` ออกแล้วทั้งสองแอป; Chatbot เป็นผู้ช่วยตอบคำถามที่พบบ่อยตามกติกาจริง
  ของระบบ (ไม่มีเจ้าหน้าที่อ่านข้อความ)
- **ความปลอดภัยที่แก้ไปแล้ว:** Socket.io ไม่ตรวจ JWT, `GET /drivers/:id` เปิดเผยตำแหน่ง/เอกสารคนขับ, ลืมรหัสผ่าน
  คืน reset token ใน response (ยึดบัญชีคนอื่นได้), รหัสผ่านบัญชีเดโมหลุดใน bundle production, seed production สร้าง
  แอดมินรหัส `admin1234` — ดูรายละเอียดใน `apps/api/README.md`
- **ทดสอบอัตโนมัติ:** 4 ชุด (queue 17, auth 16, suspension 12, payment 28) รันใน CI ทุก push

### ยังไม่ทำ / รอ
- **เตรียม UAT ตาม proposal บทที่ 3.4:** สคริปต์ภารกิจ, แบบสอบถาม SUS, ความพึงพอใจผู้ใช้/คนขับ, วัด response time
- **หน้ารายงานสรุปสำหรับแอดมิน** (สถิติรายสัปดาห์/เดือน)
- **พิกัดอาคารที่ยังเป็นค่าประมาณ** — แก้ได้ที่หน้าแอดมิน "จัดการสถานที่" (หมุดสีเหลือง)
- **แอป Android สำหรับแจก:** release build ที่ sign แล้ว, ไอคอน/หน้าเปิดแอป/ไอคอนแจ้งเตือน, GPS ตอนปิดจอของคนขับ,
  กดแจ้งเตือนแล้วเปิดหน้าที่เกี่ยวข้อง
- **ยังไม่มีในระบบ:** ล็อกอินด้วย Google, สถานที่โปรด, คนขับแก้ไขโปรไฟล์เอง, คนขับลืมรหัสผ่าน, นโยบายความเป็นส่วนตัว (PDPA)
- **ตาม proposal แต่รอได้:** ตรวจขอบเขตแคมปัสด้วย PostGIS (ตอนนี้ใช้รัศมีจากจุดกลาง), รัน OSRM เอง (ตอนนี้ใช้
  demo server สาธารณะ), tile แผนที่สำหรับใช้งานจริง
- **Hardening:** helmet, logout ที่ยกเลิก token ได้, pagination บน list endpoint, automated test ฝั่ง frontend

## เริ่มต้นใช้งาน (Dev)

```bash
# ติดตั้ง dependencies ทุก workspace
npm install

# รัน backend
npm run dev:api

# รัน web dashboard
npm run dev:web

# รัน mobile
npm run dev:mobile
```

ดูรายละเอียดการตั้งค่าแต่ละส่วนใน README ของแต่ละ `apps/*`

### ทดสอบบนอุปกรณ์จริง 2 เครื่อง (ผ่าน LAN/Wi-Fi) — เผื่อตอนนำเสนออาจารย์

ให้อีกเครื่อง (เช่นมือถือ) ทำหน้าที่ผู้โดยสารหรือคนขับ ควบคู่ไปกับเครื่อง dev ที่รันเซิร์ฟเวอร์อยู่ ได้ดังนี้:

1. **ทั้งสองเครื่องต้องต่อ Wi-Fi วงเดียวกัน**
2. รัน `npm run dev:api` และ `npm run dev:mobile` ตามปกติในเครื่อง dev — mobile dev server (Vite) ตั้งค่า
   `host: true` ไว้แล้ว (`apps/mobile/vite.config.js`) จะขึ้น URL แบบ `Network: http://<IP เครื่องนี้>:5173/`
   ในเทอร์มินัลให้เห็นเลย ใช้เลข IP ตัวนั้นแหละ (หา manual ได้ด้วย `ipconfig` มองหา adapter ที่ต่อ Wi-Fi/LAN
   จริงอยู่ เช่น `192.168.0.196`)
3. เปิด `http://<IP เครื่องนี้>:5173` จากอีกเครื่องในเบราว์เซอร์ — โค้ดฝั่ง frontend (`lib/api.js`,
   `lib/socket.js`) ตั้งไว้ให้ยิง API/socket ไปที่ hostname เดียวกับที่เปิดหน้าเว็บอยู่โดยอัตโนมัติ (ไม่ hardcode
   `localhost`) ไม่ต้องตั้งค่าอะไรเพิ่ม — ล็อกอินคนละบัญชีในแต่ละเครื่องแล้วทดสอบคิว/booking แบบ real-time ข้ามเครื่องได้เลย
4. **ถ้าเข้าจากอีกเครื่องไม่ได้ (ค้าง/timeout)** — ส่วนใหญ่เป็นเพราะ Windows Defender Firewall บล็อกพอร์ต 5173
   (mobile) และ 4000 (api) อยู่ — ถ้ามี popup "อนุญาต Node.js ผ่าน Firewall" เด้งตอนรัน `npm run dev` ให้กด
   Allow ทั้ง Private และ Public ถ้าไม่เด้งเองต้องเปิดเอง: Windows Defender Firewall → Advanced Settings →
   Inbound Rules → New Rule → Port → TCP → พอร์ต `5173,4000` → Allow the connection

¹ เดิม proposal ระบุ React Native (Expo) แต่ wireframe ทุกหน้าถูกส่งออกจาก Figma มาเป็น HTML/Tailwind (มือถือแบบ responsive web)
จึงพัฒนา `apps/mobile` เป็น React + Tailwind ให้ตรงกับ wireframe แล้วห่อด้วย Capacitor เป็นแอป Android (ใช้โค้ดชุดเดียวกัน
ทั้งเว็บและแอป — ผู้ใช้ iPhone เปิดผ่านเบราว์เซอร์ได้) ต้องอธิบายการเปลี่ยนแปลงนี้ในรายงาน — ดูรายละเอียดใน `apps/mobile/README.md`


Role	Login	Password
User (ผู้ใช้บริการ)	อีเมล somjai@ku.th	user1234
Driver เบอร์วิน 1	เบอร์โทร 0800000002	driver1234
Driver เบอร์วิน 2	เบอร์โทร 0800000003	driver1234
Driver เบอร์วิน 3	เบอร์โทร 0800000004	driver1234
Admin	อีเมล admin@ku.th	admin1234
