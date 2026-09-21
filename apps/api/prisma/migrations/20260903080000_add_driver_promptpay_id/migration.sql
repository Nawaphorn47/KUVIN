-- AlterTable: drivers — เบอร์พร้อมเพย์/เลขบัตร ปชช. ที่ใช้สร้าง QR รับเงินค่าโดยสาร
ALTER TABLE "drivers" ADD COLUMN     "promptPayId" TEXT;
