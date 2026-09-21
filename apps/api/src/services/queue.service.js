// คิวรับงานแบบ FIFO ของคนขับวิน
//
// หลักการ
//  - คิว = คนขับที่ isOnline && isAvailable && queueJoinedAt IS NOT NULL เรียงตาม queueJoinedAt น้อยไปมาก (หัวคิว = น้อยสุด)
//  - เสนองานทีละคน (หน้าต่างตอบรับ OFFER_TIMEOUT_MS) → accept / reject / timeout
//  - accept : ออกจากคิวทันที, isAvailable=false, timeoutCount=0, ได้งาน
//  - reject : penalty หนัก → queueJoinedAt = now (ไปท้ายคิว) แล้วเสนองานต่อให้คนถัดไปทันที
//  - timeout: timeoutCount+1
//      < MAX_TIMEOUTS  → penalty เบา: ย้ายไป "ต่อจากคนที่ได้งานรอบนี้" (ไม่ใช่ท้ายคิว)
//      >= MAX_TIMEOUTS → penalty หนัก + isOnline=false (สันนิษฐานว่าแอปค้าง/เน็ตหลุด) ออกจากคิวทั้งหมด
//  - จบทริป : ถ้ายังออนไลน์ → กลับเข้าคิวท้ายสุด ถ้าปิดแอปไปแล้ว → ไม่เข้าคิว
//
// Concurrency: ทุกการเปลี่ยนสถานะทำใน transaction เดียวโดยล็อกแถวก่อนอ่าน-แก้ (SELECT ... FOR UPDATE)
//  ลำดับการล็อกคงที่เสมอ: service_requests → drivers (drivers หลายแถวล็อกเรียงตาม id) จึงไม่เกิด deadlock
//  การหาหัวคิวใช้ FOR UPDATE SKIP LOCKED เพื่อให้ 2 คำขอที่เข้ามาพร้อมกันได้คนขับคนละคน ไม่รอกัน และไม่ได้คนเดียวกัน

const { Prisma } = require("@prisma/client");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { notify } = require("./notification.service");

const OFFER_TIMEOUT_MS = 15 * 1000; // หน้าต่างตอบรับงานต่อคนขับ 1 คน
const MAX_TIMEOUTS = 3; // timeout ครบกี่ครั้งถึงถูกเตะออฟไลน์
const TX_OPTIONS = { maxWait: 5000, timeout: 10000 };

const includeParties = {
  user: { select: { id: true, fullName: true, phone: true } },
  driver: { select: { id: true, fullName: true, phone: true, vinNumber: true, vehicleModel: true, licensePlate: true } },
};

// ---------------------------------------------------------------------------
// getNextDriverInQueue — หัวคิวที่ "ถูกเสนองานได้จริง" ณ ตอนนี้
// ต้องเรียกภายใน transaction: แถวที่ได้จะถูกล็อกจนกว่า transaction จะจบ
//  - SKIP LOCKED: แถวที่ transaction อื่นกำลังจัดการอยู่ (กำลังเสนองานให้ / กำลังรับงาน) จะถูกข้าม ไม่รอ
//  - NOT EXISTS : คนที่มีข้อเสนอค้างอยู่กับคำขออื่นแล้ว ห้ามถูกเสนองานซ้อน (ครอบคลุมช่วงที่ transaction ก่อนหน้า commit แล้ว)
//  - excludeDriverIds: คนที่ถูกเสนองานนี้ไปแล้ว (ปฏิเสธ/หมดเวลา) ไม่วนกลับมาในคำขอเดียวกัน
// ---------------------------------------------------------------------------
async function getNextDriverInQueue(tx, excludeDriverIds = []) {
  const rows = await tx.$queryRaw`
    SELECT d."id"
    FROM "drivers" d
    WHERE d."isOnline"
      AND d."isAvailable"
      AND d."verificationStatus" = 'APPROVED'
      AND d."queueJoinedAt" IS NOT NULL
      AND NOT (d."id" = ANY(${excludeDriverIds}::text[]))
      AND NOT EXISTS (
        SELECT 1 FROM "service_requests" r
        WHERE r."status" = 'PENDING' AND r."offeredDriverId" = d."id"
      )
    ORDER BY d."queueJoinedAt" ASC, d."id" ASC
    LIMIT 1
    FOR UPDATE OF d SKIP LOCKED`;
  return rows[0]?.id ?? null;
}

