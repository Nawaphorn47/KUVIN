-- บัญชีเดียวสลับโหมดผู้โดยสาร/คนขับ + ยืนยันตัวตนผู้โดยสาร (OTP + เซลฟี่) + เข้าระบบด้วย OTP/Google
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "selfieFile" TEXT;
ALTER TABLE "users" ADD COLUMN "selfieAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "googleSub" TEXT;
CREATE UNIQUE INDEX "users_googleSub_key" ON "users"("googleSub");

ALTER TABLE "drivers" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "drivers" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "phone_otps" (
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "phone_otps_pkey" PRIMARY KEY ("phone")
);
