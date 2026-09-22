# KU VIN

ระบบเรียกวินมอเตอร์ไซค์ภายในมหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน (ปัญหาพิเศษ 02739498)

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
| Mobile | React + Vite + Tailwind CSS (mobile-first web app)¹ |
| Web Dashboard | React + Vite + Tailwind CSS |
| Backend | Node.js + Express + Prisma |
| Database | PostgreSQL + PostGIS |
| Real-time | Socket.io |
| Push Notification | Firebase Cloud Messaging |
| Maps / Routing | Leaflet + OSRM (self-hosted) |
| Deploy | Docker |

## สถานะปัจจุบัน (อัปเดต 3 ก.ย. 2569)

### Backend (`apps/api`) — ครบ core flow แล้ว
- Auth ครบ 3 role: user (ล็อกอินด้วยอีเมล `@ku.th`), driver (เบอร์โทร), admin — มี forgot/reset password (dev mode)
- Booking flow เต็มวงจร: พรีวิวค่าโดยสาร (`estimate`) → สร้างคำขอ (คำนวณระยะทาง/ค่าโดยสารอัตโนมัติ) → คนขับรับงาน
  (กัน race condition ด้วย transaction) → start/complete → ชำระเงิน/แจ้งข้อพิพาท → ให้คะแนนได้ทั้งสองฝ่าย
  (user ให้คนขับ, คนขับให้ผู้โดยสาร)
- **Dispatch แบบคิวหมุนเวียนตามเบอร์วิน (วินคิวจริง)**: เสนองานให้คนขับ**ทีละคน**ตามลำดับเบอร์วิน (vinNumber ต้อง
  เป็นตัวเลขล้วน) ผ่าน private room ต่อคน — ถ้าไม่ตอบภายใน 60 วิ (`GET/background sweep` ทุก 5 วิ) หรือกดปฏิเสธ
  (`POST /service-requests/:id/decline`) จะเลื่อนไปเสนอเบอร์ถัดไปอัตโนมัติ และคนขับที่รับงาน/ถูกข้ามจะถูกเลื่อนไป
  ท้ายคิว (`Driver.queueBumpedAt`) — ถ้าลองครบทุกคนในคิวแล้วไม่มีใครรับ คำขอจะถูกยกเลิกอัตโนมัติ
  (ดู `serviceRequest.service.js`: `offerNextInQueue`/`sweepExpiredOffers`)
- Admin: สรุปสถิติรายวัน, อนุมัติ/ปฏิเสธการยืนยันตัวตนคนขับ, ดู/แก้ข้อพิพาทการชำระเงิน
- Push notification (FCM) ต่อ `firebase-admin` SDK จริงแล้ว รอแค่ credentials จาก Firebase Console
  (ตอนนี้ทำงานแบบ log-only mode ไม่ block flow หลัก)
- Realtime (Socket.io) ต้อง auth ด้วย JWT ก่อน connect เท่านั้น
- อัปโหลดรูปภาพจริงแล้ว (`POST /api/uploads`, multer เก็บ local disk, จำกัดเฉพาะรูป ≤5MB) — ใช้กับรูปยืนยันตัวตนคนขับ
  (บัตร ปชช./ใบขับขี่/รถ/ทะเบียน/หน้าตรง) ได้ url จริง — `POST /drivers/me/verify` **บังคับแนบรูปครบทั้ง 5 ใบ**ก่อนเข้าสถานะ
  PENDING ให้ admin ตรวจ (ไม่ให้ส่งแบบไม่มีเอกสารได้อีกต่อไป)
