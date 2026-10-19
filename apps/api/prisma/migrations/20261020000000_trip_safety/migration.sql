-- ความปลอดภัยระหว่างทริป: PIN ขึ้นรถ + แจ้งปัญหาหลังทริป
ALTER TABLE "service_requests" ADD COLUMN "pinAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "service_requests" ADD COLUMN "boardingConfirmedAt" TIMESTAMP(3);

CREATE TABLE "trip_reports" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "reporterRole" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trip_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "trip_reports_areaId_status_idx" ON "trip_reports"("areaId", "status");
CREATE INDEX "trip_reports_serviceRequestId_idx" ON "trip_reports"("serviceRequestId");
ALTER TABLE "trip_reports" ADD CONSTRAINT "trip_reports_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
