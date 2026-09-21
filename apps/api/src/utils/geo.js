// MVP geo helpers.
// NOTE: proposal บทที่ 3.2 ระบุให้ตรวจขอบเขตมหาวิทยาลัยด้วย PostGIS (polygon จริง) —
// ตอนนี้ยังไม่มีข้อมูลขอบเขตแคมปัสจริง จึงใช้ "ระยะทางจากจุดศูนย์กลางแคมปัส" เป็นค่าประมาณไปก่อน
// ค่อยเปลี่ยนเป็น ST_Contains กับ polygon จริงทีหลังโดยไม่ต้องแก้ signature ของฟังก์ชันนี้

const CAMPUS_CENTER = { lat: 14.0206, lng: 99.9679 };
const CAMPUS_RADIUS_KM = 2; // รัศมีโดยประมาณของพื้นที่ มก. กำแพงแสน

const FLAT_CAMPUS_FARE = 20; // บาท เหมาจ่ายในมหาวิทยาลัย ตาม proposal 3.1.1.1 ข้อ 6
const OUT_OF_CAMPUS_RATE_PER_KM = 10; // บาท/กม. — ค่าเริ่มต้น (ของจริงผู้ให้บริการกำหนดเองตาม proposal)
const OUT_OF_CAMPUS_MIN_FARE = 20;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// ระยะทางระหว่างสองพิกัด (กม.) ด้วยสูตร Haversine
function distanceKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.asin(Math.sqrt(h));
}

function isWithinCampus(point) {
  return distanceKm(CAMPUS_CENTER, point) <= CAMPUS_RADIUS_KM;
}

function calculateFare({ pickup, destination }) {
  const withinCampus = isWithinCampus(pickup) && isWithinCampus(destination);
  const distance = distanceKm(pickup, destination);

  if (withinCampus) {
    return { isWithinCampus: true, distanceKm: distance, fare: FLAT_CAMPUS_FARE };
  }

  const fare = Math.max(OUT_OF_CAMPUS_MIN_FARE, Math.round(distance * OUT_OF_CAMPUS_RATE_PER_KM));
  return { isWithinCampus: false, distanceKm: distance, fare };
}

module.exports = { distanceKm, isWithinCampus, calculateFare, CAMPUS_CENTER };
