import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { getTokenRole } from "./auth";
import { socket, connectWithAuth } from "./socket";

const POLL_MS = 6000;

// แชตของทริปหนึ่ง (ใช้ได้ทั้งผู้โดยสารและคนขับ) — ข้อความใหม่มาทาง socket ("trip:message") + ดึงซ้ำเป็นระยะกันพลาดตอน socket หลุด
//  - reading = true : อยู่หน้าแชต → ดึงผ่าน GET /messages ซึ่งทำเครื่องหมายว่าอ่านแล้วให้ด้วย
//  - reading = false: ปุ่มแชตบนหน้าทริป → ใช้นับข้อความที่ยังไม่ได้อ่านเท่านั้น
export function useTripChat(requestId, { reading = false } = {}) {
  const myRole = getTokenRole();
  const [messages, setMessages] = useState(null); // null = กำลังโหลด
  const [open, setOpen] = useState(true);
  const readingRef = useRef(reading);
  readingRef.current = reading;

  const refresh = useCallback(() => {
    if (!requestId) return;
    api
      .get(`/service-requests/${requestId}/messages`, { params: readingRef.current ? {} : { peek: 1 } })
      .then(({ data }) => {
        setMessages(data.messages);
        setOpen(data.open);
      })
      .catch(() => setMessages((m) => m ?? []));
  }, [requestId]);

  useEffect(() => {
    if (!requestId) return undefined;
    function join() {
      socket.emit("service-request:watch", requestId);
    }
    function onMessage(m) {
      if (m.serviceRequestId !== requestId) return;
      setMessages((list) => (list?.some((x) => x.id === m.id) ? list : [...(list ?? []), m]));
      if (readingRef.current && m.senderRole !== myRole) refresh(); // เปิดอ่านอยู่ = บอก server ว่าอ่านแล้ว
    }
    socket.on("connect", join);
    socket.on("trip:message", onMessage);
    connectWithAuth();
    if (socket.connected) join();
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      socket.off("connect", join);
      socket.off("trip:message", onMessage);
      clearInterval(timer);
    };
  }, [requestId, myRole, refresh]);

  const send = useCallback(
    async (body) => {
      const { data } = await api.post(`/service-requests/${requestId}/messages`, { body });
      setMessages((list) => (list?.some((x) => x.id === data.id) ? list : [...(list ?? []), data]));
      return data;
    },
    [requestId]
  );

  // ปุ่มบนหน้าทริปไม่ได้เรียกแบบ "อ่าน" — ข้อความของอีกฝั่งที่ยังไม่มี readAt = ยังไม่ได้อ่าน
  const unread = (messages ?? []).filter((m) => m.senderRole !== myRole && !m.readAt).length;
  return { messages, open, send, unread, myRole, refresh };
}
