# KU VIN — Mobile Web App

React + Vite + Tailwind CSS + Framer Motion. Mobile-first responsive app for ผู้ใช้บริการและผู้ขับขี่ (สลับโหมดได้ในแอปเดียว ผ่าน `AppContext`).

> เดิมโครงร่างนี้วางแผนไว้เป็น React Native (Expo) ตาม proposal บทที่ 3 แต่ wireframe ทั้งหมดถูกส่งออกมาเป็น HTML/Tailwind
> (มือถือแบบ responsive web) จึงแปลงเป็น React + Tailwind ตรงตามที่ขอ — เรียกใช้งานผ่านเบราว์เซอร์/PWA ได้ทันที
> หากภายหลังต้องการ build เป็นแอปมือถือจริง สามารถ wrap ด้วย Capacitor หรือ re-platform เข้า React Native ได้

## รัน

```bash
npm install
npm run dev
```

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
├── context/      AppContext — role mode (user/driver) + booking state (mock, ยังไม่ต่อ API จริง)
└── lib/
    ├── mockData.js  ข้อมูลจำลอง (สถานที่ในมก.กำแพงแสน, ประวัติการเดินทาง, รายได้ ฯลฯ)
    ├── api.js       axios instance ต่อ `apps/api` (แนบ JWT จาก `auth.js` อัตโนมัติ) + `uploadImage()`
    ├── auth.js      เก็บ/อ่าน/ลบ JWT ใน localStorage
    └── socket.js    socket.io-client + `connectWithAuth()`/`disconnectSocket()`
```

ดีไซน์: ฟอนต์ **Prompt** (รองรับภาษาไทย), โทนสีเขียว KU (`emerald-600/700`) เป็นสีหลัก, เทาสเลท (`slate`) สำหรับข้อความ, แดง/เหลืองอำพันสำหรับสถานะฉุกเฉิน/รอดำเนินการ — รวมเป็นระบบเดียวจาก wireframe เดิมที่มีสองชุดสไตล์ปะปนกัน (บางหน้าถูกส่งออกมาด้วยฟอนต์ Manrope ซึ่งไม่รองรับภาษาไทย ข้อความไทยจึงตกไปใช้ฟอนต์ระบบเงียบๆ — แก้เป็น Prompt ทั้งหมดแล้ว)

Mock data ส่วนใหญ่ยังอยู่ที่ `src/lib/mockData.js` (หน้า login/register/booking flow ยังไม่ต่อ backend จริง —
จงใจเว้นไว้ รอรื้อ/ปรับหน้าบ้านเองก่อนค่อยต่อสาย) แต่ 3 จุดต่อ `apps/api` จริงแล้ว: ยืนยันตัวตนคนขับ
(`pages/driver/VerifyStep1.jsx`/`VerifyStep2.jsx`), รับงานคิววิน (`pages/driver/DriverHome.jsx`/
`IncomingJob.jsx`) และปุ่ม SOS (`pages/user/Sos.jsx`) — ทั้งหมดต้องมี JWT ใน `lib/auth.js` ก่อนถึงจะใช้งานได้จริง
(ยังไม่มีหน้า login ไหน set token ให้ เพราะ `Login.jsx`/`Register.jsx` ยัง mock อยู่)
