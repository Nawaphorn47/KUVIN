// ขอบเขต/จุดกลางมาจากพื้นที่ให้บริการที่เลือกอยู่ (AreaContext) — ต้องตรงกับ apps/api/src/utils/geo.js
// DEFAULT_CENTER ใช้แค่ตอนยังโหลดพื้นที่ไม่เสร็จ (แผนที่ต้องมีจุดเริ่ม) — พื้นที่แรกของระบบ มก. กำแพงแสน
export const DEFAULT_CENTER = { lat: 14.023, lng: 99.9739 };

export function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export const areaCenter = (area) => (area ? { lat: area.centerLat, lng: area.centerLng } : DEFAULT_CENTER);

// จุดนี้อยู่ในระยะที่วินของพื้นที่ไปรับได้ไหม (ไม่มีพื้นที่ = ถือว่าไม่อยู่)
export const isWithinService = (area, point) =>
  Boolean(area && point) && distanceKm(areaCenter(area), point) <= area.serviceRadiusKm;
