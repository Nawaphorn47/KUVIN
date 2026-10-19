-- แชตระหว่างผู้โดยสารกับคนขับในทริป
CREATE TABLE "trip_messages" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "trip_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "trip_messages_serviceRequestId_createdAt_idx" ON "trip_messages"("serviceRequestId", "createdAt");
ALTER TABLE "trip_messages" ADD CONSTRAINT "trip_messages_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
