-- คิวรับงานแบบ FIFO: แยก "ออนไลน์" (isOnline) ออกจาก "ว่างรับงาน" (isAvailable = ไม่ได้อยู่ระหว่างทริป)
ALTER TABLE "drivers" ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "queueJoinedAt" TIMESTAMPTZ(6),
ADD COLUMN "timeoutCount" INTEGER NOT NULL DEFAULT 0;

-- ความหมายเดิมของ isAvailable = ออนไลน์ → ย้ายไป isOnline
UPDATE "drivers" SET "isOnline" = "isAvailable";

-- isAvailable ใหม่ = ไม่มีทริปที่กำลังทำอยู่
UPDATE "drivers" d SET "isAvailable" = NOT EXISTS (
  SELECT 1 FROM "service_requests" r WHERE r."driverId" = d."id" AND r."status" IN ('ACCEPTED', 'IN_PROGRESS')
);
ALTER TABLE "drivers" ALTER COLUMN "isAvailable" SET DEFAULT true;

-- คนที่ออนไลน์และว่างอยู่: เรียงคิวเริ่มต้นตามลำดับเดิม (เคยถูกเลื่อนท้ายคิวก่อน → เบอร์วิน)
UPDATE "drivers" d SET "queueJoinedAt" = clock_timestamp() + o.rn * interval '1 millisecond'
FROM (
  SELECT "id", row_number() OVER (
    ORDER BY COALESCE("queueBumpedAt", 'epoch'::timestamp), CASE WHEN "vinNumber" ~ '^[0-9]+$' THEN "vinNumber"::bigint ELSE 9223372036854775807 END
  ) AS rn
  FROM "drivers" WHERE "isOnline" AND "isAvailable"
) o
WHERE d."id" = o."id";

ALTER TABLE "drivers" DROP COLUMN "queueBumpedAt";
CREATE INDEX "drivers_isOnline_isAvailable_queueJoinedAt_idx" ON "drivers"("isOnline", "isAvailable", "queueJoinedAt");

ALTER TABLE "service_requests" ADD COLUMN "timedOutDriverIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
