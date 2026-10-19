-- แยกประเภทคนขับ: นิสิต / บุคคลทั่วไป / วินมอเตอร์ไซค์ (คิวเดียวกัน เอกสารต่างกัน)
CREATE TYPE "DriverType" AS ENUM ('STUDENT', 'PUBLIC', 'PRO');
ALTER TABLE "drivers" ADD COLUMN "driverType" "DriverType" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "drivers" ADD COLUMN "studentId" TEXT;
ALTER TABLE "drivers" ADD COLUMN "winGroupName" TEXT;
ALTER TABLE "drivers" ADD COLUMN "studentCardPhotoUrl" TEXT;
ALTER TABLE "drivers" ADD COLUMN "vestPhotoUrl" TEXT;
-- คนขับที่มีอยู่ก่อนหน้านี้ทั้งหมดสมัครแบบวินมอเตอร์ไซค์ (มีเบอร์วิน) — ถือเป็นประเภท PRO
UPDATE "drivers" SET "driverType" = 'PRO';
