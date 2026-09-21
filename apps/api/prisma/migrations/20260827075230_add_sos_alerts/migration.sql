-- CreateEnum
CREATE TYPE "SosStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "sos_alerts" (
    "id" TEXT NOT NULL,
    "actorType" "NotificationRecipient" NOT NULL,
    "actorId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "note" TEXT,
    "serviceRequestId" TEXT,
    "status" "SosStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sos_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sos_alerts_actorType_actorId_idx" ON "sos_alerts"("actorType", "actorId");