// เสนองานให้หัวคิวคนถัดไป (หรือยกเลิกคำขอถ้าไม่เหลือใครแล้ว) — ผู้เรียกต้องถือล็อกแถวคำขอนี้อยู่แล้ว
async function dispatchInTx(tx, request, triedDriverIds) {
  const nextId = await getNextDriverInQueue(tx, triedDriverIds);

  if (!nextId) {
    const cancelled = await tx.serviceRequest.update({
      where: { id: request.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: "ไม่พบคนขับว่างในคิวขณะนี้",
        offeredDriverId: null,
        offerExpiresAt: null,
        triedDriverIds,
      },
      include: includeParties,
    });
    return { kind: "expired", request: cancelled };
  }

  const offered = await tx.serviceRequest.update({
    where: { id: request.id },
    data: { offeredDriverId: nextId, offerExpiresAt: new Date(Date.now() + OFFER_TIMEOUT_MS), triedDriverIds },
    include: includeParties,
  });
  return { kind: "offered", request: offered, driverId: nextId };
}

// ส่ง event หลัง commit เท่านั้น (ห้าม emit ใน transaction: ถ้า rollback แล้วผู้ใช้จะเห็นข้อมูลที่ไม่มีอยู่จริง)
async function publishDispatch(io, result) {
  if (!result) return;
  if (result.kind === "offered") {
    io?.to(`driver:${result.driverId}`).emit("service-request:new", result.request);
  } else if (result.kind === "expired") {
    io?.to(`service-request:${result.request.id}`).emit("service-request:status", result.request);
    await notify(io, {
      recipientType: "USER",
      recipientId: result.request.userId,
      title: "ไม่พบคนขับว่าง",
      body: "ขณะนี้ไม่มีคนขับว่างในคิว กรุณาลองเรียกใหม่อีกครั้ง",
    });
  }
}

// เริ่มเสนองานสำหรับคำขอใหม่ (หรือคำขอที่ค้างไม่มีข้อเสนอ) — idempotent: มีข้อเสนอค้างอยู่แล้วจะไม่เสนอซ้อน
async function dispatchRequest(requestId, io) {
  const result = await prisma.$transaction(async (tx) => {
    const [req] = await tx.$queryRaw`
      SELECT "id", "status", "offeredDriverId", "triedDriverIds"
      FROM "service_requests" WHERE "id" = ${requestId} FOR UPDATE`;
    if (!req) return null;
    if (req.status !== "PENDING" || req.offeredDriverId) {
      return { kind: "noop", request: await tx.serviceRequest.findUnique({ where: { id: requestId }, include: includeParties }) };
    }
    return dispatchInTx(tx, req, req.triedDriverIds ?? []);
  }, TX_OPTIONS);

  await publishDispatch(io, result);
  return result?.request ?? null;
}

