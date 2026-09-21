// เส้นทางถนนจริงจาก OSRM (OpenStreetMap) — ใช้ทั้งคำนวณค่าโดยสารตามระยะทางจริงและวาดเส้นทางบนแผนที่
//
// OSRM_BASE_URL ค่าเริ่มต้นคือเซิร์ฟเวอร์สาธิตสาธารณะ (router.project-osrm.org) เหมาะกับการพัฒนา/ทดสอบเท่านั้น
// (ไม่มีการรับประกันความเร็ว/ความพร้อมใช้งาน และมี fair-use limit) ใช้งานจริงควรรัน OSRM เองแล้วตั้ง OSRM_BASE_URL
// ถ้าเรียกไม่สำเร็จ/หมดเวลา จะ fallback เป็นเส้นตรงพร้อม source: "straight" เพื่อไม่ให้เรียกวินไม่ได้เพราะบริการแผนที่ล่ม

const { distanceKm } = require("./geo");

const OSRM_URL = (process.env.OSRM_BASE_URL || "https://router.project-osrm.org").replace(/\/$/, "");
const TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
const FALLBACK_SPEED_KMH = 25; // ใช้ประเมินเวลาเดินทางตอน fallback เท่านั้น

const cache = new Map();

const keyOf = (from, to) => [from.lat, from.lng, to.lat, to.lng].map((n) => n.toFixed(5)).join(",");

function straightLine(from, to) {
  const km = distanceKm(from, to);
  return {
    source: "straight",
    distanceKm: km,
    durationMin: (km / FALLBACK_SPEED_KMH) * 60,
    coordinates: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
  };
}

// คืน { source: "osrm" | "straight", distanceKm, durationMin, coordinates: [[lat, lng], ...] }
async function getRoute(from, to) {
  const key = keyOf(from, to);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  try {
    const url = `${OSRM_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const body = await res.json();
    const route = body.routes?.[0];
    if (body.code !== "Ok" || !route) throw new Error(`OSRM ${body.code}`);

    const value = {
      source: "osrm",
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    };

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (err) {
    console.warn(`routing fallback to straight line: ${err.message}`);
    return straightLine(from, to);
  }
}

module.exports = { getRoute };
