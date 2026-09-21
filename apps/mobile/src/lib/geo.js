// พิกัดจริงของ มก. กำแพงแสนจาก OpenStreetMap — ต้องตรงกับ CAMPUS_CENTER ใน apps/api/src/utils/geo.js
export const CAMPUS_CENTER = { lat: 14.023, lng: 99.9739 };

// ถ้า GPS บอกว่าอยู่ไกลจากมหาวิทยาลัยเกินนี้ (เช่นพิกัดจาก IP ของโน้ตบุ๊ก/อยู่ต่างจังหวัด) จะใช้จุดกลางมหาวิทยาลัยเป็นจุดรับแทน
export const NEAR_CAMPUS_KM = 15;

export function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export const isNearCampus = (p) => distanceKm(CAMPUS_CENTER, p) <= NEAR_CAMPUS_KM;