// ---------------------------------------------------------------------------
// light penalty: ย้ายคนที่ timeout (ครั้งที่ 1-2) ไป "ต่อจากคนที่ได้งาน" โดยไม่ขยับใคร
// queueJoinedAt ใหม่ = จุดกึ่งกลางระหว่างคนที่ได้งาน กับคนถัดไปในคิวเดิม (ละเอียดระดับ microsecond)
// ทำใน SQL ทั้งหมดเพราะ Date ของ JS ละเอียดแค่ millisecond
// ต้องเรียกก่อนที่จะเคลียร์ queueJoinedAt ของคนที่ได้งาน (ใช้เป็นจุดอ้างอิง)
// ---------------------------------------------------------------------------
async function settleTimedOutDrivers(tx, anchorDriverId, timedOutIds) {
  if (!timedOutIds?.length) return;

  // ล็อกเรียงตาม id เสมอ กัน deadlock ระหว่าง transaction ที่ settle พร้อมกัน
  await tx.$queryRaw`SELECT "id" FROM "drivers" WHERE "id" = ANY(${timedOutIds}::text[]) ORDER BY "id" FOR UPDATE`;

  let anchor = anchorDriverId;
  for (const id of timedOutIds) {
    const moved = await tx.$executeRaw`
      UPDATE "drivers" t
      SET "queueJoinedAt" = CASE
        WHEN nxt.q IS NULL THEN a."queueJoinedAt" + interval '1 millisecond'
        WHEN nxt.q - a."queueJoinedAt" < interval '2 microseconds' THEN a."queueJoinedAt" + interval '1 microsecond'
        ELSE a."queueJoinedAt" + (nxt.q - a."queueJoinedAt") / 2
      END
      FROM "drivers" a,
      LATERAL (
        SELECT MIN(x."queueJoinedAt") AS q FROM "drivers" x
        WHERE x."isOnline" AND x."isAvailable" AND x."queueJoinedAt" > a."queueJoinedAt" AND x."id" <> ${id}
      ) nxt
      WHERE t."id" = ${id} AND a."id" = ${anchor}
        AND t."isOnline" AND t."isAvailable" AND t."queueJoinedAt" IS NOT NULL`;
    if (moved > 0) anchor = id; // คนถัดไปที่ timeout ต่อท้ายคนนี้ (คงลำดับเดิมของกลุ่ม timeout)
  }
}

