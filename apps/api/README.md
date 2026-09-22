# KU VIN API

Node.js + Express + Prisma + PostgreSQL/PostGIS + Socket.io

## โครงสร้าง

```
src/
├── config/         # การตั้งค่า (db, firebase, osrm ฯลฯ)
├── controllers/     # รับ request / ส่ง response
├── routes/           # นิยาม endpoint
├── services/          # business logic
├── middlewares/        # auth, validation, error handler
├── sockets/             # Socket.io event handlers
├── utils/                # ฟังก์ชันช่วยเหลือทั่วไป
└── index.js               # entry point

prisma/
├── schema.prisma           # โครงสร้างฐานข้อมูล — models: User, Driver, Admin, ServiceRequest,
│                           # Rating, Landmark, Notification (+ payment/dispute fields)
└── seed.js                 # seed สถานที่ในมหาวิทยาลัย (Landmark) จากรายชื่อที่ใช้ใน apps/mobile
```

ไฟล์ที่อัปโหลดผ่าน `POST /api/uploads` จะถูกเก็บไว้ที่ `apps/api/uploads/` (ไม่ commit เข้า git —
อยู่ใน `.gitignore` แล้ว) และเสิร์ฟกลับผ่าน static path `/uploads/<filename>`

## เริ่มต้นใช้งาน

