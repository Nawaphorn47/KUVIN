import { useEffect, useState } from "react";
import { api } from "./api";

const POLL_MS = 3000;

// ดึงภาพรวมคิวรับงาน (GET /service-requests/queue) แบบ poll ทุก 3 วิ — ใช้ร่วมกันระหว่างหน้า DriverHome
// (แสดงแบบย่อ) กับหน้า QueueStatus (แสดงเต็ม) จะได้ไม่ต้องเขียน fetch logic ซ้ำ 2 ที่
export function useQueueOverview(enabled) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) {
      setOverview(null);
      return;
    }
    let cancelled = false;

    function load() {
      api
        .get("/service-requests/queue")
        .then(({ data }) => {
          if (!cancelled) setOverview(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err.response?.data?.message || "โหลดข้อมูลคิวไม่สำเร็จ");
        });
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);

  return { overview, error };
}