// ---------------------------------------------------------------------------
// handleDriverResponse — คนขับตอบข้อเสนองาน: "accept" | "reject" | "timeout"
// ปลอดภัยต่อการเรียกซ้ำ/ชนกัน: "timeout" จาก sweeper กับ "accept" จากคนขับที่มาพร้อมกัน ใครล็อกแถวคำขอได้ก่อนชนะ
// อีกฝ่ายจะไม่เจอข้อเสนอนั้นแล้ว (offeredDriverId เปลี่ยน) → accept/reject ได้ 409, timeout เป็น no-op
// ---------------------------------------------------------------------------
async function handleDriverResponse(driverId, response, io, { requestId } = {}) {
  if (!["accept", "reject", "timeout"].includes(response)) {
    throw ApiError.badRequest("response ต้องเป็น accept, reject หรือ timeout");
  }

  const outcome = await prisma.$transaction(async (tx) => {
    // 1) ล็อกคำขอที่กำลังเสนอให้คนขับคนนี้ (ล็อกคำขอก่อนคนขับเสมอ)
    const rows = await tx.$queryRaw`
      SELECT "id", "userId", "triedDriverIds", "timedOutDriverIds", "offerExpiresAt"
      FROM "service_requests"
      WHERE "status" = 'PENDING' AND "offeredDriverId" = ${driverId}
        ${requestId ? Prisma.sql`AND "id" = ${requestId}` : Prisma.empty}
      FOR UPDATE`;
    const req = rows[0];

    if (!req) {
      if (response === "timeout") return { kind: "noop" }; // ตอบไปก่อนแล้ว/คำขอเปลี่ยนสถานะไปแล้ว
      throw ApiError.conflict("ไม่ใช่คิวของคุณสำหรับงานนี้ในขณะนี้ หรือหมดเวลาไปแล้ว");
    }

    const now = new Date();
    const isExpired = req.offerExpiresAt && req.offerExpiresAt.getTime() <= now.getTime();
    if (response === "timeout" && !isExpired) return { kind: "noop" }; // sweeper อ่านมาช้า คนขับต่ออายุ/ตอบไปแล้ว
    if (response !== "timeout" && isExpired) {
      throw ApiError.conflict("หมดเวลารับงานแล้ว ระบบกำลังส่งต่อให้คนขับคนถัดไป");
    }

    // 2) ล็อกแถวคนขับ
    const [driver] = await tx.$queryRaw`
      SELECT "id", "isOnline", "isAvailable", "timeoutCount" FROM "drivers" WHERE "id" = ${driverId} FOR UPDATE`;
    if (!driver) throw ApiError.notFound("Driver not found");

    const tried = [...(req.triedDriverIds ?? []), driverId];

    if (response === "accept") {
      if (!driver.isOnline || !driver.isAvailable) {
        throw ApiError.conflict("คุณออฟไลน์หรือมีงานอยู่ระหว่างดำเนินการอยู่แล้ว");
      }

      // คนที่ timeout รอบนี้ไปต่อจากคนที่ได้งาน — ต้องทำก่อนเคลียร์ queueJoinedAt ของผู้รับงาน
      await settleTimedOutDrivers(tx, driverId, req.timedOutDriverIds);

      await tx.$executeRaw`
        UPDATE "drivers" SET "isAvailable" = false, "queueJoinedAt" = NULL, "timeoutCount" = 0, "updatedAt" = now()
        WHERE "id" = ${driverId}`;

      const accepted = await tx.serviceRequest.update({
        where: { id: req.id },
        data: {
          status: "ACCEPTED",
          driverId,
          acceptedAt: now,
          offeredDriverId: null,
          offerExpiresAt: null,
          triedDriverIds: tried,
          timedOutDriverIds: [],
        },
        include: includeParties,
      });
      return { kind: "accepted", request: accepted };
    }

    if (response === "reject") {
      // penalty หนัก: ไปท้ายคิวทันที (เวลาปัจจุบัน = มากสุดในคิว)
      await tx.$executeRaw`UPDATE "drivers" SET "queueJoinedAt" = clock_timestamp(), "updatedAt" = now() WHERE "id" = ${driverId}`;
      return { kind: "dispatch", dispatch: await dispatchInTx(tx, req, tried) };
    }

    // timeout
    const timeoutCount = driver.timeoutCount + 1;

    if (timeoutCount >= MAX_TIMEOUTS) {
      // penalty หนัก + ออฟไลน์อัตโนมัติ: ออกจากคิวทั้งหมด
      await tx.$executeRaw`
        UPDATE "drivers" SET "isOnline" = false, "queueJoinedAt" = NULL, "timeoutCount" = ${timeoutCount}, "updatedAt" = now()
        WHERE "id" = ${driverId}`;
      return { kind: "dispatch", forcedOffline: true, dispatch: await dispatchInTx(tx, req, tried) };
    }

    // penalty เบา: ยังอยู่ในคิวตำแหน่งเดิมไปก่อน รอรู้ว่าใครได้งานรอบนี้ค่อยย้าย (settleTimedOutDrivers ตอน accept)
    await tx.$executeRaw`UPDATE "drivers" SET "timeoutCount" = ${timeoutCount}, "updatedAt" = now() WHERE "id" = ${driverId}`;
    const timedOut = [...(req.timedOutDriverIds ?? []), driverId];
    await tx.serviceRequest.update({ where: { id: req.id }, data: { timedOutDriverIds: timedOut } });
    return { kind: "dispatch", dispatch: await dispatchInTx(tx, req, tried) };
  }, TX_OPTIONS);

  // ---- หลัง commit: ส่ง event ----
  if (outcome.kind === "accepted") {
    const { request } = outcome;
    io?.to(`service-request:${request.id}`).emit("service-request:status", request);
    await notify(io, {
      recipientType: "USER",
      recipientId: request.userId,
      title: "คนขับตอบรับงานแล้ว",
      body: `${request.driver.fullName} รับงานของคุณแล้ว กำลังมารับที่ ${request.pickupAddress ?? "จุดนัดพบ"}`,
    });
    return request;
  }

  if (outcome.kind === "dispatch") {
    if (outcome.forcedOffline) {
      io?.to(`driver:${driverId}`).emit("driver:forced-offline", {
        reason: `ไม่ตอบรับงานติดต่อกัน ${MAX_TIMEOUTS} ครั้ง ระบบปรับสถานะเป็นออฟไลน์ กรุณากดออนไลน์อีกครั้งเมื่อพร้อมรับงาน`,
      });
      await notify(io, {
        recipientType: "DRIVER",
        recipientId: driverId,
        title: "ระบบปรับสถานะเป็นออฟไลน์",
        body: `คุณไม่ตอบรับงานติดต่อกัน ${MAX_TIMEOUTS} ครั้ง กรุณากดออนไลน์อีกครั้งเมื่อพร้อมรับงาน`,
      });
    }
    await publishDispatch(io, outcome.dispatch);
    return outcome.dispatch.request;
  }

  return null; // noop
}