- ปุ่ม SOS มี backend หนุนหลังจริงแล้ว (`POST /api/sos`) บันทึกเหตุการณ์ลง DB พร้อมพิกัด และแจ้งเตือน admin
  แบบ real-time ทันทีผ่าน Socket.io (`sos:new`) — admin ดู/ปิดเคสได้ที่ `GET/POST /api/admin/sos`
  แอปไม่โทรออกให้อัตโนมัติ (ทำไม่ได้ในเว็บแอป/เพื่อความปลอดภัย ต้องให้ผู้ใช้กดยืนยันโทรเอง) แต่มี
  `POST /api/sos/:id/contacted { contactedEmergencyNumber: "1669" | "191" }` ให้บันทึกไว้ว่าผู้แจ้งกดโทร
  หน่วยแพทย์ฉุกเฉิน (1669) หรือตำรวจ (191) ไปแล้วหรือยัง เพื่อให้ admin เห็นว่ามีการประสานงานหน่วยงานภายนอกหรือไม่
- **แก้ช่องโหว่ความปลอดภัยไปแล้ว 2 จุดในรอบนี้ (เจอจากการ audit เอง ไม่ใช่ user รายงาน):**
  1. Socket.io เดิมไม่ตรวจ JWT ตอน connect เลย → client ปลอมตัว join room ของคนอื่นได้ (ดักดูตำแหน่ง/สถานะทริปคนอื่น)
     → เพิ่ม auth middleware ที่ connect ใช้ id/role จาก token เท่านั้น ไม่เชื่อค่าที่ client ส่งมาเอง
  2. `GET /api/drivers/:id` เดิมเป็น public route (ไม่ต้อง login) และคืนข้อมูลดิบเกือบทั้งหมดของคนขับ รวมเบอร์โทร,
     รูปบัตรประชาชน/เอกสารรถ, **พิกัด GPS สด**, fcm token → แก้โดยบังคับ login ก่อนเรียก และแยกฟังก์ชัน
     `getPublicDriver` ที่คืนแค่ `id/fullName/photoUrl/vehicleModel/licensePlate/ratingAvg/ratingCount`
     ส่วน `getDriver` แบบเต็มใช้เฉพาะ `/me` (เจ้าของข้อมูลเอง) เท่านั้น
  - รายละเอียด endpoint/ทดสอบดูได้ใน `apps/api/README.md`

### Mobile (`apps/mobile`) — UI ครบตาม wireframe แล้ว, บางหน้าต่อ backend จริงแล้ว
- แปลง wireframe เดิม (HTML ใน `ui/mobile/`) เป็น React + Vite + Tailwind ครบ 33 หน้าจอ (ผู้ใช้ 14 + คนขับ 14 + auth 5)
  สลับโหมด user/driver ในแอปเดียวผ่าน `AppContext`
