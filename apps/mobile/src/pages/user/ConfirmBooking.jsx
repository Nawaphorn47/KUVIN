import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, ChevronRight, AlertTriangle } from "lucide-react";
import Screen from "../../components/layout/Screen";
import TopBar from "../../components/layout/TopBar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import MapPlaceholder from "../../components/shared/MapPlaceholder";
import RouteSummary from "../../components/shared/RouteSummary";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import { getToken } from "../../lib/auth";

// จุดศูนย์กลาง มก. กำแพงแสน — ใช้เป็นค่าเริ่มต้นเวลาไม่ได้รับอนุญาต GPS (ต้องตรงกับ CAMPUS_CENTER ใน
// apps/api/src/utils/geo.js) ดีกว่าปล่อยให้เรียกวินไม่ได้เลยเพราะไม่มีพิกัด
const CAMPUS_CENTER = { lat: 14.0206, lng: 99.9679 };

export default function ConfirmBooking() {
  const navigate = useNavigate();
  const { booking } = useApp();
  const destination = booking.destination;
  const hasSession = Boolean(getToken());

  const [estimate, setEstimate] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!destination?.landmarkId) return;
    setLoadingEstimate(true);
    getPickupCoords()
      .then((pickup) =>
        api.post("/service-requests/estimate", {
          destinationLandmarkId: destination.landmarkId,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
        })
      )
      .then(({ data }) => setEstimate(data))
      .catch(() => setEstimate(null))
      .finally(() => setLoadingEstimate(false));
  }, [destination?.landmarkId]);

  async function handleConfirm() {
    if (!destination?.landmarkId) return;
    if (!hasSession) {
      setError("กรุณาเข้าสู่ระบบก่อนเรียกวิน");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const pickup = await getPickupCoords();
      const { data: request } = await api.post("/service-requests", {
        destinationLandmarkId: destination.landmarkId,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
      });
      navigate("/searching-driver", { state: { request } });
    } catch (err) {
      setError(err.response?.data?.message || "เรียกวินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  if (!destination) {
    return (
      <div className="flex flex-1 flex-col">
        <TopBar title="ยืนยันการเรียกวิน" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-sm text-slate-500">ยังไม่ได้เลือกจุดหมาย</p>
          <Button onClick={() => navigate("/search-destination")}>เลือกจุดหมาย</Button>
        </div>
      </div>
    );
  }

  const fare = estimate?.fare ?? null;
  const distanceKm = estimate?.distanceKm ?? null;
  const isWithinCampus = estimate?.isWithinCampus ?? true;

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="ยืนยันการเรียกวิน" />
      <Screen className="gap-4 pt-2">
        <MapPlaceholder height="h-40" />

        <Card>
          <RouteSummary pickup={booking.pickup} destination={destination.name} />
          <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>{loadingEstimate ? "กำลังคำนวณ..." : distanceKm != null ? `${distanceKm} กม.` : "-"}</span>
          </div>
        </Card>

        <Card className="gap-3">
          <h2 className="text-base font-bold text-slate-900">ค่าบริการ</h2>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-base font-bold text-slate-900">ราคารวม</span>
            <span className="text-2xl font-bold text-emerald-600">
              {loadingEstimate ? "..." : fare != null ? `${fare} ฿` : "-"}
            </span>
          </div>
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            {isWithinCampus ? "เส้นทางภายในมหาวิทยาลัย เหมาจ่าย 20 บาท" : "เส้นทางออกนอกมหาวิทยาลัย คิดตามระยะทาง"}
          </p>
        </Card>

        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-slate-400">ชำระเงิน</p>
              <p className="text-sm font-semibold text-slate-900">เงินสด</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-sm font-medium text-slate-400">
            <ChevronRight className="h-4 w-4" />
          </span>
        </Card>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 flex-none" /> {error}
          </p>
        )}

        <p className="text-center text-xs text-slate-400">
          ราคานี้เป็นการประมาณการ อาจมีการปรับตามสภาพจราจรจริง
        </p>
      </Screen>

      <div className="border-t border-slate-100 p-5">
        <Button onClick={handleConfirm} disabled={submitting || loadingEstimate}>
          {submitting ? "กำลังเรียกวิน..." : "🏍️ เรียกวินมอเตอร์ไซค์"}
        </Button>
      </div>
    </div>
  );
}

// พิกัดรับจริงจาก GPS ถ้าอนุญาต ไม่งั้น fallback ไปจุดศูนย์กลางแคมปัส — ดีกว่าปล่อยให้เรียกวินไม่ได้เลย
// เพราะ browser ไม่มี geolocation หรือผู้ใช้ยังไม่กดอนุญาต
async function getPickupCoords() {
  if (!("geolocation" in navigator)) return CAMPUS_CENTER;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(CAMPUS_CENTER),
      { timeout: 5000 }
    );
  });
}
