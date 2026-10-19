// ชั้นแบรนด์ของพื้นที่: สร้างชุดสี 50–950 จากสีแบรนด์ของพื้นที่ (Area.brandColor) แล้วตั้งเป็นตัวแปร CSS
// tailwind.config.js ผูกสี "brand" (และชื่อเดิม "emerald" ที่หน้าเก่ายังใช้) เข้ากับตัวแปรชุดนี้
// เปลี่ยนพื้นที่ = เปลี่ยนสีทั้งแอปในที่เดียว ไม่มีหน้าไหนฝังสีของ มก. ไว้เอง
export const DEFAULT_BRAND = "#006664"; // เขียว มก. (ค่าชั่วคราว — เทียบกับคู่มือ CI ก่อนใช้จริง) ต้องตรงกับค่าเริ่มต้นใน schema.prisma

// สัดส่วนสีแบรนด์ที่ผสมกับขาว (เฉดอ่อน) หรือดำ (เฉดเข้ม); 600 = สีแบรนด์ตรงๆ
const STEPS = {
  50: ["white", 0.06],
  100: ["white", 0.13],
  200: ["white", 0.26],
  300: ["white", 0.44],
  400: ["white", 0.64],
  500: ["white", 0.84],
  600: ["white", 1],
  700: ["black", 0.84],
  800: ["black", 0.68],
  900: ["black", 0.52],
  950: ["black", 0.36],
};

function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(rgb, base, amount) {
  const other = base === "white" ? 255 : 0;
  return rgb.map((c) => Math.round(c * amount + other * (1 - amount)));
}

export function brandScale(hex) {
  const rgb = parseHex(hex) ?? parseHex(DEFAULT_BRAND);
  return Object.fromEntries(Object.entries(STEPS).map(([step, [base, amount]]) => [step, mix(rgb, base, amount)]));
}

export function applyBrand(hex) {
  const root = document.documentElement;
  for (const [step, rgb] of Object.entries(brandScale(hex))) root.style.setProperty(`--brand-${step}`, rgb.join(" "));
  // สีแถบสถานะของเบราว์เซอร์/แอป Android ให้ตรงกับแถบหัวของพื้นที่
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", parseHex(hex) ? hex : DEFAULT_BRAND);
}
