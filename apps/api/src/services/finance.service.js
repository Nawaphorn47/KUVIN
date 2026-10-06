// การเงินของคนขับ: รายได้จากทริป − ค่าใช้จ่าย (จดเอง) = กำไร, ประมาณค่าน้ำมันจากอัตราสิ้นเปลือง, คำนวณ กม./ลิตร จริง
//
// ค่าน้ำมันต่อช่วงเวลา: ถ้าจดการเติมน้ำมันจริงในช่วงนั้นใช้ตัวเลขจริง ไม่จด = ประมาณจากระยะทางทริป ÷ กม./ลิตร × ราคา/ลิตร
// (ประมาณจากระยะทางที่พาผู้โดยสารเท่านั้น ไม่รวมระยะขับไปรับ เพราะระบบไม่ได้บันทึกระยะช่วงนั้น)
// ช่วงวัน/สัปดาห์/เดือน ตัดตามเวลาไทย (UTC+7) — server บน Railway รันเวลา UTC ถ้าใช้เวลาเครื่องตรง ๆ จะตัดวันผิด 7 ชม.
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

const CATEGORIES = ["FUEL", "TIRE", "ENGINE_OIL", "MAINTENANCE", "REPAIR", "OTHER"];
const BKK_OFFSET_MS = 7 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

const PERIODS = {
  day: { buckets: 7 },
  week: { buckets: 8 },
  month: { buckets: 6 },
};

const round2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// ตั้งค่ารถ
// ---------------------------------------------------------------------------
function optionalNumber(value, label, { min, max }) {
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw ApiError.badRequest(`${label}ต้องอยู่ระหว่าง ${min}–${max}`);
  return n;
}

async function updateVehicle(driverId, { fuelKmPerLiter, fuelPricePerLiter }) {
  const data = {};
  if (fuelKmPerLiter !== undefined) {
    data.fuelKmPerLiter = optionalNumber(fuelKmPerLiter, "อัตราสิ้นเปลือง (กม./ลิตร) ", { min: 5, max: 150 });
  }
  if (fuelPricePerLiter !== undefined) {
    data.fuelPricePerLiter = optionalNumber(fuelPricePerLiter, "ราคาน้ำมัน (บาท/ลิตร) ", { min: 1, max: 200 });
  }
  const driver = await prisma.driver.update({
    where: { id: driverId },
    data,
    select: { fuelKmPerLiter: true, fuelPricePerLiter: true },
  });
  return driver;
}

// ---------------------------------------------------------------------------
// รายจ่าย
// ---------------------------------------------------------------------------
function cleanExpense(body, { partial }) {
  const out = {};
  const has = (k) => !partial || body[k] !== undefined;

  if (has("category")) {
    if (!CATEGORIES.includes(body.category)) throw ApiError.badRequest("หมวดรายจ่ายไม่ถูกต้อง");
    out.category = body.category;
  }
  if (has("amount")) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      throw ApiError.badRequest("จำนวนเงินต้องมากกว่า 0 และไม่เกิน 100,000 บาท");
    }
    out.amount = round2(amount);
  }
  if (has("occurredAt")) {
    const at = body.occurredAt ? new Date(body.occurredAt) : new Date();
    if (Number.isNaN(at.getTime())) throw ApiError.badRequest("วันที่ไม่ถูกต้อง");
    if (at.getTime() > Date.now() + DAY_MS) throw ApiError.badRequest("วันที่ต้องไม่เกินวันนี้");
    out.occurredAt = at;
  }
  if (body.note !== undefined) {
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (note.length > 200) throw ApiError.badRequest("บันทึกยาวเกิน 200 ตัวอักษร");
    out.note = note || null;
  }
  if (body.liters !== undefined) out.liters = optionalNumber(body.liters, "จำนวนลิตร ", { min: 0.1, max: 100 });
  if (body.odometerKm !== undefined) out.odometerKm = optionalNumber(body.odometerKm, "เลขไมล์ ", { min: 0, max: 2000000 });
  return out;
}

async function listExpenses(driverId, { limit = 100 } = {}) {
  return prisma.driverExpense.findMany({
    where: { driverId },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(Number(limit) || 100, 500),
  });
}

