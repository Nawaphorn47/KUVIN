import { useEffect, useState } from "react";
import { api } from "./api";
import { socket } from "./socket";
import { getToken } from "./auth";

const POLL_MS = 20 * 1000;

// จำนวนแจ้งเตือนที่ยังไม่อ่าน — poll เป็นระยะ (ผู้โดยสารไม่ได้ต่อ socket ค้างไว้ตลอดเวลาเหมือนคนขับที่ออนไลน์
// จะพึ่ง socket อย่างเดียวไม่ได้) + รีเฟรชทันทีถ้ามี "notification:new" เข้ามาสด เผื่อ socket ต่ออยู่แล้วพอดี
export function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelled = false;
    function load() {
      api
        .get("/notifications")
        .then(({ data }) => !cancelled && setCount(data.filter((n) => !n.isRead).length))
        .catch(() => {});
    }
    load();
    const timer = setInterval(load, POLL_MS);
    socket.on("notification:new", load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      socket.off("notification:new", load);
    };
  }, []);

  return count;
}
