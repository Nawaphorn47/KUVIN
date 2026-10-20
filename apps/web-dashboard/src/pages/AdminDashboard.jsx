import { useEffect, useState, useCallback, useMemo } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Flag,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Siren,
  UserCheck,
  X,
} from "lucide-react";
import clsx from "clsx";
import Button from "../components/Button";
import Badge from "../components/Badge";
import Overlay from "../components/Overlay";
import { PageHeader } from "../components/AdminLayout";
import { api, fileUrl } from "../services/api";
import { socket, connectWithAuth } from "../lib/socket";
import { useAdminSession } from "../lib/adminSession";

const STATUS_LABEL = {
  PENDING: "รอคนขับ",
  ACCEPTED: "คนขับกำลังมา",
  IN_PROGRESS: "กำลังเดินทาง",
  COMPLETED: "สำเร็จ",
  CANCELLED: "ยกเลิก",
};

// เอกสารตามประเภทคนขับ — ตรงกับ apps/api/src/utils/driverTypes.js
const DRIVER_TYPE_LABEL = { STUDENT: "นิสิต", PUBLIC: "บุคคลทั่วไป", PRO: "วินมอเตอร์ไซค์" };
const DOC_FIELDS = [
  ["photoUrl", "รูปถ่ายหน้าตรง"],
  ["idCardPhotoUrl", "บัตรประชาชน"],
  ["studentCardPhotoUrl", "บัตรนิสิต"],
  ["driverLicensePhotoUrl", "ใบขับขี่"],
  ["vestPhotoUrl", "เสื้อวิน"],
  ["vehiclePhotoUrl", "รถเต็มคัน"],
  ["platePhotoUrl", "ป้ายทะเบียน"],
];

// ลำดับความเร่งด่วนของคิวงาน: เหตุฉุกเฉิน → แจ้งปัญหา → คนขับรออนุมัติ → ข้อพิพาท → ดูรายการทั้งหมด
const QUEUE_ORDER = ["sos", "reports", "drivers", "disputes", "trips"];
const QUEUE_LABEL = {
  sos: "เหตุฉุกเฉิน",
  reports: "แจ้งปัญหาหลังทริป",
  drivers: "รออนุมัติคนขับ",
  disputes: "ข้อพิพาทการจ่ายเงิน",
  trips: "รายการเดินทาง",
};

