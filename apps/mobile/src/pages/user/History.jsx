import { useEffect, useState } from "react";
import { Bike, Loader2 } from "lucide-react";
import Screen from "../../components/layout/Screen";
import BottomNav from "../../components/layout/BottomNav";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { api } from "../../lib/api";

const STATUS_LABEL = {
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
  PENDING: "รอคนขับ",
  ACCEPTED: "คนขับกำลังมา",
  IN_PROGRESS: "กำลังเดินทาง",
};

export default function History() {
  const [trips, setTrips] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/service-requests/mine")
      .then(({ data }) => setTrips(data))
      .catch((err) => setError(err.response?.data?.message || "โหลดประวัติไม่สำเร็จ"));
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <Screen className="gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">History</h1>
          <p className="text-sm text-slate-500">ประวัติการเดินทางทั้งหมด</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!trips && !error && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
          </div>
        )}

        {trips && trips.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีประวัติการเดินทาง</p>
        )}

        <div className="flex flex-col gap-3">
          {trips?.map((trip) => (
            <Card key={trip.id} className="gap-2 shadow-none ring-slate-100">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">{formatDateTime(trip.requestedAt)}</p>
                <Badge tone={trip.status === "COMPLETED" ? "success" : trip.status === "CANCELLED" ? "danger" : "info"}>
                  {STATUS_LABEL[trip.status] ?? trip.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{trip.pickupAddress ?? "-"}</p>
                  <p className="text-sm font-medium text-slate-800">{trip.destinationAddress ?? "-"}</p>
                </div>
                <p className="text-lg font-bold text-emerald-600">{trip.fare ?? 0} ฿</p>
              </div>
              {trip.driver && (
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  <Bike className="h-3.5 w-3.5" /> {trip.driver.fullName}
                </p>
              )}
            </Card>
          ))}
        </div>
      </Screen>
      <BottomNav />
    </div>
  );
}

function formatDateTime(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
  return `${date} · ${time}`;
}
