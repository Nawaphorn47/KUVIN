# KU VIN — Mobile Web App

React + Vite + Tailwind CSS + Framer Motion. Mobile-first responsive app for ผู้ใช้บริการและผู้ขับขี่ (สลับโหมดได้ในแอปเดียว ผ่าน `AppContext`).

> เดิมโครงร่างนี้วางแผนไว้เป็น React Native (Expo) ตาม proposal บทที่ 3 แต่ wireframe ทั้งหมดถูกส่งออกมาเป็น HTML/Tailwind
> (มือถือแบบ responsive web) จึงแปลงเป็น React + Tailwind ตรงตามที่ขอ — เรียกใช้งานผ่านเบราว์เซอร์/PWA ได้ทันที
> ตอนนี้ห่อด้วย Capacitor เป็นแอป Android แล้ว (โฟลเดอร์ `android/`) — ดูหัวข้อ "แอป Android" ด้านล่าง

## รัน

```bash
npm install
npm run dev
```

## แอป Android (Capacitor)

ต้องมี Android Studio ติดตั้งในเครื่อง (ใช้ SDK และ JDK ที่มากับตัวมัน) และรัน `apps/api` อยู่

```bash
npm run android:dev            # build APK ทดสอบ → android/app/build/outputs/apk/debug/app-debug.apk
npm run android:dev -- --run   # build แล้วติดตั้งลงมือถือที่เสียบ USB อยู่ (เปิด USB debugging ก่อน)
```

- สคริปต์ (`scripts/android-dev.mjs`) หา IP วง Wi-Fi ของเครื่องนี้เองแล้วฝังเป็น API URL ในแอป — มือถือต้องต่อ
  Wi-Fi วงเดียวกัน ถ้าเดา IP ผิด (มีหลาย network adapter) กำหนดเองด้วย `KUVIN_API_HOST=<ip>`
- ถ้ามือถือเรียก API ไม่ได้ ให้เช็ค Windows Firewall ว่าเปิดพอร์ต 4000 ให้เครือข่าย Private แล้ว
- APK ทดสอบมีปุ่ม "เข้าสู่ระบบด่วน" เหมือนตอนรัน dev และยอมให้ยิง API แบบ `http://` — build ที่จะแจกจริงต้องชี้ไป
  API ที่เป็น `https://` (ยังไม่มีสคริปต์ release — รอเลือก hosting ก่อน)
- `appId` คือ `com.kuvin.app` (ใน `capacitor.config.ts`) — ต้องตรงกับที่ลงทะเบียนใน Firebase และเปลี่ยนไม่ได้หลังขึ้น Play Store

### Push notification (Firebase)

backend ส่ง push ได้อยู่แล้ว (`apps/api/src/services/fcm.service.js`) ฝั่งแอปลงทะเบียน device token ให้เองหลัง login
(`src/lib/push.js`) และล้างออกตอน logout — ขาดแค่ไฟล์ตั้งค่าจาก Firebase:

1. [Firebase Console](https://console.firebase.google.com) → สร้างโปรเจกต์ → เพิ่มแอป **Android** ใช้ package name `com.kuvin.app`
2. ดาวน์โหลด `google-services.json` → วางที่ `apps/mobile/android/app/google-services.json`
   (gitignore ไว้แล้ว — repo เป็น public ห้าม commit)
3. Project settings → Service accounts → Generate new private key → ตั้งค่าใน `apps/api/.env` ตาม `apps/api/README.md`
   หัวข้อ "Push Notification (FCM)"
4. `npm run android:dev` ใหม่ — สคริปต์เจอไฟล์จากข้อ 2 แล้วจะเปิด push ให้เอง

ถ้าไม่มีไฟล์ในข้อ 2 แอปจะปิด push ไว้ทั้งหมด (ถ้าเรียกลงทะเบียน push บน Android โดยไม่มี Firebase แอปจะ crash)

## โครงสร้าง

```
src/
├── pages/
│   ├── auth/     splash, onboarding, login, register, forgot-password
│   ├── user/     home ... chatbot (14 หน้าจอ)
│   └── driver/   verify step1/2, pending/success/rejected, driver-home ... driver-profile (14 หน้าจอ)
├── components/
│   ├── ui/       Button, Card, Input, Badge, Avatar, RatingStars
│   ├── layout/   Screen, TopBar, BottomNav
│   └── shared/   MapView (Leaflet), RouteSummary, DriverInfoCard, SosPanel, PaymentQr, ...
├── context/      AppContext — โปรไฟล์ของบัญชีที่ login อยู่ + role mode + booking state
│                 DriverPresenceContext — สถานะออนไลน์/รับงานของคนขับ (ทำงานทุกหน้า)
└── lib/
    ├── api.js               axios instance ต่อ `apps/api` (แนบ JWT จาก `auth.js` อัตโนมัติ) + `uploadImage()`
    ├── auth.js              เก็บ/อ่าน/ลบ JWT ใน localStorage
    ├── socket.js            socket.io-client + `connectWithAuth()`/`disconnectSocket()`
    ├── useRequestStatus.js  ติดตามสถานะคำขอฝั่งผู้โดยสาร (join room ใหม่ทุกครั้งที่ socket ต่อกลับ + poll สำรอง)
    ├── emergencyContacts.js เบอร์ฉุกเฉินจริง (ตรวจจากเว็บวิทยาเขต) — ห้ามใส่เบอร์ตัวอย่าง
    └── push.js              ลงทะเบียน/ยกเลิก FCM device token (ทำงานเฉพาะในแอป Android ที่มี Firebase)
```

ดีไซน์: ฟอนต์ **Prompt** (รองรับภาษาไทย), โทนสีเขียว KU (`emerald-600/700`) เป็นสีหลัก, เทาสเลท (`slate`) สำหรับข้อความ, แดง/เหลืองอำพันสำหรับสถานะฉุกเฉิน/รอดำเนินการ — รวมเป็นระบบเดียวจาก wireframe เดิมที่มีสองชุดสไตล์ปะปนกัน (บางหน้าถูกส่งออกมาด้วยฟอนต์ Manrope ซึ่งไม่รองรับภาษาไทย ข้อความไทยจึงตกไปใช้ฟอนต์ระบบเงียบๆ — แก้เป็น Prompt ทั้งหมดแล้ว)

ทุกหน้าต่อ `apps/api` จริงแล้ว ไม่มีข้อมูลจำลองเหลือ (`mockData.js` ลบออกแล้ว) — ระหว่างโหลดหรือไม่มีข้อมูลจะแสดง `-`
หรือข้อความว่าง ห้าม fallback เป็นข้อมูลตัวอย่าง (เคยทำให้คนขับที่ยังไม่มีคะแนนเห็นคะแนนปลอม 4.8 และทุกคนเห็นเที่ยวล่าสุด
ชุดเดียวกัน) ปุ่ม/เมนูที่ยังไม่มีฟีเจอร์รองรับ (ล็อกอินด้วย Google, สถานที่โปรด, นโยบายความเป็นส่วนตัว) เอาออกไว้ก่อน