- รวมดีไซน์เป็นระบบเดียว (ฟอนต์ Prompt รองรับไทย, โทนเขียว KU) จาก wireframe เดิมที่มีสไตล์ปนกัน
- ข้อมูลส่วนใหญ่ยังเป็น **mock** (`src/lib/mockData.js`) — หน้า login/register/booking flow ยังไม่ต่อ backend จริง
  (จงใจเว้นไว้ รอผู้ใช้รื้อ/ปรับหน้าบ้านเองก่อนค่อยต่อสาย) แต่ 3 จุดต่อไปนี้ต่อ backend จริงแล้ว (ใช้ `lib/auth.js`
  เก็บ JWT ใน localStorage + `lib/api.js` axios interceptor แนบ token อัตโนมัติ — ยังใช้งานไม่ได้เต็มที่จนกว่าจะมี
  login จริงที่ set token ให้):
  1. **Login** (`pages/auth/Login.jsx`) — มีสลับ role ผู้ใช้บริการ/คนขับ เรียก `POST /auth/user/login` หรือ
     `POST /auth/driver/login` จริง เก็บ token ผ่าน `lib/auth.js` แล้ว redirect เข้า home ของ role นั้น — ปุ่ม
     "สลับเป็น Driver/Passenger Mode" ใน Profile/DriverProfile และปุ่ม "ออกจากระบบ" เปลี่ยนเป็น clear token +
     ไป `/login` จริงแล้ว (คนละบัญชีกันจริง ไม่ใช่แค่ toggle UI เฉย ๆ เหมือนเดิม)
  2. **ยืนยันตัวตนคนขับ** (`VerifyStep1`/`VerifyStep2`) — ถ่ายรูปจริงผ่าน `<input type="file">`, อัปโหลดผ่าน
     `POST /api/uploads` แล้วส่ง url ไป `POST /drivers/me/verify` ตอนกด "ส่งข้อมูลเพื่อตรวจสอบ"
  3. **รับงานคิววิน** (`DriverHome`/`IncomingJob`) — ปรับ UI ใหม่ทั้งคู่ (ไม่มีปุ่ม "จำลอง" แล้ว) ตอนออนไลน์จะ
     เชื่อม socket จริงและรอ event `service-request:new` (ถึงตาคิวเมื่อไหร่ได้ยินตอนนั้น มี progress bar
     นับถอยหลัง 60 วิ), ปุ่มรับ/ปฏิเสธเรียก `POST /service-requests/:id/accept|decline` จริง —
     `DriverHome` ดึงโปรไฟล์จริงจาก `GET /drivers/me` ด้วย (ไม่ใช่ mock name/เบอร์วินอีกต่อไปเมื่อ login แล้ว)
     ถ้ายังไม่ login จะเห็นปุ่ม "เข้าสู่ระบบเพื่อรับงาน" แทน
  4. **ปุ่ม SOS** — เปลี่ยนจาก full-page navigate เป็น **bottom sheet ผุดทับหน้าเดิม**
     (`components/shared/SosPanel.jsx`, ใช้จาก `DriverArriving`/`DuringRide` ระหว่างทริป ไม่หลุดออกจากแผนที่/
     บริบททริป) มีขั้นตอน **กดค้าง 1.2 วิเพื่อยืนยัน** กันกดพลาด, ส่งพิกัดจริงไป `POST /api/sos`, ปุ่มโทร
     1669/191 ยังใช้ `tel:` ปกติ (ไม่ auto-dial) แต่บันทึกไว้เบื้องหลังผ่าน `POST /api/sos/:id/contacted`,
     และยกเลิกได้เองถ้ากดผิดผ่าน `POST /api/sos/:id/cancel` (endpoint ใหม่ — เฉพาะเจ้าของ alert) —
     route `/sos` เดิมยังอยู่ (ใช้ `SosPanel variant="page"` เดียวกัน) สำหรับเข้าถึงตรง ๆ นอกช่วงมีทริป
- **แผนที่จริง (Leaflet + OpenStreetMap + OSRM)** — `components/shared/MapView.jsx` แทน `MapPlaceholder` ทุกหน้าจอ:
  - หน้ายืนยันการเรียกวินเห็นเส้นทางถนนจริง ระยะทาง เวลาเดินทาง และ**ลากหมุดจุดรับ**ปรับตำแหน่งได้
  - เลือกปลายทางได้จาก**ปักหมุดบนแผนที่** (`/pick-on-map`) นอกเหนือจากรายชื่อสถานที่
  - ค่าโดยสารนอกมหาวิทยาลัยคิดจาก**ระยะทางบนถนนจริง** (OSRM) ไม่ใช่เส้นตรง (ในมหาวิทยาลัยยังเหมาจ่าย 20 บาท)
  - ติดตามคนขับ**สดๆ**: แอปคนขับส่ง GPS ผ่าน socket `driver:location` (ทุก ~3 วิ) ผู้โดยสารเห็นหมุดคนขับเคลื่อนที่
    พร้อม ETA ระหว่างมารับและระหว่างเดินทาง
  - **ข้อจำกัด:** browser อนุญาต GPS เฉพาะ HTTPS หรือ `localhost` — เปิดผ่าน `http://<IP ในวง LAN>` (ทดสอบ 2 เครื่อง)
    จะไม่ได้ตำแหน่ง แอปจึงให้ผู้โดยสารลากหมุดจุดรับเอง และฝั่งคนขับจะไม่ส่งตำแหน่ง (แจ้งเหตุผลบนหน้าจอ) —
    ใช้งานจริงต้อง deploy เป็น HTTPS
  - พิกัดสถานที่ใน seed: หอสมุด/โรงพยาบาลสัตว์/หอพัก/ตลาด ตรวจกับ OpenStreetMap แล้ว ส่วนที่เหลือเป็น**ค่าประมาณ**
    รอบจุดกลางมหาวิทยาลัย (14.0230, 99.9739) เพราะ OSM ยังไม่มีข้อมูลอาคารเหล่านั้น — แก้ให้ตรงได้ที่หน้า admin "จัดการสถานที่"