export default function AdminDashboard() {
  const { isSuper, areaId, area } = useAdminSession();
  const showArea = isSuper && !areaId; // super ดูทุกวิทยาเขต → โชว์คอลัมน์วิทยาเขต
  const [stats, setStats] = useState(null);
  const [pendingDrivers, setPendingDrivers] = useState(null);
  const [trips, setTrips] = useState(null);
  const [sosAlerts, setSosAlerts] = useState(null);
  const [reports, setReports] = useState(null);
  const [reviewDriver, setReviewDriver] = useState(null);
  const [tab, setTab] = useState(null); // null = ให้ระบบเลือกคิวที่เร่งด่วนที่สุดให้
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError] = useState("");

  const loadAll = useCallback(() => {
    setError("");
    const fail = (err) => setError(err.response?.data?.message || "โหลดข้อมูลบางส่วนไม่สำเร็จ");
    const done = () => setUpdatedAt(new Date());
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(fail);
    api.get("/admin/drivers/pending").then(({ data }) => setPendingDrivers(data)).catch(fail);
    api.get("/admin/trips").then(({ data }) => setTrips(data)).then(done).catch(fail);
    api.get("/admin/sos").then(({ data }) => setSosAlerts(data)).catch(fail);
    api.get("/admin/reports", { params: { status: "OPEN" } }).then(({ data }) => setReports(data)).catch(fail);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // SOS ใหม่แบบ real-time — backend ส่งเข้าห้องของวิทยาเขต (admin:area:<id>) และห้อง super (admin:super)
  // super ที่เลือกดูวิทยาเขตเดียวอยู่จะได้รับของทุกวิทยาเขต จึงกรองซ้ำฝั่งนี้
  useEffect(() => {
    connectWithAuth();
    function handleNewSos(alert) {
      if (areaId && alert.areaId && alert.areaId !== areaId) return;
      setSosAlerts((prev) => [alert, ...(prev ?? [])]);
    }
    // แจ้งปัญหาหลังทริปแบบ real-time (ห้องเดียวกับ SOS)
    function handleNewReport(report) {
      if (areaId && report.areaId !== areaId) return;
      setReports((prev) => [report, ...(prev ?? [])]);
    }
    socket.on("sos:new", handleNewSos);
    socket.on("report:new", handleNewReport);
    return () => {
      socket.off("sos:new", handleNewSos);
      socket.off("report:new", handleNewReport);
    };
  }, [areaId]);

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

  async function resolveReport(id, note) {
    await api.post(`/admin/reports/${id}/resolve`, { note });
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  const openSos = useMemo(() => (sosAlerts ?? []).filter((a) => a.status === "OPEN"), [sosAlerts]);
  const disputed = useMemo(() => (trips ?? []).filter((t) => t.paymentStatus === "DISPUTED"), [trips]);

  const counts = {
    sos: openSos.length,
    reports: reports?.length ?? 0,
    drivers: pendingDrivers?.length ?? 0,
    disputes: disputed.length,
  };
  const loaded = sosAlerts && reports && pendingDrivers && trips;
  const urgent = QUEUE_ORDER.find((k) => counts[k] > 0) ?? "trips";
  const active = tab ?? (loaded ? urgent : null);

  return (
    <div>
      <PageHeader
        title="ภาพรวม"
        subtitle={area ? `วิทยาเขต ${area.displayName}` : isSuper ? "ทุกวิทยาเขตในแพลตฟอร์ม" : undefined}
        actions={
          <>
            {updatedAt && (
              <span className="text-sm text-stone-600">อัปเดต {updatedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.</span>
            )}
            <Button variant="outline" size="sm" onClick={loadAll}>
              <RefreshCw className="h-4 w-4" /> รีเฟรช
            </Button>
          </>
        }
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-8 py-6">
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        <StatStrip stats={stats} />

        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white" aria-label="คิวงานที่ต้องจัดการ">
          <div role="tablist" aria-label="คิวงาน" className="flex gap-x-1 overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-stone-200 bg-stone-50 px-3">
            {QUEUE_ORDER.map((key) => (
              <QueueTab key={key} id={key} active={active === key} count={counts[key]} onClick={() => setTab(key)} />
            ))}
          </div>

          <div role="tabpanel" aria-label={QUEUE_LABEL[active] ?? "กำลังโหลด"}>
            {!active && <LoadingRow />}
            {active === "sos" && <SosPanel alerts={openSos} onResolve={resolveSos} />}
            {active === "reports" && <ReportsPanel reports={reports} onResolve={resolveReport} />}
            {active === "drivers" && <DriversPanel drivers={pendingDrivers} showArea={showArea} onReview={setReviewDriver} />}
            {active === "disputes" && <DisputesPanel trips={disputed} showArea={showArea} onResolve={resolveDispute} />}
            {active === "trips" && <TripsPanel trips={trips} showArea={showArea} onResolveDispute={resolveDispute} />}
          </div>
        </section>
      </div>

      {reviewDriver && (
        <DriverReviewDrawer
          driver={reviewDriver}
          onClose={() => setReviewDriver(null)}
          onApprove={approveDriver}
          onReject={rejectDriver}
        />
      )}
    </div>
  );
}

// ตัวเลขสรุปวันนี้ — แถบเดียว ไม่ใช่การ์ดหลายใบ (ตัวเลขที่ต้องลงมือทำอยู่ที่ป้ายนับของแต่ละคิวงานด้านล่าง)
function StatStrip({ stats }) {
  const items = [
    { label: "ทริปวันนี้", value: stats?.tripsToday },
    { label: "รายได้วันนี้", value: stats != null ? `฿${stats.revenueToday}` : undefined },
    { label: "คนขับออนไลน์", value: stats?.onlineDrivers },
    { label: "คนขับที่อนุมัติแล้ว", value: stats?.approvedDrivers },
  ];
  return (
    <dl className="grid grid-cols-2 divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white lg:grid-cols-4 lg:divide-x">
      {items.map((it) => (
        <div key={it.label} className="px-5 py-3.5">
          <dt className="text-sm text-stone-600">{it.label}</dt>
          <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-stone-900">
            {it.value ?? <span className="inline-block h-7 w-12 animate-pulse rounded bg-stone-200 align-middle" />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function QueueTab({ id, active, count, onClick }) {
  const isSos = id === "sos";
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      onClick={onClick}
      className={clsx(
        "-mb-px flex flex-none items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors duration-150",
        active ? "border-emerald-700 text-emerald-900" : "border-transparent text-stone-600 hover:text-stone-900"
      )}
    >
      {isSos && count > 0 && <Siren className="h-4 w-4 text-red-600" aria-hidden="true" />}
      {QUEUE_LABEL[id]}
      {id !== "trips" && (
        <span
          className={clsx(
            "min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums",
            count === 0 && "bg-stone-200 text-stone-600",
            count > 0 && isSos && "bg-red-700 text-white",
            count > 0 && !isSos && "bg-emerald-800 text-white"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-base font-semibold text-stone-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-stone-600">{hint}</p>
    </div>
  );
}

// ---------------------------------------------------------------- เหตุฉุกเฉิน
function SosPanel({ alerts, onResolve }) {
  if (alerts.length === 0) {
    return <EmptyState title="ไม่มีเหตุฉุกเฉินที่ยังไม่ปิดเคส" hint="เมื่อผู้โดยสารหรือคนขับกด SOS เหตุจะขึ้นที่นี่ทันทีพร้อมตำแหน่ง และแท็บนี้จะมีป้ายสีแดง" />;
  }
  return (
    <ul className="divide-y divide-stone-200">
      {alerts.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-red-100 text-red-700">
            <Siren className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-[14rem] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-stone-900">{a.actorName ?? "ไม่ทราบชื่อ"}</p>
              <Badge size="sm" tone={a.actorType === "USER" ? "info" : "warning"}>
                {a.actorType === "USER" ? "ผู้โดยสาร" : "คนขับ"}
              </Badge>
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {formatDateTime(a.createdAt)}
              </span>
              {a.actorPhone && (
                <a href={`tel:${a.actorPhone}`} className="flex items-center gap-1 font-medium text-emerald-800 hover:underline">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {a.actorPhone}
                </a>
              )}
              {a.lat != null && a.lng != null && (
                <a
                  href={`https://www.google.com/maps?q=${a.lat},${a.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-medium text-emerald-800 hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> ดูตำแหน่งบนแผนที่
                </a>
              )}
            </p>
            {a.contactedEmergencyNumber && <p className="mt-1 text-sm text-stone-600">ผู้แจ้งกดโทร {a.contactedEmergencyNumber} ไปแล้ว</p>}
            {a.note && <p className="mt-2 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">{a.note}</p>}
          </div>
          <Button variant="danger" size="sm" onClick={() => onResolve(a.id)}>
            <Check className="h-4 w-4" /> ปิดเคส
          </Button>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- แจ้งปัญหาหลังทริป
// เคสด่วน (ขับอันตราย/คุกคาม/ไม่ปลอดภัย) ขึ้นก่อน — กดแถวเพื่อดูรายละเอียดและบันทึกการจัดการ (เปิดทีละเคสไม่ต้องสลับหน้า)
function ReportsPanel({ reports, onResolve }) {
  const [openId, setOpenId] = useState(null);
  const sorted = useMemo(() => [...reports].sort((a, b) => Number(b.urgent) - Number(a.urgent)), [reports]);
  if (sorted.length === 0) {
    return <EmptyState title="ไม่มีเรื่องแจ้งปัญหาที่ค้างอยู่" hint="เมื่อผู้ใช้กด “แจ้งปัญหา” หลังจบทริป เรื่องจะขึ้นที่นี่ เคสที่เกี่ยวกับความปลอดภัยจะอยู่บนสุด" />;
  }
  return (
    <ul className="divide-y divide-stone-200">
      {sorted.map((r) => (
        <ReportRow key={r.id} report={r} open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)} onResolve={onResolve} />
      ))}
    </ul>
  );
}

function ReportRow({ report: r, open, onToggle, onResolve }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const reporter = r.reporterRole === "user" ? r.trip?.user : r.trip?.driver;
  const other = r.reporterRole === "user" ? r.trip?.driver : r.trip?.user;
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition-colors hover:bg-stone-50"
      >
        <Flag className={clsx("h-5 w-5 flex-none", r.urgent ? "text-red-600" : "text-amber-600")} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-stone-900">{r.categoryLabel}</span>
            {r.urgent && <Badge size="sm" tone="danger">ด่วน</Badge>}
            <Badge size="sm" tone={r.reporterRole === "user" ? "info" : "warning"}>
              {r.reporterRole === "user" ? "ผู้โดยสารแจ้ง" : "คนขับแจ้ง"}
            </Badge>
          </span>
          <span className="mt-0.5 block truncate text-sm text-stone-600">
            {reporter?.fullName ?? "-"} → {other?.fullName ?? "-"} · {r.trip?.pickupAddress ?? "-"} → {r.trip?.destinationAddress ?? "-"}
          </span>
        </span>
        <span className="flex flex-none items-center gap-1 text-sm text-stone-600">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {formatDateTime(r.createdAt)}
        </span>
        <ChevronDown className={clsx("h-4 w-4 flex-none text-stone-500 transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div className="grid gap-5 border-t border-stone-100 bg-stone-50 px-6 py-5 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            {r.detail && <p className="whitespace-pre-wrap rounded-lg bg-white px-3 py-2.5 text-sm text-stone-800 ring-1 ring-stone-200">{r.detail}</p>}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-stone-600">ผู้แจ้ง</dt>
                <dd className="font-medium text-stone-900">
                  {reporter?.fullName ?? "-"}{" "}
                  {reporter?.phone && (
                    <a href={`tel:${reporter.phone}`} className="text-emerald-800 hover:underline">
                      {reporter.phone}
                    </a>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-stone-600">{r.reporterRole === "user" ? "คนขับ" : "ผู้โดยสาร"}</dt>
                <dd className="font-medium text-stone-900">
                  {other?.fullName ?? "-"}
                  {r.reporterRole === "user" && r.trip?.driver && ` · เบอร์วิน ${r.trip.driver.vinNumber} · ${r.trip.driver.licensePlate}`}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-stone-600">ทริป</dt>
                <dd className="font-medium text-stone-900">
                  {r.trip?.pickupAddress ?? "-"} → {r.trip?.destinationAddress ?? "-"} · {formatDateTime(r.trip?.requestedAt)}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
              บันทึกการจัดการ (ไม่บังคับ)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="เช่น ตักเตือนคนขับแล้ว / ระงับบัญชี"
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal text-stone-900 placeholder:text-stone-500"
              />
            </label>
            <Button
              className="self-start"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onResolve(r.id, note);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {busy ? "กำลังปิดเคส..." : "ปิดเคสนี้"}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- คนขับรออนุมัติ
// แต่ละแถวเป็น div ล้วน (ไม่ใช้ table) เพื่อให้ปุ่ม "ตรวจสอบ" ผูกกับแถวของคนขับคนนั้นคนเดียว
function DriversPanel({ drivers, showArea, onReview }) {
  const [type, setType] = useState("ALL");
  const byType = (t) => drivers.filter((d) => d.driverType === t).length;
  const shown = type === "ALL" ? drivers : drivers.filter((d) => d.driverType === type);

  if (drivers.length === 0) {
    return <EmptyState title="ไม่มีคนขับรออนุมัติ" hint="เมื่อมีผู้ใช้สมัครขับและส่งเอกสารครบ จะขึ้นที่นี่ให้ตรวจเอกสารและอนุมัติหรือปฏิเสธพร้อมเหตุผล" />;
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-6 py-3" role="group" aria-label="กรองตามประเภทคนขับ">
        {[["ALL", "ทั้งหมด", drivers.length], ...Object.entries(DRIVER_TYPE_LABEL).map(([k, v]) => [k, v, byType(k)])].map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            aria-pressed={type === key}
            onClick={() => setType(key)}
            className={clsx(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors duration-150",
              type === key ? "bg-emerald-800 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            )}
          >
            {label} <span className="tabular-nums opacity-80">{n}</span>
          </button>
        ))}
      </div>

      <div
        className={clsx(
          "hidden gap-4 border-b border-stone-200 bg-stone-50 px-6 py-2.5 text-sm font-medium text-stone-600 lg:grid",
          showArea ? "lg:grid-cols-[2fr_1.4fr_1.4fr_1fr_8rem]" : "lg:grid-cols-[2fr_1.4fr_1.4fr_8rem]"
        )}
      >
        <span>ผู้สมัคร</span>
        <span>ประเภท</span>
        <span>รถ</span>
        {showArea && <span>วิทยาเขต</span>}
        <span className="text-right">เอกสาร</span>
      </div>

      {shown.length === 0 && <p className="px-6 py-8 text-center text-sm text-stone-600">ไม่มีผู้สมัครประเภทนี้</p>}
      {shown.map((d) => (
        <div
          key={d.id}
          className={clsx(
            "grid items-center gap-x-4 gap-y-2 border-b border-stone-200 px-6 py-3.5 last:border-b-0",
            showArea ? "lg:grid-cols-[2fr_1.4fr_1.4fr_1fr_8rem]" : "lg:grid-cols-[2fr_1.4fr_1.4fr_8rem]"
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-emerald-100 text-base font-semibold text-emerald-900" aria-hidden="true">
              {d.fullName[0]}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-stone-900">{d.fullName}</p>
              <p className="text-sm text-stone-600">{d.phone}</p>
            </div>
          </div>
          <div className="text-sm text-stone-700">
            <Badge size="sm" tone="neutral">
              {DRIVER_TYPE_LABEL[d.driverType] ?? "-"}
            </Badge>
            {(d.winGroupName || d.studentId) && <p className="mt-1 text-stone-600">{d.winGroupName ?? `รหัส ${d.studentId}`}</p>}
          </div>
          <div className="text-sm text-stone-700">
            <p>{d.licensePlate}</p>
            <p className="text-stone-600">เบอร์วิน {d.vinNumber}</p>
          </div>
          {showArea && <p className="text-sm text-stone-700">{d.area?.displayName ?? "-"}</p>}
          <div className="lg:text-right">
            <Button size="sm" onClick={() => onReview(d)}>
              <UserCheck className="h-4 w-4" /> ตรวจสอบ
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- ข้อพิพาทการจ่ายเงิน
function DisputesPanel({ trips, showArea, onResolve }) {
  if (trips.length === 0) {
    return <EmptyState title="ไม่มีข้อพิพาทการจ่ายเงินค้างอยู่" hint="เมื่อคนขับแจ้งว่ายังไม่ได้รับเงิน ทริปนั้นจะขึ้นที่นี่ ตรวจสลิปและประวัติแล้วกด “แก้ไขแล้ว” เพื่อปิด" />;
  }
  return (
    <ul className="divide-y divide-stone-200">
      {trips.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
          <div className="min-w-[16rem] flex-1">
            <p className="text-[15px] font-semibold text-stone-900">
              {t.pickupAddress ?? "-"} → {t.destinationAddress ?? "-"}
            </p>
            <p className="mt-0.5 text-sm text-stone-600">
              {formatDateTime(t.requestedAt)} · คนขับ {t.driver?.fullName ?? "-"}
              {showArea && t.area?.displayName ? ` · ${t.area.displayName}` : ""}
            </p>
            {t.disputeNote && <p className="mt-2 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">{t.disputeNote}</p>}
          </div>
          <span className="text-lg font-semibold tabular-nums text-stone-900">฿{(t.fare ?? 0).toFixed(2)}</span>
          <PaymentCell trip={t} />
          <Button variant="outline" size="sm" onClick={() => onResolve(t.id)}>
            <Check className="h-4 w-4" /> แก้ไขแล้ว
          </Button>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- รายการเดินทาง
const PAGE_LIMIT = 100;

function TripsPanel({ trips, showArea, onResolveDispute }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const term = q.trim().toLowerCase();
  const filtered = trips.filter((t) => {
    if (status && t.status !== status) return false;
    if (!term) return true;
    return [t.driver?.fullName, t.pickupAddress, t.destinationAddress, t.area?.displayName].some((v) => v?.toLowerCase().includes(term));
  });
  const shown = filtered.slice(0, PAGE_LIMIT);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 px-6 py-3">
        <label className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5">
          <Search className="h-4 w-4 text-stone-500" aria-hidden="true" />
          <span className="sr-only">ค้นหาทริป</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อคนขับ จุดรับ หรือปลายทาง"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-500"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          สถานะ
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm">
            <option value="">ทั้งหมด</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-6 py-2.5 font-medium">วันที่/เวลา</th>
              {showArea && <th className="px-4 py-2.5 font-medium">วิทยาเขต</th>}
              <th className="px-4 py-2.5 font-medium">คนขับ</th>
              <th className="px-4 py-2.5 font-medium">เส้นทาง</th>
              <th className="px-4 py-2.5 text-right font-medium">ค่าโดยสาร</th>
              <th className="px-4 py-2.5 font-medium">สถานะ</th>
              <th className="px-4 py-2.5 font-medium">การชำระเงิน</th>
              <th className="px-6 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-stone-600">
                  ไม่พบทริปที่ตรงกับที่ค้นหา
                </td>
              </tr>
            )}
            {shown.map((t) => (
              <tr key={t.id} className={t.paymentStatus === "DISPUTED" ? "bg-red-50" : "hover:bg-stone-50"}>
                <td className="whitespace-nowrap px-6 py-3 text-stone-900">{formatDateTime(t.requestedAt)}</td>
                {showArea && <td className="px-4 py-3 text-stone-700">{t.area?.displayName ?? "-"}</td>}
                <td className="px-4 py-3 text-stone-900">{t.driver?.fullName ?? <span className="text-stone-600">ยังไม่มีคนขับรับ</span>}</td>
                <td className="px-4 py-3 text-stone-900">
                  {t.pickupAddress ?? "-"} → {t.destinationAddress ?? "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-stone-900">฿{(t.fare ?? 0).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {t.paymentStatus === "DISPUTED" ? (
                    <span className="flex flex-col items-start gap-1">
                      <span className="text-stone-900">{STATUS_LABEL[t.status] ?? t.status}</span>
                      <Badge size="sm" tone="danger">
                        <AlertCircle className="mr-1 h-3 w-3" aria-hidden="true" /> ข้อพิพาท
                      </Badge>
                    </span>
                  ) : (
                    <Badge size="sm" tone={t.status === "CANCELLED" ? "neutral" : "success"}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <PaymentCell trip={t} />
                </td>
                <td className="px-6 py-3 text-right">
                  {t.paymentStatus === "DISPUTED" && (
                    <Button variant="outline" size="sm" onClick={() => onResolveDispute(t.id)}>
                      แก้ไขแล้ว
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > PAGE_LIMIT && (
        <p className="border-t border-stone-200 px-6 py-3 text-sm text-stone-600">แสดง {PAGE_LIMIT} จาก {filtered.length} รายการ ใช้ช่องค้นหาหรือสถานะเพื่อกรองให้แคบลง</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- ตรวจเอกสารคนขับ
// แผงด้านข้าง (ไม่ใช่ popup กลางจอ) เห็นรายการหลังแผงตลอด ปุ่มอนุมัติ/ปฏิเสธติดล่างให้กดได้โดยไม่ต้องเลื่อนหาเมื่อเอกสารเยอะ
function DriverReviewDrawer({ driver, onClose, onApprove, onReject }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const docs = DOC_FIELDS.filter(([key]) => driver[key]).map(([key, label]) => ({
    label: key === "driverLicensePhotoUrl" && driver.driverType === "PRO" ? "ใบขับขี่สาธารณะ" : label,
    url: fileUrl(driver[key]),
  }));

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
    <Overlay onClose={onClose} className="flex justify-end" backdropClassName="bg-black/30">
      <aside role="dialog" aria-modal="true" aria-labelledby="review-title" className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-6 py-4">
          <div>
            <h2 id="review-title" className="text-xl font-semibold text-stone-900">
              ตรวจสอบเอกสารคนขับ
            </h2>
            <p className="text-sm text-stone-600">{driver.fullName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Info label="เบอร์โทรศัพท์" value={driver.phone} />
            <Info
              label="ประเภท"
              value={`${DRIVER_TYPE_LABEL[driver.driverType] ?? "-"}${driver.winGroupName ? ` · ${driver.winGroupName}` : ""}${driver.studentId ? ` · รหัส ${driver.studentId}` : ""}`}
            />
            <Info label="เบอร์วิน" value={driver.vinNumber} />
            <Info label="รถ / ทะเบียน" value={`${driver.vehicleModel ?? "-"} / ${driver.licensePlate}`} />
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-stone-800">เอกสาร ({docs.length}) · กดรูปเพื่อดูขนาดเต็ม</h3>
            <div className="grid grid-cols-2 gap-3">
              {docs.map((doc) => (
                <figure key={doc.label} className="flex flex-col gap-1">
                  <a href={doc.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                    <img src={doc.url} alt={doc.label} className="h-40 w-full object-contain" />
                  </a>
                  <figcaption className="text-sm text-stone-700">{doc.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>

          {showReject && (
            <div className="flex flex-col gap-2">
              <label htmlFor="reject-reason" className="text-sm font-medium text-stone-800">
                เหตุผลที่ปฏิเสธ (จำเป็น — คนขับจะเห็นข้อความนี้ในแอป)
              </label>
              <textarea
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="เช่น รูปบัตรประชาชนไม่ชัดเจน"
                className="rounded-lg border border-stone-300 p-3 text-sm placeholder:text-stone-500"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-stone-200 bg-white px-6 py-4">
          {!showReject ? (
            <Button variant="outline" onClick={() => setShowReject(true)} disabled={busy} className="text-red-700">
              <X className="h-4 w-4" /> ปฏิเสธ
            </Button>
          ) : (
            <Button variant="danger" onClick={handleReject} disabled={busy || !reason.trim()}>
              <X className="h-4 w-4" /> ยืนยันปฏิเสธ
            </Button>
          )}
          <Button onClick={handleApprove} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} อนุมัติ
          </Button>
        </div>
      </aside>
    </Overlay>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-stone-600">{label}</dt>
      <dd className="font-medium text-stone-900">{value}</dd>
    </div>
  );
}

const PAID_BY_LABEL = { SLIP: "ตรวจสลิปแล้ว", DRIVER: "คนขับยืนยัน", ADMIN: "แอดมินแก้ไข" };

// สถานะการชำระเงินของทริป: จ่ายแล้วด้วยวิธีไหน / รอชำระ (พร้อมเหตุผลที่สลิปล่าสุดไม่ผ่านถ้ามี — ช่วยตัดสินข้อพิพาท)
function PaymentCell({ trip }) {
  if (trip.status !== "COMPLETED") return <span className="text-stone-500">-</span>;

  if (trip.paymentStatus === "PAID") {
    return (
      <div className="flex flex-col items-start gap-1">
        <Badge size="sm" tone="success">
          จ่ายแล้ว
        </Badge>
        <span className="text-xs text-stone-600">
          {PAID_BY_LABEL[trip.paymentConfirmedBy] ?? "ไม่ระบุ"}
          {trip.paymentMethod === "PROMPTPAY" ? " · พร้อมเพย์" : ""}
        </span>
        {trip.paymentRef && <span className="text-xs text-stone-500">อ้างอิง {trip.paymentRef}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge size="sm" tone={trip.paymentStatus === "DISPUTED" ? "danger" : "warning"}>
        {trip.paymentStatus === "DISPUTED" ? "ข้อพิพาท" : "รอชำระ"}
      </Badge>
      {trip.paymentSlipAttempts > 0 && <span className="text-xs text-stone-600">ส่งสลิป {trip.paymentSlipAttempts} ครั้ง ไม่ผ่าน</span>}
      {trip.paymentSlipError && <span className="max-w-[16rem] text-xs text-red-700">{trip.paymentSlipError}</span>}
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 px-6 py-10 text-stone-600">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> กำลังโหลด...
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
