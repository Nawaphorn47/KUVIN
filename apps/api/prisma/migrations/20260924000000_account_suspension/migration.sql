-- ระงับบัญชีผู้ใช้/คนขับโดย admin
ALTER TABLE "users" ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "suspendedReason" TEXT,
ADD COLUMN "suspendedAt" TIMESTAMP(3);

ALTER TABLE "drivers" ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "suspendedReason" TEXT,
ADD COLUMN "suspendedAt" TIMESTAMP(3);