### Web Dashboard (`apps/web-dashboard`) — ต่อ backend จริงครบแล้ว
- `AdminLogin` — login จริงผ่าน `POST /auth/admin/login`
- `AdminDashboard`:
  - สถิติวันนี้จริงจาก `GET /admin/stats` (ทริป/รายได้/คนขับออนไลน์/อนุมัติแล้ว/รออนุมัติ/ข้อพิพาทค้าง)
  - รออนุมัติคนขับ — กด "ตรวจสอบ" เปิด modal เห็นรูปเอกสารครบทั้ง 5 ใบ (หน้าตรง/บัตร ปชช./ใบขับขี่/รถ/ป้ายทะเบียน)
    อนุมัติ/ปฏิเสธ (ต้องใส่เหตุผล) ได้จริงผ่าน `POST /admin/drivers/:id/approve|reject`
  - รายการเดินทางทั้งหมดจริงจาก `GET /admin/trips` พร้อมปุ่มแก้ข้อพิพาทการชำระเงิน
  - **แจ้งเหตุฉุกเฉิน (SOS) แบบ real-time** — ฟัง `sos:new` ผ่าน socket จริง (จุดที่เคยเป็นช่องว่างใหญ่สุด:
    backend ส่ง event ถูกต้องมาตลอดแต่ไม่เคยมีหน้าไหนฟังเลย) มีเบอร์โทรผู้แจ้ง/ลิงก์ดูตำแหน่งบน Google Maps/
    ปิดเคสได้จริงผ่าน `POST /admin/sos/:id/resolve`
- **จัดการสถานที่** (`/landmarks`) — แผนที่จริงแสดงหมุดทุกสถานที่ (เขียว = ตรวจพิกัดแล้ว, เหลือง = ค่าประมาณ) เลือกสถานที่แล้ว
  **ลากหมุดหรือคลิกบนแผนที่**เพื่อย้ายพิกัด, เพิ่ม/แก้ชื่อ/ลบสถานที่, กรองดูเฉพาะที่ยังเป็นค่าประมาณ, เตือนถ้าพิกัดอยู่ไกล
  จากมหาวิทยาลัยผิดปกติ — ผ่าน `GET/POST/PATCH/DELETE /admin/landmarks` (ผู้โดยสารเห็นพิกัดใหม่ทันที)
- **จัดการผู้ใช้และคนขับ** (`/people`) — ค้นหา/กรองผู้ใช้และคนขับ (ชื่อ เบอร์ อีเมล เบอร์วิน ทะเบียน / สถานะออนไลน์-ยืนยัน-ระงับ),
  ดูรายละเอียดรายคน: สถิติ (ทริป สำเร็จ/ยกเลิก ยอดเงิน ข้อพิพาท คะแนน), เอกสารยืนยันตัวตนของคนขับ, ประวัติทริปล่าสุด และ
  **ระงับ/ปลดระงับบัญชี** (ต้องใส่เหตุผล) — บัญชีที่ถูกระงับจะถูกตัดออกจากระบบทันที (REST + socket) ใช้ token เดิมหรือ login
  ไม่ได้ ผู้ใช้เห็นเหตุผลบนหน้า login; คนขับที่ถูกระงับจะออกจากคิว/ส่งต่อข้อเสนองานที่ค้างให้คนถัดไปทันที; ระงับไม่ได้ขณะมีทริป
  ที่รับงาน/กำลังเดินทางอยู่ (ผู้ใช้ที่แค่รอคนขับอยู่ คำขอจะถูกยกเลิกให้อัตโนมัติ)
