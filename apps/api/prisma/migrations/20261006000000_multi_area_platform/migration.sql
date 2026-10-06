-- แพลตฟอร์มหลายพื้นที่ (multi-area): คนขับ/คิว/สถานที่/คำขอ/SOS แยกตามพื้นที่ + แอดมิน 2 ระดับ + บันทึกต้นทุนคนขับ
--
-- เขียนเองแทน SQL ที่ prisma migrate diff สร้าง: Prisma จะเพิ่ม "areaId" แบบ NOT NULL ตรง ๆ ซึ่งล้มทันทีบน DB ที่มีข้อมูล
-- จึงสร้างพื้นที่แรก (มก. กำแพงแสน — ค่าเดียวกับที่เคยฝังในโค้ด) ก่อน แล้วผูกข้อมูลเดิมทั้งหมดเข้ากับพื้นที่นั้นค่อยบังคับ NOT NULL

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'AREA_ADMIN');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FUEL', 'TIRE', 'ENGINE_OIL', 'MAINTENANCE', 'REPAIR', 'OTHER');

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "flatRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "serviceRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "flatFare" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "ratePerKm" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "minFare" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "emergencyContacts" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "areas_slug_key" ON "areas"("slug");

-- พื้นที่แรก: ค่าเดิมที่เคยฝังในโค้ด (apps/api/src/utils/geo.js, apps/mobile/src/lib/emergencyContacts.js)
-- id คงที่ ให้ seed / ชุดทดสอบอ้างถึงได้
INSERT INTO "areas" (
    "id", "slug", "name", "displayName", "centerLat", "centerLng", "flatRadiusKm", "serviceRadiusKm",
    "flatFare", "ratePerKm", "minFare", "emergencyContacts", "isActive", "createdAt", "updatedAt"
) VALUES (
    'area-ku-kps', 'ku-kps', 'มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน', 'มก. กำแพงแสน', 14.023, 99.9739, 2, 15,
    20, 10, 20,
    '[{"label":"รปภ. มหาวิทยาลัย (วิทยาเขตกำแพงแสน)","phone":"034-351-151"},{"label":"ตำรวจ","phone":"191"},{"label":"หน่วยแพทย์ฉุกเฉิน (EMS)","phone":"1669"}]',
    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- คนขับ: สังกัดพื้นที่ + เบอร์วินไม่ซ้ำภายในพื้นที่ (เดิมไม่ซ้ำทั้งระบบ)
ALTER TABLE "drivers" ADD COLUMN "areaId" TEXT,
ADD COLUMN "fuelKmPerLiter" DOUBLE PRECISION,
ADD COLUMN "fuelPricePerLiter" DOUBLE PRECISION;
UPDATE "drivers" SET "areaId" = 'area-ku-kps';
ALTER TABLE "drivers" ALTER COLUMN "areaId" SET NOT NULL;
DROP INDEX "drivers_vinNumber_key";
CREATE UNIQUE INDEX "drivers_areaId_vinNumber_key" ON "drivers"("areaId", "vinNumber");
DROP INDEX "drivers_isOnline_isAvailable_queueJoinedAt_idx";
CREATE INDEX "drivers_areaId_isOnline_isAvailable_queueJoinedAt_idx" ON "drivers"("areaId", "isOnline", "isAvailable", "queueJoinedAt");
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- คำขอ
ALTER TABLE "service_requests" ADD COLUMN "areaId" TEXT;
UPDATE "service_requests" SET "areaId" = 'area-ku-kps';
ALTER TABLE "service_requests" ALTER COLUMN "areaId" SET NOT NULL;
CREATE INDEX "service_requests_areaId_status_idx" ON "service_requests"("areaId", "status");
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- สถานที่
ALTER TABLE "landmarks" ADD COLUMN "areaId" TEXT;
UPDATE "landmarks" SET "areaId" = 'area-ku-kps';
ALTER TABLE "landmarks" ALTER COLUMN "areaId" SET NOT NULL;
CREATE INDEX "landmarks_areaId_idx" ON "landmarks"("areaId");
ALTER TABLE "landmarks" ADD CONSTRAINT "landmarks_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SOS: ทุกเหตุเดิมเกิดในพื้นที่แรก
ALTER TABLE "sos_alerts" ADD COLUMN "areaId" TEXT;
UPDATE "sos_alerts" SET "areaId" = 'area-ku-kps';
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- แอดมิน: บัญชีที่มีอยู่แล้ว (ผู้ดูแลระบบเดิมที่เห็นทุกอย่าง) เป็น SUPER_ADMIN, บัญชีใหม่ค่าเริ่มต้นเป็น AREA_ADMIN
ALTER TABLE "admins" ADD COLUMN "areaId" TEXT,
ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'AREA_ADMIN';
UPDATE "admins" SET "role" = 'SUPER_ADMIN';
ALTER TABLE "admins" ADD CONSTRAINT "admins_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- รายจ่ายคนขับ
CREATE TABLE "driver_expenses" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "liters" DOUBLE PRECISION,
    "odometerKm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "driver_expenses_driverId_occurredAt_idx" ON "driver_expenses"("driverId", "occurredAt");
ALTER TABLE "driver_expenses" ADD CONSTRAINT "driver_expenses_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
