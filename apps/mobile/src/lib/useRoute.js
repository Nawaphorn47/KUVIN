import { useEffect, useState } from "react";
import { api } from "./api";

const round = (n, precision) => n.toFixed(precision);

// เส้นทางถนนจริงจาก backend (GET /routes → OSRM) — คืน { coordinates, distanceKm, durationMin, source } หรือ null
// precision = ทศนิยมของพิกัดที่ใช้เทียบว่า "ขยับพอให้ขอเส้นทางใหม่หรือยัง" (4 ≈ 11 ม., 3 ≈ 110 ม. เหมาะกับจุดที่เคลื่อนที่ตลอด)
export function useRoute(from, to, { precision = 4 } = {}) {
  const [route, setRoute] = useState(null);
  const key =
    from && to
      ? `${round(from.lat, precision)},${round(from.lng, precision)}>${round(to.lat, precision)},${round(to.lng, precision)}`
      : null;

  useEffect(() => {
    if (!key) {
      setRoute(null);
      return undefined;
    }
    let cancelled = false;
    api
      .get("/routes", { params: { fromLat: from.lat, fromLng: from.lng, toLat: to.lat, toLng: to.lng } })
      .then(({ data }) => !cancelled && setRoute(data))
      .catch(() => !cancelled && setRoute(null));
    return () => {
      cancelled = true;
    };
    // key ครอบคลุมค่า from/to ที่ใช้จริงแล้ว
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return route;
}
