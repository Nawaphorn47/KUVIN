# เปิดใช้ปุ่ม "ดำเนินการต่อโดยใช้ Google"

โค้ดพร้อมแล้ว (ฝั่งแอป `GoogleButton.jsx`, ฝั่ง API `POST /api/auth/google`) ปุ่มจะ**ขึ้นเองเมื่อ API ตั้ง `GOOGLE_CLIENT_ID`** — ไม่ตั้ง = ซ่อนปุ่ม
ฟรี ไม่ต้องผูกบัตร ไม่ต้องใช้ secret (ใช้เฉพาะ Client ID ซึ่งเป็นค่าสาธารณะ)

## 1) สร้าง OAuth Client ID (ทำเอง ในบัญชี Google ของคุณ)

1. เปิด https://console.cloud.google.com → สร้างโปรเจกต์ใหม่ (ตั้งชื่อ `kuvin`)
2. **APIs & Services → OAuth consent screen**: เลือก **External**, ใส่ชื่อแอป `KU VIN`, อีเมลติดต่อ, แล้วบันทึก
   (ขอแค่ scope พื้นฐาน `openid`, `email`, `profile` — ไม่ต้องส่งตรวจสอบกับ Google ถ้าไม่ได้ขอ scope อ่อนไหว)
   สถานะ **Testing** จำกัดเฉพาะอีเมลที่เพิ่มไว้ใน Test users (สูงสุด 100) — ก่อนให้คนทั่วไปใช้ให้กด **Publish app**
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins** (ต้องตรงทุกตัวอักษร ไม่มี `/` ท้าย):
     - `https://kuvinn.tech`
     - `http://localhost:3302` (ถ้าจะลองบนเครื่อง)
   - ไม่ต้องใส่ Authorized redirect URIs (ใช้ปุ่มแบบ Google Identity Services)
4. คัดลอก **Client ID** (หน้าตาเหมือน `1234567890-abc...apps.googleusercontent.com`)

## 2) ใส่ที่ VPS

```bash
ssh -i ~/.ssh/kuvin_vps deploy@187.127.100.24
cd ~/app
echo 'GOOGLE_CLIENT_ID=<Client ID ที่คัดลอก>' >> .env
docker compose up -d api
```

ตรวจ: `curl https://api.kuvinn.tech/api/auth/config` ต้องเห็น `"googleClientId":"…"` แล้วเปิด https://kuvinn.tech/login จะเห็นปุ่ม Google

## ลักษณะการทำงาน (ตรวจแล้วในโค้ด)

- API ตรวจ ID token กับ Google แล้วเทียบ `aud` กับ `GOOGLE_CLIENT_ID` ของเรา และเช็กผู้ออก (`iss`) กับวันหมดอายุ
- บัญชี Google ที่เคยผูกไว้ หรืออีเมลตรงกับบัญชีเดิม → เข้าได้ทันที
- บัญชีใหม่ → ต้องยืนยันเบอร์โทรด้วย OTP ต่อ (ทุกบัญชีต้องมีเบอร์ติดต่อได้) ตอนนี้ OTP ยังเป็นโหมดทดสอบ (`OTP_MODE=test`) — เบอร์ต้องอยู่ใน `OTP_TEST_PHONES`
  หรือตั้ง `OTP_TEST_PHONES=*` เมื่อยอมรับความเสี่ยงของเดโมสาธารณะ (ดู `docs/SECURITY.md`)

## ข้อจำกัด

- ใช้ได้บนเว็บ (https://kuvinn.tech) เท่านั้น — แอป Android ที่ห่อด้วย Capacitor ใช้ origin `https://localhost` ซึ่ง Google ไม่รับเป็น origin ของ Web client
  (ต้องทำ Android OAuth client + ปลั๊กอินแยก ถ้าจะรองรับในแอป)
- เบราว์เซอร์ที่บล็อกคุกกี้ของบุคคลที่สามอาจทำให้ปุ่มไม่ขึ้น แอปจะแสดงข้อความให้ใช้เบอร์โทรแทน
