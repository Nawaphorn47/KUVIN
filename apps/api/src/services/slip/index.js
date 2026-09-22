// เลือกผู้ให้บริการตรวจสลิปจาก env
//   SLIP_PROVIDER=slipok  → SlipOK จริง (ต้องตั้ง SLIPOK_API_KEY, SLIPOK_BRANCH_ID)
//   SLIP_PROVIDER=mock    → ตัวจำลอง (dev เท่านั้น — ดู mock.provider.js)
//   SLIP_PROVIDER=off     → ปิดการตรวจอัตโนมัติ (ผู้โดยสารจ่ายแล้วให้คนขับกดยืนยันเองเหมือนเดิม)
// ไม่ตั้ง: dev = mock, production = off (ไม่เผลอเปิดตัวจำลองบนระบบจริง)
const isProduction = process.env.NODE_ENV === "production";
const choice = (process.env.SLIP_PROVIDER || (isProduction ? "off" : "mock")).toLowerCase();

let provider = null;

if (choice === "slipok") {
  provider = require("./slipok.provider").createProvider({
    apiKey: process.env.SLIPOK_API_KEY,
    branchId: process.env.SLIPOK_BRANCH_ID,
  });
} else if (choice === "mock") {
  if (isProduction) throw new Error("SLIP_PROVIDER=mock ใช้ใน production ไม่ได้ (รับสลิปอะไรก็ได้)");
  provider = require("./mock.provider");
} else if (choice !== "off") {
  throw new Error(`SLIP_PROVIDER ไม่รู้จัก: "${choice}" (ใช้ slipok | mock | off)`);
}

module.exports = {
  isEnabled: () => provider !== null,
  providerName: () => provider?.name ?? "off",
  verify: (file, expected) => provider.verify(file, expected),
};