// ---------------------------------------------------------------------------
// handleTripCompleted — จบทริป (รวมกรณีงานถูกยกเลิกหลังรับงานแล้ว)
//  ยังออนไลน์ → isAvailable=true, timeoutCount=0, queueJoinedAt=now (ท้ายคิว)
//  ปิดแอปไปแล้ว → ปลดสถานะติดทริป แต่ "ไม่" เข้าคิว (ตอนกดออนไลน์ใหม่ค่อยเข้าคิว)
// เรียกซ้ำได้ (idempotent): ถ้าว่างอยู่แล้วจะไม่ขยับคิวซ้ำ
// ---------------------------------------------------------------------------
async function handleTripCompleted(driverId) {
  return prisma.$transaction(async (tx) => {
    const [driver] = await tx.$queryRaw`
      SELECT "id", "isOnline", "isAvailable" FROM "drivers" WHERE "id" = ${driverId} FOR UPDATE`;
    if (!driver) return null;
    if (driver.isAvailable) return { requeued: false };

    if (driver.isOnline) {
      await tx.$executeRaw`
        UPDATE "drivers" SET "isAvailable" = true, "timeoutCount" = 0, "queueJoinedAt" = clock_timestamp(), "updatedAt" = now()
        WHERE "id" = ${driverId}`;
      return { requeued: true };
    }

    await tx.$executeRaw`
      UPDATE "drivers" SET "isAvailable" = true, "timeoutCount" = 0, "queueJoinedAt" = NULL, "updatedAt" = now()
      WHERE "id" = ${driverId}`;
    return { requeued: false };
  }, TX_OPTIONS);
}

