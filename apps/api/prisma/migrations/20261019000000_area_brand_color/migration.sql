-- สีแบรนด์ของแต่ละพื้นที่ (ธีมหลักของแอป) — พื้นที่เดิมได้เขียว มก. เป็นค่าเริ่มต้น
ALTER TABLE "areas" ADD COLUMN "brandColor" TEXT NOT NULL DEFAULT '#006664';
