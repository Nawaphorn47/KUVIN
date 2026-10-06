// geo helpers — ค่าโดยสารและขอบเขตพื้นที่มาจากแถว Area ของแต่ละพื้นที่ (เดิมฝังค่า มก. กำแพงแสนไว้ในไฟล์นี้)
// NOTE: proposal บทที่ 3.2 ระบุให้ตรวจขอบเขตด้วย PostGIS (polygon จริง) — ตอนนี้ใช้ "รัศมีจากจุดกลางของพื้นที่"
// เป็นค่าประมาณ เพราะยังไม่มีข้อมูลขอบเขตจริง ค่อยเปลี่ยนเป็น ST_Contains กับ polygon ทีหลังได้ที่ isWithinFlatZone จุดเดียว

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

const areaCenter = (area) => ({ lat: area.centerLat, lng: area.centerLng });

// อยู่ในเขตเหมาจ่ายของพื้นที่ (เช่น ในมหาวิทยาลัย)
function isWithinFlatZone(area, point) {
  return distanceKm(areaCenter(area), point) <= area.flatRadiusKm;
}

// จุดนี้อยู่ในระยะที่วินของพื้นที่นี้ไปรับได้
function isWithinService(area, point) {
  return distanceKm(areaCenter(area), point) <= area.serviceRadiusKm;
}

// routeDistanceKm = ระยะทางตามถนนจริงจาก OSRM (ดู routing.js) ถ้าไม่ส่งมาจะใช้ระยะเส้นตรง
function calculateFare(area, { pickup, destination, routeDistanceKm }) {
  const withinFlatZone = isWithinFlatZone(area, pickup) && isWithinFlatZone(area, destination);
  const distance = routeDistanceKm ?? distanceKm(pickup, destination);

  if (withinFlatZone) {
    return { isWithinCampus: true, distanceKm: distance, fare: area.flatFare };
  }

  const fare = Math.max(area.minFare, Math.round(distance * area.ratePerKm));
  return { isWithinCampus: false, distanceKm: distance, fare };
}

module.exports = { distanceKm, areaCenter, isWithinFlatZone, isWithinService, calculateFare };