async function createExpense(driverId, body) {
  const data = cleanExpense(body, { partial: false });
  // ลิตร/เลขไมล์มีความหมายเฉพาะการเติมน้ำมัน
  if (data.category !== "FUEL") {
    data.liters = null;
    data.odometerKm = null;
  }
  return prisma.driverExpense.create({ data: { ...data, driverId } });
}

async function findOwnExpense(driverId, id) {
  const expense = await prisma.driverExpense.findUnique({ where: { id } });
  if (!expense || expense.driverId !== driverId) throw ApiError.notFound("ไม่พบรายการนี้");
  return expense;
}

async function updateExpense(driverId, id, body) {
  const existing = await findOwnExpense(driverId, id);
  const data = cleanExpense(body, { partial: true });
  if ((data.category ?? existing.category) !== "FUEL") {
    data.liters = null;
    data.odometerKm = null;
  }
  return prisma.driverExpense.update({ where: { id }, data });
}

async function deleteExpense(driverId, id) {
  await findOwnExpense(driverId, id);
  await prisma.driverExpense.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// อัตราสิ้นเปลืองจริง: เติมเต็มถังทุกครั้ง → ระยะทางระหว่างการเติมสองครั้ง ÷ ลิตรที่เติมครั้งหลัง
// ---------------------------------------------------------------------------
function measuredKmPerLiter(fuelEntries) {
  const points = fuelEntries
    .filter((e) => e.odometerKm != null && e.liters != null && e.liters > 0)
    .sort((a, b) => a.odometerKm - b.odometerKm);
  let km = 0;
  let liters = 0;
  for (let i = 1; i < points.length; i++) {
    const distance = points[i].odometerKm - points[i - 1].odometerKm;
    if (distance <= 0) continue; // เลขไมล์ซ้ำ/ถอยหลัง = จดผิด ข้ามคู่นี้
    km += distance;
    liters += points[i].liters;
  }
  return liters > 0 ? round2(km / liters) : null;
}

// ---------------------------------------------------------------------------
// ช่วงเวลาตามเวลาไทย
// ---------------------------------------------------------------------------
// เวลา UTC ของ "เที่ยงคืนเวลาไทย" ของวันที่ y/m/d (เดือนเริ่ม 0)
const bkkMidnight = (y, m, d) => new Date(Date.UTC(y, m, d) - BKK_OFFSET_MS);

function bkkParts(date) {
  const t = new Date(date.getTime() + BKK_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), dow: t.getUTCDay() };
}

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function buildBuckets(period, now = new Date()) {
  const { y, m, d, dow } = bkkParts(now);
  const count = PERIODS[period].buckets;
  const buckets = [];

  for (let i = count - 1; i >= 0; i--) {
    let start;
    let end;
    let label;
    if (period === "day") {
      start = bkkMidnight(y, m, d - i);
      end = bkkMidnight(y, m, d - i + 1);
      const p = bkkParts(start);
      label = `${p.d} ${THAI_MONTHS[p.m]}`;
    } else if (period === "week") {
      const mondayOffset = (dow + 6) % 7; // สัปดาห์เริ่มวันจันทร์
      start = bkkMidnight(y, m, d - mondayOffset - 7 * i);
      end = bkkMidnight(y, m, d - mondayOffset - 7 * i + 7);
      const p = bkkParts(start);
      label = `${p.d} ${THAI_MONTHS[p.m]}`;
    } else {
      start = bkkMidnight(y, m - i, 1);
      end = bkkMidnight(y, m - i + 1, 1);
      const p = bkkParts(start);
      label = `${THAI_MONTHS[p.m]} ${String(p.y + 543).slice(2)}`;
    }
    buckets.push({ start, end, label });
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// สรุปรายรับ–รายจ่ายรายวัน/สัปดาห์/เดือน
// ---------------------------------------------------------------------------
async function getSummary(driverId, period = "day") {
  if (!PERIODS[period]) throw ApiError.badRequest("period ต้องเป็น day, week หรือ month");

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { fuelKmPerLiter: true, fuelPricePerLiter: true },
  });
  if (!driver) throw ApiError.notFound("Driver not found");

  const buckets = buildBuckets(period);
  const from = buckets[0].start;
  const to = buckets[buckets.length - 1].end;

  const [trips, expenses, allFuel] = await Promise.all([
    prisma.serviceRequest.findMany({
      where: { driverId, status: "COMPLETED", completedAt: { gte: from, lt: to } },
      select: { fare: true, distanceKm: true, completedAt: true },
    }),
    prisma.driverExpense.findMany({
      where: { driverId, occurredAt: { gte: from, lt: to } },
      select: { category: true, amount: true, occurredAt: true },
    }),
    // ทุกการเติมน้ำมันที่เคยจด (ไม่จำกัดช่วง) ใช้คำนวณอัตราสิ้นเปลืองจริงและราคาน้ำมันล่าสุด
    prisma.driverExpense.findMany({
      where: { driverId, category: "FUEL" },
      select: { amount: true, liters: true, odometerKm: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
    }),
  ]);

  const measured = measuredKmPerLiter(allFuel);
  const lastFill = allFuel.find((e) => e.liters > 0);
  const kmPerLiter = measured ?? driver.fuelKmPerLiter ?? null;
  const pricePerLiter = driver.fuelPricePerLiter ?? (lastFill ? round2(lastFill.amount / lastFill.liters) : null);
  const costPerKm = kmPerLiter && pricePerLiter ? pricePerLiter / kmPerLiter : null;

  const inBucket = (date, b) => date >= b.start && date < b.end;
  const series = buckets.map((b) => {
    const bTrips = trips.filter((t) => inBucket(t.completedAt, b));
    const bExpenses = expenses.filter((e) => inBucket(e.occurredAt, b));
    const income = bTrips.reduce((s, t) => s + (t.fare ?? 0), 0);
    const distanceKm = bTrips.reduce((s, t) => s + (t.distanceKm ?? 0), 0);
    const fuelRecorded = bExpenses.filter((e) => e.category === "FUEL").reduce((s, e) => s + e.amount, 0);
    const otherExpenses = bExpenses.filter((e) => e.category !== "FUEL").reduce((s, e) => s + e.amount, 0);
    const fuelEstimate = costPerKm != null ? distanceKm * costPerKm : null;

    let fuelCost = 0;
    let fuelSource = "none";
    if (fuelRecorded > 0) {
      fuelCost = fuelRecorded;
      fuelSource = "recorded";
    } else if (fuelEstimate != null && distanceKm > 0) {
      fuelCost = fuelEstimate;
      fuelSource = "estimated";
    }
    const expensesTotal = fuelCost + otherExpenses;

    return {
      label: b.label,
      start: b.start,
      end: b.end,
      trips: bTrips.length,
      distanceKm: round2(distanceKm),
      income: round2(income),
      fuelCost: round2(fuelCost),
      fuelSource,
      fuelEstimate: fuelEstimate != null ? round2(fuelEstimate) : null,
      otherExpenses: round2(otherExpenses),
      expenses: round2(expensesTotal),
      profit: round2(income - expensesTotal),
    };
  });

  const sum = (k) => round2(series.reduce((s, b) => s + b[k], 0));
  const byCategory = CATEGORIES.map((category) => ({
    category,
    amount: round2(expenses.filter((e) => e.category === category).reduce((s, e) => s + e.amount, 0)),
  })).filter((c) => c.amount > 0);

  return {
    period,
    series,
    totals: {
      trips: series.reduce((s, b) => s + b.trips, 0),
      distanceKm: sum("distanceKm"),
      income: sum("income"),
      fuelCost: sum("fuelCost"),
      otherExpenses: sum("otherExpenses"),
      expenses: sum("expenses"),
      profit: sum("profit"),
    },
    byCategory,
    fuel: {
      kmPerLiterSetting: driver.fuelKmPerLiter,
      pricePerLiterSetting: driver.fuelPricePerLiter,
      measuredKmPerLiter: measured,
      kmPerLiter,
      pricePerLiter,
      costPerKm: costPerKm != null ? round2(costPerKm) : null,
    },
  };
}

module.exports = {
  CATEGORIES,
  updateVehicle,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  measuredKmPerLiter,
  buildBuckets,
  getSummary,
};
