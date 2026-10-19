// ตัวช่วยเรียก API ตรง ๆ สำหรับ "เตรียมข้อมูล" ของเทสต์ (สร้างคนขับที่อนุมัติแล้ว ฯลฯ) — ส่วนที่ต้องทดสอบจริงทำผ่าน UI
const { API_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = require("./env");

async function call(method, path, { token, body, form } = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${data.error ?? data.message ?? ""}`);
  return data;
}

// เบอร์ทดสอบไม่ซ้ำกันทุกรอบ: 0990 + 6 หลักท้ายของเวลา
let seq = 0;
function testPhone() {
  seq += 1;
  return `0990${String(Date.now()).slice(-5)}${seq % 10}`;
}

// รูปทดสอบ PNG สีทึบ 96x96 สร้างเองด้วย zlib (ผ่านการตรวจ magic bytes ของ API และเห็นชัดในภาพประกอบรายงาน)
function makePng(width = 96, height = 96, [r, g, b] = [0, 102, 100]) {
  const zlib = require('zlib');
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const PNG = makePng();

async function otpLogin(phone, fullName = "ผู้ทดสอบ") {
  const { testCode } = await call("POST", "/auth/otp/request", { body: { phone } });
  const step = await call("POST", "/auth/otp/verify", { body: { phone, code: testCode } });
  if (step.token) return { token: step.token, user: step.user };
  const done = await call("POST", "/auth/otp/complete", { body: { ticket: step.ticket, fullName } });
  return { token: done.token, user: done.user };
}

async function adminToken() {
  if (!ADMIN_PASSWORD) throw new Error("ไม่พบ SEED_ADMIN_PASSWORD (ตั้ง ADMIN_EMAIL / ADMIN_PASSWORD หรือมี .env ที่ root)");
  const { token } = await call("POST", "/auth/admin/login", { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  return token;
}

// สร้างคนขับประเภท "บุคคลทั่วไป" ที่แอดมินอนุมัติแล้ว พร้อมใช้งานทันที — คืน token ของโหมดคนขับ
async function createApprovedDriver({ fullName = "คนขับ ทดสอบ", plate = "ทด 1234" } = {}) {
  const phone = testPhone();
  const { token: userToken } = await otpLogin(phone, fullName);
  const areas = await call("GET", "/areas");
  const area = areas[0];
  const created = await call("POST", "/auth/user/become-driver", {
    token: userToken,
    body: { areaId: area.id, licensePlate: plate, vehicleModel: "Honda Wave 125", driverType: "PUBLIC" },
  });
  const driverToken = created.token;
  const docs = {};
  for (const key of ["photoUrl", "idCardPhotoUrl", "driverLicensePhotoUrl", "vehiclePhotoUrl", "platePhotoUrl"]) {
    const form = new FormData();
    form.append("file", new Blob([PNG], { type: "image/png" }), `${key}.png`);
    docs[key] = (await call("POST", "/drivers/me/documents", { token: driverToken, form })).ref;
  }
  await call("POST", "/drivers/me/verify", { token: driverToken, body: docs });
  const admin = await adminToken();
  await call("POST", `/admin/drivers/${created.driver.id}/approve`, { token: admin });
  return { phone, userToken, driverToken, driverId: created.driver.id, areaId: area.id, fullName };
}


// ผู้โดยสารที่ยืนยันตัวตนครบ (เบอร์ OTP + เซลฟี่) พร้อมเรียกวินทันที
async function createVerifiedPassenger(fullName = 'ผู้โดยสาร ทดสอบ') {
  const auth = await otpLogin(testPhone(), fullName);
  const form = new FormData();
  form.append('file', new Blob([PNG], { type: 'image/png' }), 'selfie.png');
  await call('POST', '/users/me/selfie', { token: auth.token, form });
  return auth;
}

// เรียกวินแล้วให้คนขับรับงานผ่าน API (ข้ามหน้าจอ) — ใช้เตรียมทริปให้เทสต์ที่ไม่ได้ทดสอบขั้นตอนนี้
// คืนทริปสถานะ ACCEPTED (คนขับต้องเป็นคนเดียวที่ออนไลน์อยู่ในคิว)
async function startAcceptedTrip(passengerToken, driver) {
  await call('PATCH', '/drivers/me/availability', { token: driver.driverToken, body: { isOnline: true } });
  const landmarks = await call("GET", `/landmarks?areaId=${driver.areaId}`);
  const request = await call('POST', '/service-requests', {
    token: passengerToken,
    body: { areaId: driver.areaId, pickupLat: 14.023, pickupLng: 99.9739, pickupAddress: 'จุดทดสอบ', destinationLandmarkId: landmarks[0].id },
  });
  return call("POST", `/service-requests/${request.id}/accept`, { token: driver.driverToken });
}

async function driverOffline(driver) {
  await call('PATCH', '/drivers/me/availability', { token: driver.driverToken, body: { isOnline: false } }).catch(() => {});
}

module.exports = { call, testPhone, PNG, otpLogin, adminToken, createApprovedDriver, createVerifiedPassenger, startAcceptedTrip, driverOffline };
