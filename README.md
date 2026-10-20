# KUVIN

แอปเรียกวินมอเตอร์ไซค์ภายในมหาวิทยาลัยเกษตรศาสตร์ (KU) — ผู้โดยสารเห็นราคาก่อนเรียก ติดตามวินบนแผนที่สด ส่วนคนขับได้งานตามลำดับคิว (FIFO)
ออกแบบให้รองรับหลายวิทยาเขต ตอนนี้เปิดใช้จริงที่ **วิทยาเขตกำแพงแสน (กพส.)** เพิ่มวิทยาเขตอื่นได้จากหน้าแอดมินโดยไม่ต้องแก้โค้ด
(ปัญหาพิเศษ 02739498)

| | |
|---|---|
| เว็บแอป (ผู้โดยสาร/คนขับ) | https://kuvinn.tech |
| แดชบอร์ดแอดมิน | https://admin.kuvinn.tech |
| API | https://api.kuvinn.tech |
| แอป Android | [โหลด APK](https://github.com/Nawaphorn47/KUVIN/releases) (รุ่นล่าสุดในหน้า Releases) |
| iPhone | เปิดเว็บแอปใน Safari → แชร์ → "เพิ่มลงในหน้าจอโฮม" |

## โครงสร้าง

```
apps/api            Node.js + Express + Prisma + PostgreSQL + Socket.IO
apps/mobile         React + Vite + Tailwind + Leaflet (+ Capacitor สำหรับแอป Android)
apps/web-dashboard  React + Vite + Tailwind — แดชบอร์ดแอดมิน
e2e/                Playwright — ทดสอบปลายทางถึงปลายทางผ่านเบราว์เซอร์จริง
deploy/             Nginx, สคริปต์สร้าง .env, สคริปต์สำรองข้อมูล
docs/               คู่มือ รายงานผลทดสอบ โลโก้ (docs/brand)
```

## ฟังก์ชัน

- **บัญชีเดียวสลับโหมด** ผู้โดยสาร ↔ คนขับ: เข้าสู่ระบบด้วย OTP เบอร์โทร, Google หรืออีเมล+รหัสผ่าน
  ผู้โดยสารยืนยันเบอร์และถ่ายเซลฟี่ก่อนเรียกครั้งแรก ใครก็สมัครเป็นคนขับได้ (นิสิต / บุคคลทั่วไป / วินมอเตอร์ไซค์ แนบเอกสารตามประเภท ให้แอดมินอนุมัติ)
- **เรียกวิน:** เลือกปลายทาง/ปักหมุด → ราคาล่วงหน้า (เหมาจ่ายในเขต, นอกเขตคิดตามระยะถนน) → เสนองานให้คนขับทีละคน 15 วินาที → ติดตามแบบเรียลไทม์
  → ชำระเงินสดหรือพร้อมเพย์ (ตรวจสลิปอัตโนมัติเมื่อเปิดใช้) → ให้คะแนนสองฝ่าย
- **ความปลอดภัยของผู้ใช้:** แชตในทริป (ซ่อนเบอร์โทรเมื่อจบทริป), แชร์ลิงก์ติดตามทริป, แจ้งปัญหาหลังทริป, ปุ่ม SOS พร้อมพิกัด, เอกสารคนขับเป็นไฟล์ส่วนตัว
- **คนขับ:** คิวรับงาน, การเงิน (รายรับ–รายจ่าย–กำไร), ประวัติ
- **แอดมิน:** คิวงานเรียงตามความเร่งด่วน (SOS → แจ้งปัญหา → อนุมัติคนขับ → ข้อพิพาท → ทริปทั้งหมด), จัดการผู้ใช้/คนขับ/สถานที่, ตั้งค่าแต่ละวิทยาเขต
  (ค่าโดยสาร ขอบเขต เบอร์ฉุกเฉิน ชื่อ โลโก้ สีแบรนด์), บัญชีผู้ดูแล 2 ระดับ (สูงสุด / ประจำวิทยาเขต)

## รันในเครื่อง

ต้องมี Docker และ Node.js 20+

```bash
cp .env.example .env            # แล้วตั้งรหัสผ่านแอดมินคนแรก (SEED_ADMIN_PASSWORD ≥ 12 ตัว)
docker compose up --build -d    # db + api (3301) + เว็บแอป (3302) + แอดมิน (3303)
```

พัฒนาแต่ละส่วนแยก (ต้องมีฐานข้อมูลรันอยู่): `npm install` ที่ root แล้ว `npm run dev` ใน `apps/api`, `apps/mobile` หรือ `apps/web-dashboard`

## ทดสอบ

| ชั้น | คำสั่ง | ผล (20 ต.ค. 2569) |
|---|---|---|
| API 9 ชุด | `cd apps/api && npm run test:coverage` | 132 กรณีผ่าน, coverage ของ API 80.65% |
| E2E (Playwright) | `cd e2e && npm install && npx playwright install chromium && npm test` | 27 กรณีผ่าน |
| คุณภาพโค้ด | SonarQube ([docs/SONARQUBE.md](docs/SONARQUBE.md)) | Quality Gate ผ่าน |
| ทดสอบมือบนเครื่องจริง | [docs/TEST_PLAN.md](docs/TEST_PLAN.md) เช็กลิสต์ M-01 ถึง M-16 | ยังไม่ได้ทดสอบ |

CI (GitHub Actions) รัน build, ชุดทดสอบ API และ e2e ทุกครั้งที่ push — รายงานผลทดสอบพร้อมรูปอยู่ที่ [docs/test-report](docs/test-report)
**e2e สร้างข้อมูลทดสอบจริงลงฐานข้อมูล ห้ามชี้ไปที่ kuvinn.tech**

## ติดตั้งใช้งานจริง

VPS Hostinger + Docker Compose + Nginx (HTTPS จาก Let's Encrypt) — push เข้า `main` → CI ผ่าน → สร้าง image ส่งขึ้น GHCR → SSH เข้า VPS ดึงของใหม่ → ตรวจ `/health`
ขั้นตอนทั้งหมด: [docs/HOSTINGER_DEPLOY.md](docs/HOSTINGER_DEPLOY.md) (รวมการสำรองข้อมูลและกู้คืน) · [docs/CI_CD.md](docs/CI_CD.md)

## แอป Android

```bash
cd apps/mobile
npm run android:release     # APK ชี้ไป https://api.kuvinn.tech (รายละเอียด/การเซ็นชื่อ: apps/mobile/README.md)
```

ถ้า Gradle ฟ้อง `Unsupported class file major version` ให้ตั้ง `JAVA_HOME` เป็น JDK 17 หรือ 21 (เช่น `jbr` ใน Android Studio) แล้วรัน `gradlew assembleRelease` ใน `apps/mobile/android`

## ข้อจำกัดตอนนี้ (ตรงไปตรงมา)

- **OTP ยังเป็นโหมดทดสอบ:** แอปแสดงรหัสให้ ไม่ได้ส่ง SMS จริง (ต้องซื้อบริการ SMS) เบอร์ที่ใช้ทดสอบกำหนดที่ `OTP_TEST_PHONES` ([docs/SECURITY.md](docs/SECURITY.md))
- **Push notification:** โค้ดพร้อม แต่ต้องตั้งค่า Firebase บนเซิร์ฟเวอร์ถึงจะแจ้งเตือนเด้งบนมือถือ ([docs/PUSH_NOTIFICATIONS.md](docs/PUSH_NOTIFICATIONS.md))
- **Google login** ใช้ได้บนเว็บเท่านั้น ([docs/GOOGLE_LOGIN.md](docs/GOOGLE_LOGIN.md)) · **iPhone** ไม่มีแอปใน App Store (ใช้เว็บแอปติดตั้งลงหน้าจอโฮม)
- ยังไม่มีผลทดสอบการใช้งานจากผู้ใช้จริง (UAT/SUS) และยังไม่ได้ทดสอบกล้อง/GPS บนมือถือจริงครบทุกรุ่น
- ฟีเจอร์ที่ตัดออกไว้ต่อยอด: KU ALL Login, ตรวจบัตรประชาชน (eKYC), บทบาทหัวหน้าวิน, เป้าหมายรายได้คนขับ

## เอกสารอื่น

[PRODUCT.md](PRODUCT.md) · [DESIGN.md](DESIGN.md) (ระบบดีไซน์) · [docs/SECURITY.md](docs/SECURITY.md) · [docs/SONARQUBE.md](docs/SONARQUBE.md) · [docs/TEST_PLAN.md](docs/TEST_PLAN.md) · โลโก้: [docs/brand](docs/brand)
