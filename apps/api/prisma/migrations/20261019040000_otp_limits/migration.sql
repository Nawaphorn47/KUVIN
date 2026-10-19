-- จำกัดการขอ OTP ต่อเบอร์ และล็อกเบอร์เมื่อกรอกผิดรวมหลายครั้ง (กันเดารหัส/กันยิง SMS)
ALTER TABLE "phone_otps" ADD COLUMN "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "phone_otps" ADD COLUMN "sendCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "phone_otps" ADD COLUMN "failCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "phone_otps" ADD COLUMN "lockedUntil" TIMESTAMP(3);
