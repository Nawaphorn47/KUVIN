import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, ChevronRight, AlertTriangle, Clock } from "lucide-react";
import Screen from "../../components/layout/Screen";
import TopBar from "../../components/layout/TopBar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import MapView from "../../components/shared/MapView";
import RouteSummary from "../../components/shared/RouteSummary";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { CAMPUS_CENTER, isNearCampus } from "../../lib/geo";

// ปลายทางเป็นได้ทั้งสถานที่ในระบบ (landmarkId) หรือจุดที่ผู้ใช้ปักหมุดเอง (lat/lng)
function destinationPayload(destination) {
  return destination.landmarkId
    ? { destinationLandmarkId: destination.landmarkId }
    : { destinationLat: destination.lat, destinationLng: destination.lng, destinationAddress: destination.name };
}

export default function ConfirmBooking() {
  const navigate = useNavigate();
  const { booking } = useApp();
  const destination = booking.destination;
  const hasSession = Boolean(getToken());

  const [pickupPoint, setPickupPoint] = useState(null); // { lat, lng } จุดรับ (เริ่มจาก GPS แล้วลากหมุดปรับได้)
  const [pickupLabel, setPickupLabel] = useState(booking.pickup);
  const [pickupNote, setPickupNote] = useState("");
  const [estimate, setEstimate] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getPickupCoords().then(({ point, note }) => {
      setPickupPoint(point);
      setPickupNote(note);
    });
  }, []);

  const destKey = destination ? (destination.landmarkId ?? `${destination.lat},${destination.lng}`) : null;
  useEffect(() => {
    if (!destination || !pickupPoint) return undefined;
    let cancelled = false;
    setLoadingEstimate(true);
    api
      .post("/service-requests/estimate", {
        ...destinationPayload(destination),
        pickupLat: pickupPoint.lat,
        pickupLng: pickupPoint.lng,
      })
      .then(({ data }) => !cancelled && setEstimate(data))
      .catch(() => !cancelled && setEstimate(null))
      .finally(() => !cancelled && setLoadingEstimate(false));
    return () => {
      cancelled = true;
    };
    // destKey แทน destination ทั้งก้อน
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destKey, pickupPoint?.lat, pickupPoint?.lng]);

  function handlePickupDrag(point) {
    setPickupPoint(point);
    setPickupLabel("ตำแหน่งที่ปักหมุด");
    setPickupNote("");
  }

  async function handleConfirm() {
    if (!destination || !pickupPoint) return;
    if (!hasSession) {
      setError("กรุณาเข้าสู่ระบบก่อนเรียกวิน");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data: request } = await api.post("/service-requests", {
        ...destinationPayload(destination),
        pickupLat: pickupPoint.lat,
        pickupLng: pickupPoint.lng,
        pickupAddress: pickupLabel,
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
  const durationMin = estimate?.route?.durationMin ?? null;
  const isWithinCampus = estimate?.isWithinCampus ?? true;
  const destPoint = estimate?.destination ?? (destination.lat != null ? destination : null);

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="ยืนยันการเรียกวิน" />
      <Screen className="gap-4 pt-2">
        <div className="flex flex-col gap-1.5">
          <MapView
            height="h-52"
            pickup={pickupPoint}
            destination={destPoint}
            route={estimate?.route?.coordinates}
            onPickupChange={handlePickupDrag}
          />
          <p className="text-center text-xs text-slate-400">
            {pickupNote || "กดค้างที่หมุดสีเขียวแล้วลากเพื่อปรับจุดรับ"}
          </p>
        </div>

        <Card>
          <RouteSummary pickup={pickupLabel} destination={destination.name} />
          <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>{loadingEstimate ? "กำลังคำนวณ..." : distanceKm != null ? `${distanceKm} กม.` : "-"}</span>
            {!loadingEstimate && durationMin != null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> ประมาณ {durationMin} นาที
              </span>
            )}
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
            {isWithinCampus
              ? "เส้นทางภายในมหาวิทยาลัย เหมาจ่าย 20 บาท"
              : "เส้นทางออกนอกมหาวิทยาลัย คิดตามระยะทางบนถนนจริง"}
          </p>
        </Card>

        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-slate-400">ชำระเงิน</p>
              <p className="text-sm font-semibold text-slate-900">เงินสด หรือ QR พร้อมเพย์</p>
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
        <Button onClick={handleConfirm} disabled={submitting || loadingEstimate || !pickupPoint}>
          {submitting ? "กำลังเรียกวิน..." : "เรียกวินมอเตอร์ไซค์"}
        </Button>
      </div>
    </div>
  );
}

// พิกัดจุดรับเริ่มต้นจาก GPS — ถ้าใช้ GPS ไม่ได้ (ไม่อนุญาต/เปิดผ่าน HTTP ในวง LAN) หรืออยู่ไกลจากมหาวิทยาลัยมาก
// จะใช้จุดกลางมหาวิทยาลัยแทน แล้วบอกผู้ใช้ให้ลากหมุดปรับเอง ดีกว่าปล่อยให้เรียกวินไม่ได้เลย
async function getPickupCoords() {
  const fallback = (note) => ({ point: { ...CAMPUS_CENTER }, note });

  if (!("geolocation" in navigator) || !window.isSecureContext) {
    return fallback("ยังใช้ตำแหน่ง GPS ไม่ได้ กรุณาลากหมุดสีเขียวไปยังจุดที่ต้องการให้รับ");
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(
          isNearCampus(point)
            ? { point, note: "" }
            : fallback("ตำแหน่งของคุณอยู่ไกลจากมหาวิทยาลัย จึงใช้จุดกลางมหาวิทยาลัยแทน ลากหมุดเพื่อปรับ")
        );
      },
      () => resolve(fallback("ยังใช้ตำแหน่ง GPS ไม่ได้ กรุณาลากหมุดสีเขียวไปยังจุดที่ต้องการให้รับ")),
      { timeout: 5000 }
    );
  });
}
