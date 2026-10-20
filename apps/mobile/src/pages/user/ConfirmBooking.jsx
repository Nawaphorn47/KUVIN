import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, AlertTriangle, Clock, Hand } from "lucide-react";
import clsx from "clsx";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import MapView from "../../components/shared/MapView";
import RouteSummary from "../../components/shared/RouteSummary";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import { getToken, getTokenRole } from "../../lib/auth";
import { areaCenter, isWithinService } from "../../lib/geo";
import { useArea } from "../../context/AreaContext";

// ปลายทางเป็นได้ทั้งสถานที่ในระบบ (landmarkId) หรือจุดที่ผู้ใช้ปักหมุดเอง (lat/lng)
function destinationPayload(destination) {
  return destination.landmarkId
    ? { destinationLandmarkId: destination.landmarkId }
    : { destinationLat: destination.lat, destinationLng: destination.lng, destinationAddress: destination.name };
}

export default function ConfirmBooking() {
  const navigate = useNavigate();
  const { booking, user, switchMode } = useApp();
  const inDriverMode = getTokenRole() === "driver"; // token โหมดคนขับเรียกวินไม่ได้ (Insufficient role) — ให้สลับก่อน
  const needsVerify = Boolean(user.phone) && (!user.phoneVerified || !user.hasSelfie);
  const [reloadKey, setReloadKey] = useState(0);
  const { area } = useArea();
  const destination = booking.destination;
  const hasSession = Boolean(getToken());

  const [pickupPoint, setPickupPoint] = useState(null); // { lat, lng } จุดรับ (เริ่มจาก GPS แล้วลากหมุดปรับได้)
  const [pickupLabel, setPickupLabel] = useState(booking.pickup);
  const [pickupNote, setPickupNote] = useState("");
  const [estimate, setEstimate] = useState(null);
  const [estimateError, setEstimateError] = useState("");
  const [loadingEstimate, setLoadingEstimate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // รอพื้นที่โหลดเสร็จก่อน — ใช้จุดกลาง/ระยะให้บริการของพื้นที่ที่เลือกเป็นค่าสำรองของจุดรับ
  useEffect(() => {
    if (!area || pickupPoint) return;
    getPickupCoords(area).then(({ point, note }) => {
      setPickupPoint(point);
      setPickupNote(note);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area?.id]);

  const destKey = destination ? (destination.landmarkId ?? `${destination.lat},${destination.lng}`) : null;
  useEffect(() => {
    if (!destination || !pickupPoint) return undefined;
    let cancelled = false;
    setLoadingEstimate(true);
    setEstimateError("");
    api
      .post("/service-requests/estimate", {
        ...destinationPayload(destination),
        areaId: area?.id,
        pickupLat: pickupPoint.lat,
        pickupLng: pickupPoint.lng,
      })
      .then(({ data }) => !cancelled && setEstimate(data))
      .catch((err) => {
        if (cancelled) return;
        setEstimate(null);
        // เช่น จุดรับอยู่นอกพื้นที่ให้บริการ — บอกเหตุผลจาก server ให้ผู้ใช้ลากหมุดใหม่
        setEstimateError(err.response?.data?.message || "");
      })
      .finally(() => !cancelled && setLoadingEstimate(false));
    return () => {
      cancelled = true;
    };
    // destKey แทน destination ทั้งก้อน
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destKey, pickupPoint?.lat, pickupPoint?.lng, reloadKey]);

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
        areaId: area?.id,
        pickupLat: pickupPoint.lat,
        pickupLng: pickupPoint.lng,
        pickupAddress: pickupLabel,
      });
      navigate("/searching-driver", { state: { request } });
    } catch (err) {
      // ยังไม่ได้ยืนยันตัวตน (เบอร์/เซลฟี่) — พาไปทำแล้วกลับมาที่หน้านี้
      const code = err.response?.data?.code;
      if (code === "PHONE_NOT_VERIFIED" || code === "SELFIE_REQUIRED") {
        navigate("/verify-identity", { state: { from: "/confirm-booking" } });
        return;
      }
      setError(err.response?.data?.message || "เรียกวินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  if (!destination) {
    return (
      <div className="flex flex-1 flex-col">
        <TopBar title="เช็กก่อนเรียก" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-base text-slate-600">ยังไม่ได้เลือกว่าจะไปไหน</p>
          <Button onClick={() => navigate("/search-destination")}>เลือกปลายทาง</Button>
        </div>
      </div>
    );
  }

  const fare = estimate?.fare ?? null;
  const distanceKm = estimate?.distanceKm ?? null;
  const durationMin = estimate?.route?.durationMin ?? null;
  const isWithinCampus = estimate?.isWithinCampus ?? true;
  const destPoint = estimate?.destination ?? (destination.lat != null ? destination : null);
  const zone = area ? { ...areaCenter(area), radiusKm: area.flatRadiusKm } : null;
  const canBook = !submitting && !loadingEstimate && Boolean(pickupPoint) && !estimateError;
  const areaName = estimate?.area?.displayName ? ` ${estimate.area.displayName}` : "";
  const bookLabel = fare != null && !estimateError ? `เรียกวินเลย · ${fare} ฿` : "เรียกวินเลย";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TopBar title="เช็กก่อนเรียก" />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <MapView
          height="h-56"
          zone={zone}
          pickup={pickupPoint}
          destination={destPoint}
          route={estimate?.route?.coordinates}
          onPickupChange={handlePickupDrag}
        />
        {/* จุดรับถูกแทนด้วยจุดกลางพื้นที่ (ไม่มี GPS/อยู่ไกล) — เตือนให้เห็นชัด ไม่งั้นผู้ใช้เรียกวินไปโดยไม่รู้ตัว
            แล้วคนขับไปรอผิดที่ */}
        {pickupNote ? (
          <output className="mt-2 flex items-start gap-2 rounded-xl bg-amber-100 px-3 py-2.5 text-sm font-medium text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" /> {pickupNote}
          </output>
        ) : (
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <Hand className="h-4 w-4 flex-none text-brand-600" />
            {pickupPoint ? "จุดรับไม่ตรง? กดค้างที่วงสีแล้วลากไปวางใหม่" : "กำลังหาตำแหน่งของคุณจาก GPS..."}
          </p>
        )}

        <section aria-label="เส้นทาง" className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <RouteSummary pickup={pickupLabel} destination={destination.name} />
          {(loadingEstimate || distanceKm != null) && (
          <p className="tabular mt-3 flex items-center gap-3 border-t border-slate-200 pt-3 text-sm text-slate-600">
            {loadingEstimate ? (
              "กำลังคำนวณเส้นทาง..."
            ) : (
              <>
                {distanceKm != null && <span>{distanceKm} กม.</span>}
                {durationMin != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> ประมาณ {durationMin} นาที
                  </span>
                )}
              </>
            )}
          </p>
          )}
        </section>

        {/* ราคาคือสิ่งที่ต้องรู้ก่อนกด — ตัวเลขใหญ่ที่สุดของหน้า */}
        <section aria-labelledby="fare-title" className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-end justify-between gap-3">
            <h2 id="fare-title" className="pb-1 text-base font-bold text-slate-900">
              ค่าวิน
            </h2>
            <p className="tabular text-right text-slate-900" aria-live="polite">
              {loadingEstimate && <span className="inline-block h-12 w-24 animate-pulse rounded-lg bg-slate-100 align-bottom" />}
              {!loadingEstimate && fare != null && (
                <>
                  <span className="text-fare">{fare}</span>
                  <span className="ml-1 text-xl font-bold">฿</span>
                </>
              )}
              {!loadingEstimate && fare == null && <span className="text-2xl font-bold">-</span>}
            </p>
          </div>
          {estimateError ? (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-here-soft px-3 py-2 text-sm font-medium text-here">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" /> {estimateError}
            </p>
          ) : (
            !loadingEstimate && (
              <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                <span
                  aria-hidden="true"
                  className={clsx(
                    "mt-1 h-3 w-3 flex-none rounded-full border-2 border-brand-600",
                    isWithinCampus ? "border-dashed bg-brand-200" : "bg-white"
                  )}
                />
                {/* อัตราของพื้นที่ที่ให้บริการทริปนี้ (แต่ละพื้นที่ตั้งเองได้) */}
                {isWithinCampus
                  ? `อยู่ในเขตเหมาจ่าย${areaName} จ่ายราคาเดียว ${estimate?.area?.flatFare ?? "-"} บาท`
                  : `ออกนอกเขตเหมาจ่าย คิดตามระยะทางถนนจริง ${estimate?.area?.ratePerKm ?? "-"} บาท/กม.`}
              </p>
            )
          )}
          <p className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
            <Wallet className="h-4 w-4 flex-none text-slate-500" />
            จ่ายตอนถึง · เงินสด หรือสแกน QR พร้อมเพย์
          </p>
        </section>

        {error && (
          <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
            <AlertTriangle className="h-4 w-4 flex-none" /> {error}
          </p>
        )}
      </main>

      <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
        {inDriverMode ? (
          <Button
            onClick={() =>
              switchMode("user")
                .then(() => setReloadKey((k) => k + 1))
                .catch((err) => setError(err.response?.data?.message || "สลับโหมดไม่สำเร็จ"))
            }
          >
            ตอนนี้อยู่โหมดคนขับ · สลับเป็นโหมดเรียกวิน
          </Button>
        ) : (
          <>
            {needsVerify && (
              <Button onClick={() => navigate("/verify-identity", { state: { from: "/confirm-booking" } })}>
                ยืนยันตัวตนก่อนเรียกครั้งแรก
              </Button>
            )}
            {!needsVerify && (
              <Button onClick={handleConfirm} disabled={!canBook}>
                {submitting ? "กำลังเรียกวิน..." : bookLabel}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// พิกัดจุดรับเริ่มต้นจาก GPS — ถ้าใช้ GPS ไม่ได้ (ไม่อนุญาต/เปิดผ่าน HTTP ในวง LAN) หรืออยู่นอกระยะให้บริการของพื้นที่
// ที่เลือก จะใช้จุดกลางของพื้นที่แทน แล้วบอกผู้ใช้ให้ลากหมุดปรับเอง ดีกว่าปล่อยให้เรียกวินไม่ได้เลย
async function getPickupCoords(area) {
  const fallback = (note) => ({ point: areaCenter(area), note });

  if (!("geolocation" in navigator) || !window.isSecureContext) {
    return fallback("ยังใช้ตำแหน่ง GPS ไม่ได้ กรุณาลากหมุดจุดรับไปยังจุดที่ต้องการให้รับ");
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(
          isWithinService(area, point)
            ? { point, note: "" }
            : fallback(`ตำแหน่งของคุณอยู่นอกพื้นที่ ${area.displayName} จึงใช้จุดกลางพื้นที่แทน ลากหมุดเพื่อปรับ`)
        );
      },
      () => resolve(fallback("ยังใช้ตำแหน่ง GPS ไม่ได้ กรุณาลากหมุดจุดรับไปยังจุดที่ต้องการให้รับ")),
      // เดิม timeout 5 วิ ความแม่นยำปกติ — iPhone/ในอาคารจับ GPS ครั้งแรกนานกว่านั้นบ่อย ๆ เลยตกไปใช้จุดกลางมหาวิทยาลัย
      // ทั้งที่อยู่ในแคมปัสจริง; maximumAge ใช้ตำแหน่งล่าสุดที่เครื่องมีอยู่แล้วได้ (ไม่เกิน 30 วิ) จะได้ไม่ต้องรอจับใหม่
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  });
}
