-- สถานที่ที่พิกัดตรวจกับแผนที่จริง (OpenStreetMap) แล้ว vs ยังเป็นค่าประมาณ
ALTER TABLE "landmarks" ADD COLUMN "coordsVerified" BOOLEAN NOT NULL DEFAULT false;

UPDATE "landmarks" SET "coordsVerified" = true
WHERE "name" IN ('สำนักหอสมุด', 'โรงพยาบาลสัตว์', 'หอพักนิสิต', 'ตลาดกำแพงแสน');