```bash
cp .env.example .env
npm install

# เปิดฐานข้อมูล (Postgres + PostGIS) ด้วย Docker
docker compose -f ../../docker/docker-compose.yml up -d db

npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

> **หมายเหตุ:** เครื่อง dev ตัวนี้มี PostgreSQL ติดตั้งเป็น native service อยู่แล้วบน port 5432 (ชนกับ Docker)
> เลย map container ไว้ที่ **host port 5433** แทน (`docker-compose.yml` + `.env.example` แก้ตรงกันแล้ว) —
> ถ้าเครื่องอื่นไม่มี Postgres ติดตั้งอยู่ก่อน จะใช้ 5432 ตามปกติก็ได้ แค่แก้ทั้งสองไฟล์ให้ตรงกัน

ตรวจว่าตารางถูกสร้างจริง:

```bash
docker exec docker-db-1 psql -U postgres -d kuvin -c "\dt"
```

บัญชีเดโม (จาก `npm run prisma:seed`):

| Role | Login | Password |
|---|---|---|
| User | email `somjai@ku.th` | `user1234` |
| Driver เบอร์วิน 1 (APPROVED) | phone `0800000002` | `driver1234` |
| Driver เบอร์วิน 2 (APPROVED) | phone `0800000003` | `driver1234` |
| Driver เบอร์วิน 3 (APPROVED) | phone `0800000004` | `driver1234` |
| Admin | email `admin@ku.th` | `admin1234` |

> มีคนขับ 3 คน (เบอร์วิน 1/2/3) ไว้เทสคิวหมุนเวียนโดยเฉพาะ — ดูหัวข้อ "คิวรับงานแบบวินหมุนเวียน" ด้านล่าง

> User ล็อกอินด้วย**อีเมล** (ต้องเป็น `@ku.th` เท่านั้น — ตรวจตอนสมัครด้วย) ส่วน Driver ล็อกอินด้วยเบอร์โทรศัพท์
> ตามที่ wireframe ออกแบบไว้ (3login.html ใช้อีเมล, Verify Step 1 ใช้เบอร์โทร) รหัสผ่านทุก role ต้องมีอย่างน้อย 8 ตัวอักษร

## Endpoints

ทุก endpoint ที่ต้อง auth ใช้ `Authorization: Bearer <token>` จาก response ของ login

**Auth** (`/api/auth`)
- `POST /user/register` `{ fullName, phone, email, password, studentId? }` — email ต้องลงท้าย `@ku.th`, password ≥ 8 ตัวอักษร
- `POST /user/login` `{ email, password }`
- `POST /user/forgot-password` `{ email }` — ยังไม่ต่อ email service จริง จึงคืน `devResetToken` มาในตัว response โดยตรง (dev only, ไม่ leak ว่าอีเมลมีอยู่จริงไหม)
- `POST /user/reset-password` `{ token, newPassword }`
- `POST /driver/register` `{ fullName, phone, password, vinNumber, licensePlate, vehicleModel? }` —
  `vinNumber` ต้องเป็น**ตัวเลขล้วนเท่านั้น** (เช่น `"1"`, `"2"`) เพราะใช้กำหนดลำดับคิวรับงานโดยตรง
- `POST /driver/login` `{ phone, password }`
- `POST /admin/login` `{ email, password }`
- `GET /me` — โปรไฟล์ของ token ปัจจุบัน

**Users** (`/api/users`)
- `PATCH /me/fcm-token` (user) — `{ fcmToken }` ลงทะเบียน device token สำหรับ push notification

**Landmarks** (`/api/landmarks`)
- `GET /?popular=true&q=คำค้น` — รายชื่อสถานที่ในมหาวิทยาลัย

**Service Requests** (`/api/service-requests`) — booking flow
- `POST /estimate` (user) — พรีวิวระยะทาง/ค่าโดยสารก่อนกดยืนยันจริง (ไม่เขียน DB) รับ payload เดียวกับ `POST /`
- `POST /` (user) — สร้างคำขอ ระบุ `pickupLandmarkId`/`destinationLandmarkId` หรือ `pickupLat/Lng`+`destinationLat/Lng` ตรง ๆ — คำนวณ `isWithinCampus`/`distanceKm`/`fare` ให้อัตโนมัติ (ในมหาวิทยาลัยเหมาจ่าย 20 บาท, นอกมหาวิทยาลัยคิดตามระยะทาง) — ปฏิเสธถ้า user มีคำขอที่ยัง active (PENDING/ACCEPTED/IN_PROGRESS) อยู่แล้ว
- `GET /mine` (user) / `GET /driver/mine` (driver) — ประวัติของตัวเอง
- `GET /pending` (driver) — งานที่ยังเป็น PENDING ทั้งหมด (ดูภาพรวมคิว) แต่ละรายการมี `isMyTurn: boolean` บอกว่า
  ถึงตาคิวของคนขับที่เรียกจริงหรือยัง — กด accept/decline ได้จริงเฉพาะอันที่ `isMyTurn: true` เท่านั้น
- `POST /estimate` (user) — คืนค่าโดยสาร/ระยะทางบนถนนจริง + `pickup`/`destination` ที่ resolve แล้ว + `route` (เส้นทางสำหรับวาดแผนที่)
- `GET /queue` (driver) — ภาพรวมคิวคนขับที่ออนไลน์ทั้งหมดตอนนี้ เรียงลำดับเดียวกับที่ระบบจะเสนองานจริง (ดูหัวข้อ
  คิวรับงานแบบวินหมุนเวียนด้านล่าง) คืน `{ queue: [{position, driverId, fullName, vinNumber, isMe, isActiveOffer}],
  activeOffer: {requestId, driverId, offerExpiresAt} | null, myPosition, aheadOfMe }` — `isActiveOffer`/`activeOffer`
  บอกว่าตอนนี้มีใครกำลังถูกเสนองานอยู่จริง (ถ้ามีคำขอ PENDING ค้างอยู่)
- `GET /:id` — รายละเอียด (เจ้าของ/คนขับ/แอดมินเท่านั้น)
- `POST /:id/accept` (driver) — ปฏิเสธถ้า**ยังไม่ถึงคิวของคนขับคนนี้** (ต้องเป็นคนที่ระบบกำลังเสนองานให้อยู่ตอนนั้น,
  ดูหัวข้อคิวด้านล่าง), คนขับออฟไลน์/มีงานอยู่แล้ว, หรือคำขอถูกรับ/ยกเลิกไปแล้ว (กัน race condition ด้วย
  conditional update ใน transaction) — สำเร็จแล้วคนขับออกจากคิวจนกว่าจะจบทริป (จบแล้วเข้าท้ายคิว)
- `POST /:id/decline` (driver) — ปฏิเสธงานที่ถึงตาคิวตัวเอง (เร็วกว่ารอ 15 วิให้หมดเวลาเอง) เลื่อนไปท้ายคิวแล้ว
  ส่งงานต่อให้คนขับคิวถัดไปทันที
- `POST /:id/start` `/:id/complete` (driver)
- `POST /:id/cancel` `{ reason? }` (user หรือ driver ที่เป็นเจ้าของงาน)
- `POST /:id/payment` (driver) — `{ status: "PAID"|"DISPUTED", disputeNote? }`
- `POST /:id/rating` (user ให้คะแนนคนขับ) — `{ score: 1-5, comment? }`
- `POST /:id/rate-passenger` (driver ให้คะแนนผู้โดยสาร) — `{ score: 1-5, comment? }`

> คำขอ `PENDING` ที่เสนอให้คนขับคนปัจจุบันอยู่ (ดูหัวข้อคิวด้านล่าง) ถ้าเลย 15 วินาทีโดยไม่ตอบรับ/ปฏิเสธ
> background job (เช็คทุก 1 วินาที ใน `index.js`) จะเลื่อนไปเสนอคิวถัดไปอัตโนมัติ — ถ้าลองครบทุกคนในคิวแล้ว
> ไม่มีใครรับ คำขอจะถูกยกเลิกพร้อมแจ้งเตือนผู้ใช้ว่า "ไม่พบคนขับว่างในคิวขณะนี้"

**Drivers** (`/api/drivers`)
- `GET /me` (driver) — โปรไฟล์ตัวเอง + คะแนนเฉลี่ย
- `PATCH /me/location` `{ lat, lng }`, `PATCH /me/availability` `{ isOnline }` (กดออนไลน์ = เข้าท้ายคิว, ออฟไลน์ = ออกจากคิว), `PATCH /me/fcm-token` `{ fcmToken }`
- `POST /me/verify` `{ vinNumber?, licensePlate?, vehicleModel?, photoUrl, idCardPhotoUrl, driverLicensePhotoUrl, vehiclePhotoUrl, platePhotoUrl }`
  — ส่งเอกสารยืนยันตัวตน (step1+2 รวมกัน เรียกครั้งเดียวตอนกด "ส่งข้อมูลเพื่อตรวจสอบ") **ต้องแนบรูปครบทั้ง 5 ใบ**
  (รูปหน้าตรง, บัตรประชาชน, **ใบขับขี่**, รถเต็มคัน, ป้ายทะเบียน — อัปโหลดผ่าน `POST /api/uploads` ก่อนแล้วค่อย
  ส่ง url มาที่นี่) ไม่งั้น 400 — ถ้าส่ง `vinNumber` มาต้องเป็นตัวเลขล้วนเช่นกัน → สถานะกลับเป็น `PENDING`
- `GET /:id` (ต้อง login แล้ว role ใดก็ได้) — โปรไฟล์สาธารณะของคนขับ (ให้ user ดูตอนจับคู่) คืนแค่
  `id/fullName/photoUrl/vehicleModel/licensePlate/ratingAvg/ratingCount` — **ไม่มี** เบอร์โทร/เอกสารยืนยันตัวตน/
  ตำแหน่งสด/fcmToken (เดิมเป็น public route ไม่ต้อง auth และคืนข้อมูลดิบเกือบทั้งหมดของ driver รวมตำแหน่ง GPS สด
  กับรูปบัตรประชาชน แก้แล้วโดยแยกฟังก์ชัน `getPublicDriver` ออกจาก `getDriver` ที่ใช้กับ `/me` เท่านั้น)

**Notifications** (`/api/notifications`)
- `GET /`, `POST /:id/read`

**Uploads** (`/api/uploads`)
- `POST /` (ต้อง login แล้ว role ใดก็ได้) — multipart/form-data field ชื่อ `file` รับเฉพาะรูปภาพ JPEG/PNG/WEBP
  ขนาดไม่เกิน 5MB คืน `{ url }` เอา url นี้ไปใส่ใน field อื่นต่อ (เช่น `photoUrl`/`idCardPhotoUrl` ของ
  `POST /drivers/me/verify`) — ไฟล์เก็บ local disk ที่ `apps/api/uploads/` เสิร์ฟกลับผ่าน `/uploads/<filename>`

**SOS** (`/api/sos`)
- `POST /` (user หรือ driver) — `{ lat?, lng?, note?, serviceRequestId?, contactedEmergencyNumber? }` แจ้งเหตุ
  ฉุกเฉิน บันทึกลง DB และส่ง event `sos:new` แบบ real-time ไปยัง admin ทุกคนที่ online ทันที (แนบชื่อ/เบอร์โทร
  ผู้แจ้งไปด้วย)
- `POST /:id/contacted` (user หรือ driver เจ้าของ alert เท่านั้น) — `{ contactedEmergencyNumber: "1669" | "191" }`
  บันทึกภายหลังว่าผู้แจ้งกดโทรหน่วยแพทย์ฉุกเฉิน (1669) หรือตำรวจ (191) ไปแล้ว — **ระบบไม่โทรออกให้อัตโนมัติ**
  (ทำไม่ได้ในเว็บแอปและไม่ควรทำเพื่อความปลอดภัย) ผู้ใช้ต้องกดปุ่ม `tel:` ยืนยันโทรเองเสมอ endpoint นี้แค่บันทึก
  ไว้ให้ admin เห็นว่ามีการประสานงานหน่วยงานภายนอกไปแล้วหรือยัง
- `POST /:id/cancel` (user หรือ driver เจ้าของ alert เท่านั้น) — ผู้แจ้งยกเลิกเองถ้ากดผิด/แจ้งเหตุพลาด
  (ใช้ได้เฉพาะตอนยังไม่ถูก admin ปิดเคส) ต่างจาก resolve ด้านล่างที่สงวนไว้ให้ admin เท่านั้น
- ดูรายการ/ปิดเคสได้ที่ `GET /api/admin/sos` และ `POST /api/admin/sos/:id/resolve` (ดูหัวข้อ Admin ด้านล่าง)

**Admin** (`/api/admin`, ต้อง role admin)
- `GET /stats` — สรุปวันนี้: จำนวนทริป, รายได้รวม, คนขับออนไลน์/อนุมัติแล้ว/รออนุมัติ, จำนวนข้อพิพาทค้าง
- `GET /drivers/pending`, `POST /drivers/:id/approve`, `POST /drivers/:id/reject` `{ reason }`
- `GET /trips`, `POST /trips/:id/resolve-dispute`
- `GET /sos?status=OPEN` — รายการแจ้งเหตุฉุกเฉิน (ไม่ใส่ `status` = ดูทั้งหมด), `POST /sos/:id/resolve` `{ resolvedNote? }`

## ความปลอดภัย

- Endpoint กลุ่ม auth (`register`/`login`/`forgot-password`/`reset-password`) จำกัด 20 ครั้ง/15 นาที ต่อ IP กัน brute-force
- เบอร์โทรศัพท์ต้องเป็นรูปแบบไทย 10 หลักขึ้นต้นด้วย 0, รหัสผ่านอย่างน้อย 8 ตัวอักษร, อีเมล user ต้องเป็น `@ku.th`
- `forgot-password` ไม่ leak ว่าอีเมลมีอยู่ในระบบจริงหรือไม่ (คืนข้อความเดียวกันเสมอ)

## Push Notification (FCM)

`src/services/fcm.service.js` ใช้ `firebase-admin` SDK จริงแล้ว (ติดตั้ง dependency ไว้แล้ว) แต่ยังทำงานเป็น
**log-only mode** จนกว่าจะตั้งค่า credentials — ตรวจสอบและ fallback อัตโนมัติ ไม่ทำให้แอป crash หรือ block flow หลัก
(เรียกแบบ non-blocking ผ่าน `notification.service.notify()` ทุกครั้งที่มีแจ้งเตือน)

**ขั้นตอนเปิดใช้งานจริง:**
1. ไปที่ [Firebase Console](https://console.firebase.google.com) → สร้างโปรเจกต์ (หรือใช้โปรเจกต์เดิม)
2. เปิดใช้งาน Cloud Messaging (เปิดอยู่แล้วโดย default ในโปรเจกต์ใหม่)
3. Project Settings → Service Accounts → **Generate new private key** → ได้ไฟล์ JSON
4. เลือกวิธีตั้งค่าอย่างใดอย่างหนึ่งใน `.env`:
   - **`GOOGLE_APPLICATION_CREDENTIALS=`** path ไปยังไฟล์ JSON ที่ดาวน์โหลดมา (ใช้ตอนรันบนเครื่อง local)
   - **`FIREBASE_SERVICE_ACCOUNT_JSON=`** วางเนื้อหาไฟล์ JSON ทั้งก้อนเป็น string บรรทัดเดียว (ใช้ตอน deploy บน Railway/Render ที่ mount ไฟล์ไม่สะดวก)
5. Mobile app ต้องขอ FCM device token จากผู้ใช้ (ผ่าน Firebase SDK ฝั่ง client) แล้วส่งมาเก็บที่
   `PATCH /api/users/me/fcm-token` (user) หรือ `PATCH /api/drivers/me/fcm-token` (driver) — `{ fcmToken }`

รีสตาร์ตเซิร์ฟเวอร์หลังตั้งค่า — log จะเปลี่ยนจาก `[fcm:stub] would push...` เป็นส่งจริงผ่าน `admin.messaging().send()`

## คิวรับงานแบบ FIFO (`src/services/queue.service.js`)

`createRequest` ไม่หาคนขับตามระยะทาง — เสนองาน**ทีละคนตามลำดับเข้าคิว** ผ่าน private room `driver:<id>` เท่านั้น

**ฟิลด์บน `drivers`:** `isOnline` (กดออนไลน์อยู่), `isAvailable` (ว่าง = ไม่ได้อยู่ระหว่างทริป), `queueJoinedAt`
(`timestamptz(6)`, ใช้ ORDER BY หาหัวคิว, `null` = ไม่อยู่ในคิว), `timeoutCount` (ปล่อยงานหมดเวลาติดกันกี่ครั้ง)
ส่วน `service_requests` มี `offeredDriverId`, `offerExpiresAt`, `triedDriverIds`, `timedOutDriverIds`

**คิว** = `isOnline AND isAvailable AND APPROVED AND queueJoinedAt IS NOT NULL` เรียง `queueJoinedAt ASC` (`getNextDriverInQueue`)
คนที่ออนไลน์แต่กำลังวิ่งงานอยู่ (`isAvailable = false`) จะไม่ถูกเสนองาน

| เหตุการณ์ | ผล |
|---|---|
| กดออนไลน์ | เข้าท้ายคิว (`queueJoinedAt = now`), `timeoutCount = 0` — กดซ้ำไม่รีเซ็ตตำแหน่ง |
| **accept** (ภายใน 15 วิ) | ออกจากคิวทันที, `isAvailable = false`, `timeoutCount = 0`, ได้งาน |
| **reject** | penalty หนัก: `queueJoinedAt = now` (ท้ายคิว) + ส่งต่อคนถัดไปทันที |
| **timeout** ครั้งที่ 1-2 | `timeoutCount + 1`, ส่งต่อทันที, penalty เบา: ย้ายไป "ต่อจากคนที่ได้งานรอบนี้" (ตอนมีคนกดรับ) |
| **timeout** ครั้งที่ 3 | penalty หนัก + `isOnline = false` + ออกจากคิว + emit `driver:forced-offline` |
| จบทริป / งานที่รับแล้วถูกยกเลิก | ยังออนไลน์ → `isAvailable = true`, `timeoutCount = 0`, ท้ายคิว; ปิดแอปไปแล้ว → ไม่เข้าคิว |
| ออฟไลน์ตอนกำลังถูกเสนองาน | ส่งต่อคนถัดไปทันที ไม่นับเป็น reject/timeout |

**Race condition:** ทุกการเปลี่ยนสถานะอยู่ใน transaction เดียวและล็อกแถวก่อน (`SELECT ... FOR UPDATE`) ตามลำดับคงที่
`service_requests → drivers` (หลายแถวเรียงตาม id) กัน deadlock; หัวคิวหาด้วย `FOR UPDATE SKIP LOCKED` + `NOT EXISTS`
(คนที่มีข้อเสนอค้างอยู่แล้ว) ทำให้คำขอที่เข้าพร้อมกันได้คนขับคนละคน; timeout จาก sweeper กับ accept ที่ชนกัน
ใครล็อกคำขอได้ก่อนชนะ อีกฝ่ายไม่เจอข้อเสนอแล้ว (accept ได้ 409, timeout เป็น no-op) — ทดสอบด้วย `npm run test:queue`
(17 เคส รวม concurrency กับ Postgres จริง)

Sweeper (`sweepExpiredOffers`, ทุก 1 วิใน `index.js`) เรียก `handleDriverResponse(driverId, "timeout")` ให้ข้อเสนอที่หมดเวลา
และกู้คำขอ PENDING ที่ไม่มีข้อเสนอค้างเกิน 10 วิ ถ้าลองครบทุกคนแล้วไม่มีใครรับ คำขอจะถูกยกเลิกพร้อมแจ้งผู้ใช้

`GET /service-requests/pending` (endpoint สำรองแบบ polling) คืนคำขอ `PENDING` พร้อม `isMyTurn`

## ชำระเงินและตรวจสลิป
ผู้โดยสารโอนตาม QR พร้อมเพย์ของคนขับ (`GET /service-requests/:id/payment-qr` ยอดตรงค่าโดยสาร) แล้วแนบสลิป
`POST /service-requests/:id/payment-slip` (multipart ฟิลด์ `file`, JPEG/PNG/WEBP ≤ 4MB, เฉพาะเจ้าของทริปที่จบแล้ว) —
ระบบส่งสลิปให้ผู้ให้บริการตรวจกับธนาคาร แล้วเปลี่ยนเป็น `PAID` + `paymentMethod = PROMPTPAY` + `paymentConfirmedBy = SLIP`
ให้เอง พร้อมแจ้งคนขับ (`services/payment.service.js`)

ยืนยันอัตโนมัติก็ต่อเมื่อผ่านครบ: สลิปจริงตามผู้ให้บริการ · ยอดตรงค่าโดยสาร · **ผู้รับตรงกับพร้อมเพย์ของคนขับทริปนี้** (เทียบเลขที่
สลิปไม่ปิดบัง ต้องเห็น ≥ 4 หลัก — `services/slip/receiver.js`) · เวลาโอนไม่ก่อนเริ่มทริป · เลขอ้างอิงธุรกรรมไม่เคยใช้กับทริปอื่น
(`paymentRef` unique) ถ้าสลิปไม่บอกผู้รับให้เทียบได้ จะ**ไม่ยืนยัน** (กันโอนเข้าบัญชีตัวเองด้วยยอดเท่ากัน) ไม่ผ่านตอบ `422` พร้อม
`code` (`AMOUNT_MISMATCH`, `RECEIVER_MISMATCH`, `RECEIVER_UNVERIFIABLE`, `SLIP_TOO_OLD`, `SLIP_ALREADY_USED`, `NOT_A_SLIP`, ...)
และจำกัดจำนวนครั้ง (`SLIP_MAX_ATTEMPTS`, ค่าเริ่มต้น 5); บริการตรวจสลิปล่มตอบ `422 PROVIDER_UNAVAILABLE` และไม่นับเป็นความพยายาม
ทางสำรองเสมอ: คนขับกดยืนยันรับเงินเอง (`POST /:id/payment`, `paymentConfirmedBy = DRIVER`) — แต่ถ้าสลิปตรวจผ่านแล้ว
คนขับกลับเป็น `DISPUTED` เองไม่ได้ (ต้องผ่าน admin) และผู้โดยสารส่งสลิปแก้ทริปที่คนขับแจ้งข้อพิพาทได้

**ไม่เก็บรูปสลิป** (มีข้อมูลบัญชีธนาคาร; อัปโหลดแบบ memory ส่งต่อให้ผู้ให้บริการแล้วทิ้ง) เก็บแค่เลขอ้างอิง เวลา และเหตุผลที่ไม่ผ่านล่าสุด

ผู้ให้บริการตั้งด้วย `SLIP_PROVIDER` (ดู `.env.example`): **`easyslip`** (ตัวที่ใช้งานอยู่ — `services/slip/easyslip.provider.js`,
ต้องตั้ง `EASYSLIP_API_KEY`), `slipok` (ทางเลือกสำรอง เขียนไว้ก่อนหน้า — `services/slip/slipok.provider.js`, ต้องตั้ง `SLIPOK_API_KEY`
+ `SLIPOK_BRANCH_ID`), `mock` (dev — ควบคุมผลด้วยชื่อไฟล์ เช่น `wrong-amount.png`, `ref-abc.png`), `off` (production ที่ไม่ตั้งค่า = ปิด,
ยังจ่ายสด/คนขับยืนยันได้) เพิ่มผู้ให้บริการอื่นโดยเขียน `verify({ buffer, mimeType, filename }, expected)` ที่คืน
`{ ref, bank, amount, sentAt, receiverHints }` หรือ throw `SlipError` แล้วเพิ่มใน `services/slip/index.js`

ทั้งสองตัวเชื่อม (EasySlip, SlipOK) เขียนตามเอกสารทางการที่ผู้ใช้ส่งให้โดยตรง (PDF ของ SlipOK / หน้า `document.easyslip.com`
ที่คัดลอกมา) **EasySlip ทดสอบกับ API key จริงแล้ว — ยิงสลิปโอนเงินจริง (SCB พร้อมเพย์) ผ่านทั้ง `verify()` ของ provider โดยตรง
และผ่าน `POST /service-requests/:id/payment-slip` เต็มระบบ ได้ `PAID`/`paymentConfirmedBy: SLIP` ถูกต้อง — ข้อควรรู้จากการทดสอบจริง:
ต้องเป็น QR รูปแบบสลิปธนาคารจริง (EMV/PromptPay) เท่านั้น ทดสอบด้วย QR ปลอม/ข้อความสุ่มจะได้ `VALIDATION_ERROR` แบบเข้าใจผิดได้ว่า
"ไม่ได้แนบไฟล์" ทั้งที่แนบไฟล์ถูกต้องแล้ว (ระบบตรวจสอบ/อ่าน QR ไม่ออกเลยจึงตกไปที่ error message ทั่วไปแบบนี้)** SlipOK ยังไม่เคย
ทดสอบกับ API key จริง — ทดสอบด้วยสลิปจริงก่อนเปิดใช้ถ้าจะสลับไปใช้ (โดยเฉพาะการอ่านข้อมูลผู้รับ ซึ่งรูปแบบการปิดบังเลข
ต่างกันตามธนาคาร) ทั้งคู่ไม่ส่งพารามิเตอร์ที่ผูกกับ "บัญชีเดียวที่ลงทะเบียนไว้กับผู้ให้บริการ" (`log`/`matchAccount`) เพราะระบบนี้
ผู้รับคือคนขับหลายคนคนละบัญชี และไม่ส่งพารามิเตอร์เทียบยอด/กันสลิปซ้ำของผู้ให้บริการ (`amount`/`checkDuplicate`) เพราะเราเทียบยอด
เองเพื่อคุมข้อความที่บอกผู้โดยสาร และกันสลิปซ้ำเองที่ฐานข้อมูลอยู่แล้ว (`paymentRef` unique, ไม่ผูกกับสโคปที่ไม่ชัดเจนของผู้ให้บริการ)
ทดสอบ: `npm run test:payment` (28 เคส) — **ต้องรัน API ด้วย `SLIP_PROVIDER=mock`** ส่วนที่ยิง HTTP จริงในชุดนี้ควบคุมผลด้วยชื่อไฟล์
(`ok.png`, `wrong-amount.png`, ...) ถ้า `.env` ตั้งเป็น `easyslip`/`slipok` จริงอยู่ จะยิงใส่ผู้ให้บริการจริงแทนและเทสต์ล้มเหลวเพราะไฟล์
ปลอมไม่ใช่สลิปจริง (เจอเองตอนทดสอบ EasySlip กับสลิปจริงแล้วลืมสลับกลับ) สลับ `SLIP_PROVIDER` ใน `.env` ไปมาแล้วรีสตาร์ต API ก่อน/หลังรันชุดนี้
(เทสต์ที่ยิง HTTP — `test:suspension`, `test:payment` — ล็อกอินหลายครั้ง ถ้ารันติดกันจะชนตัวจำกัดล็อกอิน 20 ครั้ง/15 นาที ให้รีสตาร์ต API ระหว่างชุด)

## จัดการผู้ใช้/คนขับและระงับบัญชี (admin)
`GET /admin/users` · `GET /admin/drivers` (query `q` ค้นหา, `status`: ผู้ใช้ = `active|suspended`, คนขับ =
`online|APPROVED|PENDING|REJECTED|suspended`, สูงสุด 200 รายการ) · `GET /admin/users/:id` · `GET /admin/drivers/:id`
(โปรไฟล์ + สถิติ + ทริปล่าสุด 20 รายการ) · `POST /admin/{users|drivers}/:id/suspend` `{ reason }` (บังคับ) ·
`POST /admin/{users|drivers}/:id/unsuspend`

การระงับ (`isSuspended`, `suspendedReason`, `suspendedAt` บน `users`/`drivers`): `middlewares/auth.js` ตรวจทุก request (cache 10 วิ
และล้างทันทีเมื่อ admin ระงับ/ปลด — `utils/accountStatus.js`) จึงใช้ token เดิมต่อไม่ได้ทันที ตอบ `403` พร้อม `code: "ACCOUNT_SUSPENDED"`;
login ตอบแบบเดียวกัน (บอกเหตุผลเฉพาะหลังรหัสผ่านถูก); socket ต่อไม่ได้ (`suspended`) และ socket ที่ต่ออยู่ถูกตัดหลังส่ง event
`account:suspended`; คนขับที่ถูกระงับออกจากคิวและข้อเสนองานที่ค้างถูกส่งต่อ (`queue.goOffline`); ระงับไม่ได้ (409) ถ้ามีทริป
ACCEPTED/IN_PROGRESS อยู่ — คำขอ PENDING ของผู้ใช้ที่ถูกระงับจะถูกยกเลิกอัตโนมัติ ทดสอบด้วย `npm run test:suspension` (12 เคส)

Error ทุกตัวตอบเป็น `{ error, code? }` (แอปมือถือ/dashboard แปลงเป็น `message` ที่ interceptor เดียว)

## จัดการสถานที่ (admin)
`GET /admin/landmarks` (ทั้งหมด) · `POST /admin/landmarks` · `PATCH /admin/landmarks/:id` (ส่งเฉพาะฟิลด์ที่แก้) ·
`DELETE /admin/landmarks/:id` — ฟิลด์ `name`, `detail`, `lat`, `lng`, `isPopular`, `coordsVerified` (true = ตรวจพิกัดกับสถานที่จริงแล้ว)
พิกัดต้องเป็นตัวเลขในช่วงประเทศไทย (lat 5–21, lng 97–106) กัน typo/สลับค่าที่ทำให้ค่าโดยสารเพี้ยน; ลบสถานที่ได้โดยประวัติทริปไม่กระทบ
เพราะทริปเก็บพิกัดของตัวเองไว้ seed จะไม่เขียนทับสถานที่ที่มีอยู่แล้ว (กันทับพิกัดที่ admin แก้)

## เส้นทาง (`GET /api/routes`)
`GET /routes?fromLat&fromLng&toLat&toLng` (user/driver) → `{ source, distanceKm, durationMin, coordinates: [[lat, lng], ...] }`
เส้นทางถนนจริงจาก OSRM (`src/utils/routing.js`, cache 10 นาที) ใช้ทั้งคำนวณค่าโดยสารนอกมหาวิทยาลัยและวาดแผนที่/ETA ฝั่งแอป
ถ้า OSRM ไม่ตอบใน 4 วิ จะ fallback เป็นเส้นตรงพร้อม `source: "straight"` (เรียกวินยังใช้ได้) ตั้ง `OSRM_BASE_URL` ให้ชี้เซิร์ฟเวอร์ของตัวเอง
(ค่าเริ่มต้นคือ demo server สาธารณะ ใช้พัฒนา/ทดสอบเท่านั้น)

## Socket.io events

**ต้อง auth ก่อน connect** — ส่ง JWT เดียวกับที่ใช้ใน REST API ผ่าน `io(url, { auth: { token } })`
ไม่งั้น server ปฏิเสธการเชื่อมต่อทันที (`connect_error: unauthorized`) เดิมทีไม่มีการตรวจสอบตัวตนเลย
ทำให้ client ไหนก็ได้ join room `driver:<id>` / `user:<id>` ของคนอื่น หรือ watch trip ของคนอื่นได้ —
ตอนนี้ server ใช้ id/role จาก token เป็นหลัก ไม่เชื่อ id ที่ client ส่งมาเอง

- Client emit: `driver:online` / `driver:offline` / `user:join` / `service-request:watch` / `driver:location`
  - `driver:online`/`user:join` ไม่ต้องส่ง id แล้ว — server join room ตาม id ใน token ให้เอง
  - `driver:location` ส่งได้เฉพาะคนขับของทริปที่ ACCEPTED/IN_PROGRESS และพิกัดต้องเป็นตัวเลขที่ถูกต้อง (server บันทึก `currentLat/Lng` ล่าสุดทุก ≥10 วิ) — `service-request:watch` / `driver:location` เช็คสิทธิ์ว่า socket ที่ auth แล้วเป็นผู้เกี่ยวข้องกับ request นั้นจริง (user/driver/admin) ก่อน join/emit ทุกครั้ง
- Server emit: `service-request:new` (ส่งไปที่ private room `driver:<id>` ของคนขับที่ถึงตาคิวคนเดียวเท่านั้น
  ดูหัวข้อคิวรับงานด้านบน), `service-request:status`, `notification:new`, `driver:location`, `sos:new`
  (ไปยัง room `admin` เท่านั้น — admin ทุกคน join room นี้อัตโนมัติตอน connect)

ดู room convention เต็ม ๆ ที่คอมเมนต์บนสุดของ `src/sockets/index.js`

## หมายเหตุ dev บน Windows

ถ้าจะรัน `prisma generate` หรือ `prisma db push` ขณะที่ `npm run dev`/`node src/index.js` กำลังรันอยู่ —
**ต้องปิด process นั้นก่อน** ไม่งั้น Windows จะล็อกไฟล์ `query_engine-windows.dll.node` ทำให้ generate ล้มเหลว
แบบเงียบ ๆ (error `EPERM`) แล้วเซิร์ฟเวอร์จะยังใช้ engine ตัวเก่าที่ไม่รู้จัก column ใหม่ต่อไป (เจอ error
`P2022: column does not exist` ทั้งที่ตาราง DB มี column นั้นจริงแล้ว) — รันคำสั่งเสร็จค่อย start เซิร์ฟเวอร์ใหม่

และหลีกเลี่ยง `prisma db push --accept-data-loss` กับตารางที่มีข้อมูลสำคัญ — มันอาจ recreate ตาราง
ทำข้อมูลหายได้จริง (เจอเคสนี้ตอน dev: ตาราง `users` ถูกล้างข้อมูลตอนเปลี่ยน `email` เป็น NOT NULL)
ใช้ `prisma migrate dev` ตามปกติแทนถ้าเป็นไปได้ (ต้องรันแบบ interactive terminal ไม่ใช่ script อัตโนมัติ)
