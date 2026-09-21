-- AlterTable: drivers — เพิ่มเวลา "ถูกเลื่อนไปท้ายคิว" ล่าสุด สำหรับคิวหมุนเวียนตามเบอร์วิน
ALTER TABLE "drivers" ADD COLUMN     "queueBumpedAt" TIMESTAMP(3);

-- AlterTable: service_requests — เพิ่มสถานะการเสนองานทีละคนตามคิว
ALTER TABLE "service_requests" ADD COLUMN     "offeredDriverId" TEXT,
ADD COLUMN     "offerExpiresAt" TIMESTAMP(3),
ADD COLUMN     "triedDriverIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable: sos_alerts — เก็บเบอร์ฉุกเฉินที่ผู้แจ้งกดโทรออกจากหน้า SOS
ALTER TABLE "sos_alerts" ADD COLUMN     "contactedEmergencyNumber" TEXT;
