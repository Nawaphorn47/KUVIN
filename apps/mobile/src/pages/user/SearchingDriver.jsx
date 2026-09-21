import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Route, BellRing, Bike, AlertTriangle } from "lucide-react";
import Button from "../../components/ui/Button";
import { api } from "../../lib/api";
import { socket, connectWithAuth } from "../../lib/socket";

const steps = [
  { icon: Search, label: "ค้นหาคนขับใกล้เคียง" },
  { icon: Route, label: "จับคู่เส้นทาง" },
  { icon: BellRing, label: "แจ้งเตือนคนขับ" },
];

export default function SearchingDriver() {
  const navigate = useNavigate();
  const location = useLocation();
  const request = location.state?.request;
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!request?.id) {
      navigate("/home");
      return;
    }

    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    let done = false;

    function react(updated) {
      if (done) return;
      if (updated.status === "ACCEPTED") {
        done = true;
        navigate("/driver-arriving", { state: { request: updated } });
      } else if (updated.status === "CANCELLED") {
        done = true;
        setError(updated.cancelReason || "ไม่พบคนขับว่างในขณะนี้");
      }
    }

    connectWithAuth();
    socket.emit("user:join");
    socket.emit("service-request:watch", request.id);

    function handleStatus(updated) {
      if (updated.id !== request.id) return;
      react(updated);
    }
    socket.on("service-request:status", handleStatus);

    // เช็คสถานะจริงทันทีตอน mount — กันพลาด event ที่อาจเกิดขึ้นไปแล้วก่อนหน้านี้จะ join room ทัน
    // (เช่น backend ยกเลิกคำขอทันทีตอนสร้างเพราะไม่มีคนขับว่างในคิวเลย ถ้าไม่เช็คซ้ำจะค้างหมุนตลอดไป)
    react(request);
    api
      .get(`/service-requests/${request.id}`)
      .then(({ data }) => react(data))
      .catch(() => {});

    return () => {
      clearInterval(interval);
      socket.off("service-request:status", handleStatus);
    };
  }, [request?.id, navigate]);

  async function handleCancel() {
    if (request?.id) {
      try {
        await api.post(`/service-requests/${request.id}/cancel`);
      } catch {
        // ยกเลิกไม่สำเร็จก็ไม่เป็นไร กลับหน้าหลักได้เลย
      }
    }
    navigate("/home");
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-white px-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertTriangle className="h-9 w-9" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">ไม่พบคนขับว่าง</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button onClick={() => navigate("/search-destination")}>ลองเรียกใหม่อีกครั้ง</Button>
          <Button variant="ghost" onClick={() => navigate("/home")}>
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-white px-8 text-center">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400" />
        <span className="absolute inset-3 animate-pulse-ring rounded-full bg-emerald-400 [animation-delay:0.3s]" />
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white"
        >
          <Bike className="h-9 w-9" />
        </motion.span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">กำลังค้นหาวิน</h1>
        <p className="mt-2 text-sm text-blue-500">ระบบกำลังเสนองานให้คนขับตามคิว รอสักครู่</p>
        <p className="mt-1 text-xs text-slate-400">{seconds} วินาทีที่ผ่านมา</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {steps.map(({ icon: Icon, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-left"
          >
            <Icon className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-blue-600">{label}</span>
          </motion.div>
        ))}
      </div>

      <Button variant="dark" onClick={handleCancel}>
        ยกเลิก
      </Button>
    </div>
  );
}