- **การชำระเงิน:** ผู้โดยสารโอนตาม QR พร้อมเพย์แล้วแนบสลิปในแอป ระบบตรวจสลิปกับธนาคาร (ยอด ผู้รับ เวลา กันสลิปซ้ำ) แล้วเปลี่ยนเป็น
  "จ่ายแล้ว" ให้อัตโนมัติ ทั้งฝั่งคนขับและผู้โดยสารอัปเดตเอง; ไม่ผ่านจะบอกเหตุผลและส่งใหม่ได้ (จำกัดจำนวนครั้ง); เงินสดหรือระบบตรวจ
  ล่มคนขับยังกดยืนยันเองได้ — หน้า admin ตารางทริปมีคอลัมน์ "การชำระเงิน" (จ่ายด้วยวิธีไหน เลขอ้างอิง เหตุผลที่สลิปไม่ผ่าน)
- ยังไม่มี: หน้ารายงานสรุปตาม proposal, แก้ไขข้อมูลโปรไฟล์ผู้ใช้/คนขับแทนเจ้าตัวจาก admin

### งานที่ยังไม่ทำ / รอ
- Firebase credentials จริงสำหรับเปิดใช้ FCM (ผู้ใช้ต้องสร้างเองจาก Firebase Console)
- รัน OSRM เอง (ตอนนี้ใช้ demo server สาธารณะ ไม่รับประกันความเร็ว/ความพร้อมใช้งาน) และใช้ผู้ให้บริการแผนที่ (tiles) ที่เหมาะกับการใช้งานจริงแทน tile.openstreetmap.org
- แก้พิกัดอาคารที่ยังเป็นค่าประมาณให้ครบผ่านหน้า admin "จัดการสถานที่" (ตอนนี้ยังเหลือ 17 แห่งที่เป็นสีเหลือง)
- หน้า "สถานที่โปรด", "ตั้งค่า", Chatbot ใน `apps/mobile` — ยังเป็น UI เปล่า/mock ไม่เคยต่อ backend
- ตัวเชื่อมตรวจสลิป (EasySlip ที่ใช้งานอยู่, SlipOK ที่เป็นทางเลือกสำรอง) ยังไม่เคยทดสอบกับ API key จริง (ตอนนี้ทดสอบกับตัวจำลอง + fetch จำลอง) — ต้องสมัครบัญชีแล้วลองกับสลิปจริงก่อนเปิด `SLIP_PROVIDER=easyslip`
- ต้อง migrate DB จริง (`npm run prisma:migrate` ใน `apps/api`) ก่อนใช้งาน — มี migration
  `20260902120000_sequential_vin_queue_dispatch` ที่ยังไม่เคย apply กับ DB จริงเลย (เขียนด้วยมือเพราะตอนพัฒนา
  รอบนี้ไม่มี DB ต่ออยู่ให้ prisma migrate dev สร้างให้)
- Hardening เพิ่มเติม: helmet (security headers), logout/revoke token, automated test suite, pagination บน list endpoint

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
จึงพัฒนา `apps/mobile` เป็น React + Tailwind ให้ตรงกับ wireframe และรันเป็น dev server ได้ทันที — ดูรายละเอียดใน `apps/mobile/README.md`


Role	Login	Password
User (ผู้ใช้บริการ)	อีเมล somjai@ku.th	user1234
Driver เบอร์วิน 1	เบอร์โทร 0800000002	driver1234
Driver เบอร์วิน 2	เบอร์โทร 0800000003	driver1234
Driver เบอร์วิน 3	เบอร์โทร 0800000004	driver1234
Admin	อีเมล admin@ku.th	admin1234