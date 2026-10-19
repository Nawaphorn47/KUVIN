-- ตัด PIN ขึ้นรถออก (ผู้ใช้ตัดสินใจว่ายุ่งยากเกินไปสำหรับทริปสั้นในพื้นที่) — คงตาราง trip_reports ไว้
ALTER TABLE "service_requests" DROP COLUMN "pinAttempts";
ALTER TABLE "service_requests" DROP COLUMN "boardingConfirmedAt";
