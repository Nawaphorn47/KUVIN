# แจ้งเตือนเด้งบนมือถือ (Push Notification)

โค้ดพร้อมแล้วทั้งสองฝั่ง ที่ขาดคือ **กุญแจบริการ (service account) ของ Firebase บนเซิร์ฟเวอร์** — ผมสร้างแทนไม่ได้ เพราะต้องล็อกอินบัญชี Google ของคุณ

| ส่วน | สถานะ |
|---|---|
| แอป Android (APK 1.2 ขึ้นไป) | ฝัง Firebase ไว้แล้ว (โปรเจกต์ `kuvin-747e0`, package `com.kuvin.app`), ขอสิทธิ์แจ้งเตือน, สร้างช่อง `kuvin_alerts`, ส่ง device token ให้ API หลังล็อกอิน |
| API | ส่งผ่าน `firebase-admin` เมื่อมี: ข้อเสนองานใหม่/คนขับรับงาน/ถึงจุดรับ/จบทริป (`notification.service.js`) และข้อความแชต (`chat.service.js`) |
| เซิร์ฟเวอร์จริง (VPS) | **ยังไม่ได้ตั้งกุญแจ** → API อยู่ในโหมด log-only (ขึ้น `[fcm:stub]` ใน log ไม่ได้ส่งจริง) |
| iPhone | ไม่รองรับ (เว็บแอปบน Safari ต้องใช้ Web Push ซึ่งยังไม่ได้ทำ) |

## ขั้นตอน (ทำเอง ~10 นาที ฟรี)

1. เปิด https://console.firebase.google.com → เลือกโปรเจกต์ **kuvin-747e0** (โปรเจกต์ที่ผูกกับแอป)
2. ⚙ Project settings → แท็บ **Service accounts** → **Generate new private key** → ได้ไฟล์ `.json`
   **ไฟล์นี้คือความลับ** อย่า commit อย่าส่งในแชต อย่าใส่ใน repo (repo เป็น public)
3. แปลงเป็นบรรทัดเดียวบนเครื่องคุณ (PowerShell) — คำสั่งนี้ไม่แสดงเนื้อไฟล์ แค่คัดลอกไปคลิปบอร์ด:
   ```powershell
   (Get-Content "$env:USERPROFILE\Downloads\<ชื่อไฟล์>.json" -Raw | ConvertFrom-Json | ConvertTo-Json -Compress) | Set-Clipboard
   ```
4. SSH เข้า VPS แล้วเพิ่มลง `.env` (วางจากคลิปบอร์ดระหว่างเครื่องหมาย `'`):
   ```bash
   cd ~/app
   nano .env      # เพิ่มบรรทัดเดียว:  FIREBASE_SERVICE_ACCOUNT_JSON='<วางที่นี่>'
   docker compose up -d api
   docker compose logs api | grep fcm     # ต้องเห็น: [fcm] Firebase Admin initialized — push notifications are live
   ```
5. ลบไฟล์ `.json` ที่ดาวน์โหลดทิ้ง (เก็บไว้ในที่ปลอดภัยถ้าจำเป็น) และอย่าให้คนอื่นเห็น `.env`

## ทดสอบบนมือถือ

1. ติดตั้ง KUVIN 1.2 ขึ้นไป ล็อกอิน กด **อนุญาต** การแจ้งเตือนเมื่อถูกถาม
2. ใช้มือถือ 2 เครื่อง (ผู้โดยสาร + คนขับ) หรือเครื่องเดียว + เว็บ: เรียกวินให้คนขับรับงาน แล้ว **ล็อกหน้าจอ/ปิดแอป** ฝั่งผู้โดยสาร
3. ให้คนขับพิมพ์แชตหรือกด "ถึงจุดรับ" — ผู้โดยสารต้องเห็นแจ้งเตือนเด้งขึ้นมา

## ถ้าไม่เด้ง

- `docker compose logs api | grep fcm`: ถ้าเห็น `[fcm:stub]` = ยังไม่มีกุญแจหรืออ่านไม่ได้, `Failed to initialize` = JSON ผิดรูปแบบ (ตรวจว่าอยู่บรรทัดเดียวและมีเครื่องหมาย `'` ครอบ)
- Android 13 ขึ้นไป: ตั้งค่า → แอป → KUVIN → การแจ้งเตือน ต้องเปิดอยู่
- ปิดโหมดประหยัดแบตเตอรี่ของแอปนี้ (บางยี่ห้อ เช่น Xiaomi/Oppo/Vivo ฆ่าแอปเบื้องหลัง ทำให้แจ้งเตือนมาช้า)
- โทเค็นหมดอายุ/ลบแอปแล้วลงใหม่: ล็อกอินใหม่หนึ่งครั้งเพื่อลงทะเบียนโทเค็นอีกครั้ง
- ต้องเป็นแอปที่ build จาก `google-services.json` ของโปรเจกต์เดียวกับกุญแจ (`kuvin-747e0`) ถ้าสร้างโปรเจกต์ Firebase ใหม่ ต้องโหลด `google-services.json` ใหม่ใส่ `apps/mobile/android/app/` แล้ว build APK ใหม่
