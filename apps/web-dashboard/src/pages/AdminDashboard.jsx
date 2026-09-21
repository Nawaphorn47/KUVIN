import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  UserCheck,
  AlertCircle,
  Bike,
  Siren,
  Phone,
  MapPin,
  Clock,
  X,
  Check,
  Loader2,
  RefreshCw,
  Map as MapIcon,
  Users,
} from "lucide-react";
import Button from "../components/Button";
import Badge from "../components/Badge";
import Card from "../components/Card";
import { api } from "../services/api";
import { getToken, clearToken } from "../lib/auth";
import { socket, connectWithAuth } from "../lib/socket";

const STATUS_LABEL = {
  PENDING: "รอคนขับ",
  ACCEPTED: "คนขับกำลังมา",
  IN_PROGRESS: "กำลังเดินทาง",
  COMPLETED: "สำเร็จ",
  CANCELLED: "ยกเลิก",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingDrivers, setPendingDrivers] = useState(null);
  const [trips, setTrips] = useState(null);
  const [sosAlerts, setSosAlerts] = useState(null);
  const [reviewDriver, setReviewDriver] = useState(null);
  const [error, setError] = useState("");

  const loadAll = useCallback(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
    api.get("/admin/drivers/pending").then(({ data }) => setPendingDrivers(data)).catch(() => {});
    api.get("/admin/trips").then(({ data }) => setTrips(data)).catch(() => {});
    api.get("/admin/sos").then(({ data }) => setSosAlerts(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    loadAll();
  }, [loadAll, navigate]);

  // ฟัง SOS ใหม่แบบ real-time — ตรงตามที่ backend ออกแบบไว้ (io.to("admin").emit("sos:new", ...)) แต่ก่อนหน้านี้
  // ไม่มีหน้าไหนใน web-dashboard ฟัง event นี้เลยสักที่ ทั้งที่ backend ทำงานถูกต้องมาตลอด
  useEffect(() => {
    connectWithAuth();
    function handleNewSos(alert) {
      setSosAlerts((prev) => [alert, ...(prev ?? [])]);
    }
    socket.on("sos:new", handleNewSos);
    return () => socket.off("sos:new", handleNewSos);
  }, []);

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  async function approveDriver(id) {
    await api.post(`/admin/drivers/${id}/approve`);
    setPendingDrivers((prev) => prev.filter((d) => d.id !== id));
    setReviewDriver(null);
    loadAll();
  }

  async function rejectDriver(id, reason) {
    await api.post(`/admin/drivers/${id}/reject`, { reason });
    setPendingDrivers((prev) => prev.filter((d) => d.id !== id));
    setReviewDriver(null);
    loadAll();
  }

  async function resolveDispute(id) {
    await api.post(`/admin/trips/${id}/resolve-dispute`);
    loadAll();
  }

  async function resolveSos(id) {
    await api.post(`/admin/sos/${id}/resolve`);
    setSosAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "RESOLVED" } : a)));
  }

  const openSosCount = (sosAlerts ?? []).filter((a) => a.status === "OPEN").length;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-6 shadow-sm">
        <h1 className="flex items-center gap-2 text-2xl text-emerald-900">
          <Bike className="h-6 w-6" /> KU VIN Admin
        </h1>
        <div className="flex items-center gap-4">
          <Link to="/people" className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-emerald-800">
            <Users className="h-4 w-4" /> ผู้ใช้และคนขับ
          </Link>
          <Link to="/landmarks" className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-emerald-800">
            <MapIcon className="h-4 w-4" /> จัดการสถานที่
          </Link>
          <button onClick={loadAll} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-emerald-800">
            <RefreshCw className="h-4 w-4" /> รีเฟรช
          </button>
          <Button variant="danger" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" /> Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10">
        {error && <p className="text-red-600">{error}</p>}

        <StatsGrid stats={stats} openSosCount={openSosCount} />

        {openSosCount > 0 && (
          <SosSection alerts={sosAlerts} onResolve={resolveSos} />
        )}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-3xl text-emerald-900">
              <UserCheck className="h-6 w-6" /> รออนุมัติคนขับ
            </h2>
            <span className="rounded-full bg-emerald-200 px-3 py-1 text-base text-emerald-950">
              {pendingDrivers?.length ?? 0} รายการ
            </span>
          </div>

          {!pendingDrivers && <LoadingRow />}
          {pendingDrivers?.length === 0 && <p className="text-stone-400">ไม่มีคนขับรออนุมัติตอนนี้</p>}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {pendingDrivers?.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-900 ring-2 ring-emerald-900">
                    {d.fullName[0]}
                  </span>
                  <div>
                    <p className="text-2xl text-stone-900">{d.fullName}</p>
                    <p className="text-lg text-stone-500">เบอร์วิน {d.vinNumber}</p>
                  </div>
                </div>
                <Button className="flex-none" onClick={() => setReviewDriver(d)}>
                  <UserCheck className="h-4 w-4" /> ตรวจสอบ
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-3xl text-emerald-900">รายการเดินทางทั้งหมด</h2>

          {!trips && <LoadingRow />}

          {trips && (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-stone-200 text-base text-stone-900">
                  <tr>
                    <th className="px-6 py-4 font-medium">วันที่/เวลา</th>
                    <th className="px-6 py-4 font-medium">คนขับ</th>
                    <th className="px-6 py-4 font-medium">เส้นทาง</th>
                    <th className="px-6 py-4 text-right font-medium">ค่าโดยสาร</th>
                    <th className="px-6 py-4 font-medium">สถานะ</th>
                    <th className="px-6 py-4 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {trips.map((t) => (
                    <tr key={t.id} className={t.paymentStatus === "DISPUTED" ? "bg-rose-50" : ""}>
                      <td className="px-6 py-5 text-lg text-stone-900">{formatDateTime(t.requestedAt)}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-200 text-xs text-green-950">
                            {t.driver?.fullName?.[0] ?? "-"}
                          </span>
                          <span className="text-lg text-stone-900">{t.driver?.fullName ?? "ยังไม่มีคนขับรับ"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-lg text-stone-900">
                        {t.pickupAddress ?? "-"} → {t.destinationAddress ?? "-"}
                      </td>
                      <td className="px-6 py-5 text-right text-lg text-stone-900">฿{(t.fare ?? 0).toFixed(2)}</td>
                      <td className="px-6 py-5">
                        {t.paymentStatus === "DISPUTED" ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-lg text-red-700">{STATUS_LABEL[t.status] ?? t.status}</span>
                            <span className="flex items-center gap-1 rounded-sm bg-red-700 px-2 py-0.5 text-[10px] uppercase text-white">
                              <AlertCircle className="h-2.5 w-2.5" /> ข้อพิพาท
                            </span>
                          </div>
                        ) : (
                          <Badge tone={t.status === "CANCELLED" ? "danger" : "success"}>
                            {STATUS_LABEL[t.status] ?? t.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {t.paymentStatus === "DISPUTED" && (
                          <button
                            onClick={() => resolveDispute(t.id)}
                            className="text-sm font-medium text-emerald-700 hover:underline"
                          >
                            แก้ไขแล้ว
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {reviewDriver && (
        <DriverReviewModal
          driver={reviewDriver}
          onClose={() => setReviewDriver(null)}
          onApprove={approveDriver}
          onReject={rejectDriver}
        />
      )}
    </div>
  );
}

function StatsGrid({ stats, openSosCount }) {
  const tiles = [
    { label: "ทริปวันนี้", value: stats?.tripsToday },
    { label: "รายได้วันนี้", value: stats != null ? `฿${stats.revenueToday}` : undefined },
    { label: "คนขับออนไลน์", value: stats?.onlineDrivers },
    { label: "คนขับอนุมัติแล้ว", value: stats?.approvedDrivers },
    { label: "รออนุมัติ", value: stats?.pendingDrivers },
    { label: "ข้อพิพาทค้าง", value: stats?.disputedPayments, danger: stats?.disputedPayments > 0 },
  ];
  return (
    <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <Card key={t.label} className="p-5">
          <p className="text-sm text-stone-500">{t.label}</p>
          <p className={`mt-1 text-3xl font-bold ${t.danger ? "text-red-600" : "text-emerald-900"}`}>
            {t.value ?? <Loader2 className="h-6 w-6 animate-spin text-stone-300" />}
          </p>
        </Card>
      ))}
      {openSosCount > 0 && (
        <Card className="col-span-2 flex items-center gap-3 border-red-300 bg-red-50 p-5 md:col-span-3 lg:col-span-6">
          <Siren className="h-6 w-6 flex-none animate-pulse text-red-600" />
          <p className="text-lg font-bold text-red-700">มีเหตุฉุกเฉินที่ยังไม่ปิดเคส {openSosCount} รายการ — ดูด้านล่าง</p>
        </Card>
      )}
    </section>
  );
}

function SosSection({ alerts, onResolve }) {
  const open = (alerts ?? []).filter((a) => a.status === "OPEN");
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-3xl text-red-700">
        <Siren className="h-6 w-6" /> แจ้งเหตุฉุกเฉิน (SOS)
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {open.map((a) => (
          <Card key={a.id} className="flex flex-col gap-3 border-red-300 p-5">
            <div className="flex items-center justify-between">
              <Badge tone={a.actorType === "USER" ? "info" : "warning"}>
                {a.actorType === "USER" ? "ผู้โดยสาร" : "คนขับ"}
              </Badge>
              <span className="flex items-center gap-1 text-sm text-stone-400">
                <Clock className="h-3.5 w-3.5" /> {formatDateTime(a.createdAt)}
              </span>
            </div>
            <p className="text-2xl font-bold text-stone-900">{a.actorName ?? "ไม่ทราบชื่อ"}</p>
            {a.actorPhone && (
              <a href={`tel:${a.actorPhone}`} className="flex items-center gap-1.5 text-lg text-emerald-800">
                <Phone className="h-4 w-4" /> {a.actorPhone}
              </a>
            )}
            {a.lat != null && a.lng != null && (
              <a
                href={`https://www.google.com/maps?q=${a.lat},${a.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-emerald-700 hover:underline"
              >
                <MapPin className="h-4 w-4" /> ดูตำแหน่งบนแผนที่
              </a>
            )}
            {a.contactedEmergencyNumber && (
              <p className="text-sm text-stone-500">ผู้แจ้งกดโทร {a.contactedEmergencyNumber} ไปแล้ว</p>
            )}
            {a.note && <p className="rounded-lg bg-stone-50 p-2 text-sm text-stone-600">{a.note}</p>}
            <Button variant="danger" onClick={() => onResolve(a.id)}>
              ปิดเคสนี้
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}

function DriverReviewModal({ driver, onClose, onApprove, onReject }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const docs = [
    { label: "รูปถ่ายหน้าตรง", url: driver.photoUrl },
    { label: "บัตรประชาชน", url: driver.idCardPhotoUrl },
    { label: "ใบขับขี่", url: driver.driverLicensePhotoUrl },
    { label: "รถเต็มคัน", url: driver.vehiclePhotoUrl },
    { label: "ป้ายทะเบียน", url: driver.platePhotoUrl },
  ];

  async function handleApprove() {
    setBusy(true);
    try {
      await onApprove(driver.id);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await onReject(driver.id, reason.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-5 overflow-y-auto rounded-2xl bg-white p-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-2xl text-emerald-900">ตรวจสอบเอกสารคนขับ</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-base">
          <div>
            <p className="text-stone-400">ชื่อ-นามสกุล</p>
            <p className="text-stone-900">{driver.fullName}</p>
          </div>
          <div>
            <p className="text-stone-400">เบอร์โทรศัพท์</p>
            <p className="text-stone-900">{driver.phone}</p>
          </div>
          <div>
            <p className="text-stone-400">เบอร์วิน</p>
            <p className="text-stone-900">{driver.vinNumber}</p>
          </div>
          <div>
            <p className="text-stone-400">รถ / ทะเบียน</p>
            <p className="text-stone-900">
              {driver.vehicleModel ?? "-"} / {driver.licensePlate}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {docs.map((doc) => (
            <div key={doc.label} className="flex flex-col gap-1">
              <p className="text-sm text-stone-500">{doc.label}</p>
              {doc.url ? (
                <a href={doc.url} target="_blank" rel="noreferrer">
                  <img src={doc.url} alt={doc.label} className="h-32 w-full rounded-lg border border-stone-200 object-cover" />
                </a>
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-lg bg-stone-100 text-xs text-stone-400">
                  ไม่มีรูป
                </div>
              )}
            </div>
          ))}
        </div>

        {showReject && (
          <div className="flex flex-col gap-2">
            <label className="text-sm text-stone-600">เหตุผลที่ปฏิเสธ (จำเป็น)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="เช่น รูปบัตรประชาชนไม่ชัดเจน"
              className="rounded-lg border border-stone-300 p-3 text-sm outline-none focus:border-emerald-600"
            />
          </div>
        )}

        <div className="flex gap-3">
          {!showReject ? (
            <Button variant="danger" onClick={() => setShowReject(true)} disabled={busy}>
              <X className="h-4 w-4" /> ปฏิเสธ
            </Button>
          ) : (
            <Button variant="danger" onClick={handleReject} disabled={busy || !reason.trim()}>
              <X className="h-4 w-4" /> ยืนยันปฏิเสธ
            </Button>
          )}
          <Button onClick={handleApprove} disabled={busy}>
            <Check className="h-4 w-4" /> อนุมัติ
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 py-6 text-stone-400">
      <Loader2 className="h-5 w-5 animate-spin" /> กำลังโหลด...
    </div>
  );
}

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
