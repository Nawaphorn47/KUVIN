-- ตรวจสลิปโอนเงินพร้อมเพย์อัตโนมัติ
ALTER TYPE "PaymentMethod" ADD VALUE 'PROMPTPAY';

ALTER TABLE "service_requests" ADD COLUMN "paymentRef" TEXT,
ADD COLUMN "paymentVerifiedAt" TIMESTAMP(3),
ADD COLUMN "paymentConfirmedBy" TEXT,
ADD COLUMN "paymentSlipAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "paymentSlipError" TEXT;

CREATE UNIQUE INDEX "service_requests_paymentRef_key" ON "service_requests"("paymentRef");

-- ทริปที่จ่ายแล้วก่อนมีระบบตรวจสลิป = คนขับกดยืนยันเอง
UPDATE "service_requests" SET "paymentConfirmedBy" = 'DRIVER' WHERE "paymentStatus" = 'PAID';