// ---------------------------------------------------------------------------
// ออนไลน์/ออฟไลน์
// ---------------------------------------------------------------------------
async function goOnline(driverId) {
  await prisma.$transaction(async (tx) => {
    const [driver] = await tx.$queryRaw`
      SELECT "id", "isOnline" FROM "drivers" WHERE "id" = ${driverId} FOR UPDATE`;
    if (!driver || driver.isOnline) return; // กดซ้ำ/reconnect ต้องไม่รีเซ็ตตำแหน่งคิว

    const activeTrips = await tx.serviceRequest.count({
      where: { driverId, status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
    });

    if (activeTrips > 0) {
      // ออฟไลน์ระหว่างทริปแล้วกลับมาออนไลน์: ยังไม่ว่าง จะเข้าคิวเมื่อจบทริป
      await tx.$executeRaw`
        UPDATE "drivers" SET "isOnline" = true, "isAvailable" = false, "queueJoinedAt" = NULL, "timeoutCount" = 0, "updatedAt" = now()
        WHERE "id" = ${driverId}`;
    } else {
      await tx.$executeRaw`
        UPDATE "drivers" SET "isOnline" = true, "isAvailable" = true, "queueJoinedAt" = clock_timestamp(), "timeoutCount" = 0, "updatedAt" = now()
        WHERE "id" = ${driverId}`;
    }
  }, TX_OPTIONS);
}

async function goOffline(driverId, io) {
  const result = await prisma.$transaction(async (tx) => {
    // ล็อกคำขอที่เสนอให้คนนี้อยู่ก่อน (ลำดับล็อกเดียวกับ handleDriverResponse) แล้วค่อยล็อกคนขับ
    const [req] = await tx.$queryRaw`
      SELECT "id", "triedDriverIds" FROM "service_requests"
      WHERE "status" = 'PENDING' AND "offeredDriverId" = ${driverId} FOR UPDATE`;

    await tx.$executeRaw`
      UPDATE "drivers" SET "isOnline" = false, "queueJoinedAt" = NULL, "timeoutCount" = 0, "updatedAt" = now()
      WHERE "id" = ${driverId}`;

    // ออฟไลน์ตอนกำลังถูกเสนองาน: ส่งต่อให้คนถัดไปทันทีโดยไม่คิดเป็นการปฏิเสธ/timeout
    if (!req) return null;
    return dispatchInTx(tx, req, [...(req.triedDriverIds ?? []), driverId]);
  }, TX_OPTIONS);

  await publishDispatch(io, result);
}

// ---------------------------------------------------------------------------
// ภาพรวมคิว (หน้าคนขับ) + sweeper
// ---------------------------------------------------------------------------
async function getQueueOverview(driverId) {
  const drivers = await prisma.driver.findMany({
    where: { isOnline: true, isAvailable: true, verificationStatus: "APPROVED", queueJoinedAt: { not: null } },
    orderBy: [{ queueJoinedAt: "asc" }, { id: "asc" }],
    select: { id: true, fullName: true, vinNumber: true },
  });

  const activeOffer = await prisma.serviceRequest.findFirst({
    where: { status: "PENDING", offeredDriverId: { not: null } },
    orderBy: { requestedAt: "asc" },
    select: { id: true, offeredDriverId: true, offerExpiresAt: true },
  });

  const queue = drivers.map((d, i) => ({
    position: i + 1,
    driverId: d.id,
    fullName: d.fullName,
    vinNumber: d.vinNumber,
    isMe: d.id === driverId,
    isActiveOffer: activeOffer?.offeredDriverId === d.id,
  }));
  const me = queue.find((q) => q.isMe);

  return {
    queue,
    activeOffer: activeOffer
      ? { requestId: activeOffer.id, driverId: activeOffer.offeredDriverId, offerExpiresAt: activeOffer.offerExpiresAt }
      : null,
    myPosition: me?.position ?? null,
    aheadOfMe: me ? me.position - 1 : null,
  };
}

// เรียกทุก ~1 วิจาก index.js — คำขอที่ข้อเสนอหมดเวลา = timeout ของคนขับคนนั้น
// (+ กู้คำขอ PENDING ที่ไม่มีข้อเสนอค้างนานผิดปกติ เช่น process ตายระหว่างส่งต่อ)
async function sweepExpiredOffers(io) {
  const now = new Date();
  const expired = await prisma.serviceRequest.findMany({
    where: { status: "PENDING", offeredDriverId: { not: null }, offerExpiresAt: { lt: now } },
    select: { offeredDriverId: true },
  });

  for (const { offeredDriverId } of expired) {
    await handleDriverResponse(offeredDriverId, "timeout", io).catch((err) =>
      console.error(`timeout handling failed for driver ${offeredDriverId}:`, err)
    );
  }

  const orphans = await prisma.serviceRequest.findMany({
    where: { status: "PENDING", offeredDriverId: null, requestedAt: { lt: new Date(now.getTime() - 10 * 1000) } },
    select: { id: true },
  });
  for (const { id } of orphans) {
    await dispatchRequest(id, io).catch((err) => console.error(`re-dispatch failed for request ${id}:`, err));
  }

  return expired.length + orphans.length;
}

module.exports = {
  OFFER_TIMEOUT_MS,
  MAX_TIMEOUTS,
  includeParties,
  getNextDriverInQueue,
  settleTimedOutDrivers, // export ไว้ให้ scripts/test-queue.js ทดสอบตรง ๆ
  dispatchRequest,
  handleDriverResponse,
  handleTripCompleted,
  goOnline,
  goOffline,
  getQueueOverview,
  sweepExpiredOffers,
};
