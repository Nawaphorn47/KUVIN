import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Ban, Bike, Loader2, RotateCcw, Search, ShieldCheck, X } from "lucide-react";
import clsx from "clsx";
import Button from "../components/Button";
import Badge from "../components/Badge";
import { api } from "../services/api";
import { getToken } from "../lib/auth";

const TABS = [
  { key: "users", label: "ผู้ใช้บริการ" },
  { key: "drivers", label: "คนขับ" },
];

const STATUS_FILTERS = {
  users: [
    { value: "", label: "ทุกสถานะ" },
    { value: "active", label: "ใช้งานปกติ" },
    { value: "suspended", label: "ถูกระงับ" },
  ],
  drivers: [
    { value: "", label: "ทุกสถานะ" },
    { value: "online", label: "ออนไลน์อยู่" },
    { value: "APPROVED", label: "ผ่านการยืนยันแล้ว" },
    { value: "PENDING", label: "รอตรวจสอบ" },
    { value: "REJECTED", label: "ไม่ผ่านการยืนยัน" },
    { value: "suspended", label: "ถูกระงับ" },
  ],
};

const TRIP_STATUS = {
  PENDING: { label: "รอคนขับ", tone: "warning" },
  ACCEPTED: { label: "รับงานแล้ว", tone: "info" },
  IN_PROGRESS: { label: "กำลังเดินทาง", tone: "info" },
  COMPLETED: { label: "เสร็จสิ้น", tone: "success" },
  CANCELLED: { label: "ยกเลิก", tone: "neutral" },
};

const VERIFICATION = {
  APPROVED: { label: "ยืนยันแล้ว", tone: "success" },
  PENDING: { label: "รอตรวจสอบ", tone: "warning" },
  REJECTED: { label: "ไม่ผ่าน", tone: "danger" },
};

function formatDate(iso, withTime = false) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export default function PeopleManager() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("users");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  // ผูกข้อมูลกับแท็บที่ดึงมา: ตอนสลับแท็บ (หรือมีคำตอบของแท็บเก่าที่มาช้า) ห้ามเอาแถวของผู้ใช้ไปเรนเดอร์เป็นตารางคนขับ
  const [loaded, setLoaded] = useState({ tab: null, data: null });
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null); // { kind, id }

  // ค้นหาแบบรอผู้ใช้พิมพ์จบก่อนค่อยยิง API (ไม่ยิงทุกตัวอักษร)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/${tab}`, { params: { q: debounced || undefined, status: status || undefined } });
      setLoaded({ tab, data });
      setError("");
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) navigate("/login");
      else setError("โหลดรายการไม่สำเร็จ");
    }
  }, [tab, debounced, status, navigate]);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    load();
  }, [load, navigate]);

  const rows = loaded.tab === tab ? loaded.data : null;

  function changeTab(next) {
    setTab(next);
    setStatus("");
    setQuery("");
    setSelected(null);
  }

  return (
    <div className="flex h-screen flex-col bg-stone-50">
      <header className="flex h-16 flex-none items-center justify-between border-b border-stone-200 bg-white px-6 shadow-sm">
        <h1 className="flex items-center gap-2 text-2xl text-emerald-900">
          <Bike className="h-6 w-6" /> จัดการผู้ใช้และคนขับ
        </h1>
        <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-emerald-800">
          <ArrowLeft className="h-4 w-4" /> กลับแดชบอร์ด
        </Link>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-stone-200 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => changeTab(t.key)}
                className={clsx(
                  "rounded-md px-4 py-1.5 text-sm font-medium",
                  tab === t.key ? "bg-white text-emerald-900 shadow" : "text-stone-600 hover:text-stone-900"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "users" ? "ค้นหาชื่อ เบอร์โทร อีเมล หรือรหัสนิสิต" : "ค้นหาชื่อ เบอร์โทร เบอร์วิน หรือทะเบียนรถ"}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          >
            {STATUS_FILTERS[tab].map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-600">{error}</p>}

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-stone-100 text-stone-600">
              {tab === "users" ? (
                <tr>
                  <th className="px-4 py-3">ชื่อ</th>
                  <th className="px-4 py-3">เบอร์โทร</th>
                  <th className="px-4 py-3">อีเมล</th>
                  <th className="px-4 py-3">ทริป (สำเร็จ/ทั้งหมด)</th>
                  <th className="px-4 py-3">สมัครเมื่อ</th>
                  <th className="px-4 py-3">สถานะ</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-4 py-3">ชื่อ</th>
                  <th className="px-4 py-3">เบอร์วิน</th>
                  <th className="px-4 py-3">เบอร์โทร</th>
                  <th className="px-4 py-3">ทะเบียนรถ</th>
                  <th className="px-4 py-3">ทริป (สำเร็จ/ทั้งหมด)</th>
                  <th className="px-4 py-3">สถานะ</th>
                </tr>
              )}
            </thead>
            <tbody>
              {rows === null && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}
              {rows?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                    ไม่พบรายการที่ตรงกับที่ค้นหา
                  </td>
                </tr>
              )}
              {rows?.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected({ kind: tab, id: r.id })}
                  className={clsx(
                    "cursor-pointer border-t border-stone-100 hover:bg-emerald-50",
                    selected?.id === r.id && "bg-emerald-50"
                  )}
                >
                  <td className="px-4 py-3 font-medium text-stone-900">{r.fullName}</td>
                  {tab === "users" ? (
                    <>
                      <td className="px-4 py-3 text-stone-600">{r.phone}</td>
                      <td className="px-4 py-3 text-stone-600">{r.email}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {r.completedTripCount}/{r.tripCount}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        {r.isSuspended ? <Badge tone="danger">ถูกระงับ</Badge> : <Badge tone="success">ปกติ</Badge>}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-stone-600">{r.vinNumber}</td>
                      <td className="px-4 py-3 text-stone-600">{r.phone}</td>
                      <td className="px-4 py-3 text-stone-600">{r.licensePlate}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {r.completedTripCount}/{r.tripCount}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {r.isSuspended ? (
                            <Badge tone="danger">ถูกระงับ</Badge>
                          ) : (
                            <Badge tone={VERIFICATION[r.verificationStatus].tone}>{VERIFICATION[r.verificationStatus].label}</Badge>
                          )}
                          {r.isOnline && !r.isSuspended && <Badge tone="info">ออนไลน์</Badge>}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows && rows.length >= 200 && (
          <p className="text-xs text-stone-500">แสดง 200 รายการล่าสุด ใช้ช่องค้นหาเพื่อกรองให้แคบลง</p>
        )}
      </main>

      {selected && (
        <DetailDrawer
          key={`${selected.kind}:${selected.id}`}
          kind={selected.kind}
          id={selected.id}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function DetailDrawer({ kind, id, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/${kind}/${id}`);
      setDetail(data);
    } catch (err) {
      setError(err.response?.data?.message || "โหลดรายละเอียดไม่สำเร็จ");
    }
  }, [kind, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action, body) {
    setBusy(true);
    setError("");
    try {
      await api.post(`/admin/${kind}/${id}/${action}`, body);
      setReason("");
      await Promise.all([load(), onChanged()]);
    } catch (err) {
      setError(err.response?.data?.message || "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  function suspend() {
    if (!reason.trim()) {
      setError("ต้องระบุเหตุผลที่ระงับบัญชี");
      return;
    }
    if (!window.confirm(`ระงับบัญชี "${detail.profile.fullName}" ?\nผู้ใช้จะถูกตัดออกจากระบบทันทีและเข้าสู่ระบบไม่ได้จนกว่าจะปลดระงับ`)) return;
    act("suspend", { reason: reason.trim() });
  }

  const p = detail?.profile;
  const s = detail?.stats;
  const isDriver = kind === "drivers";
  const docs = isDriver
    ? [
        { label: "หน้าตรง", url: p?.photoUrl },
        { label: "บัตร ปชช.", url: p?.idCardPhotoUrl },
        { label: "ใบขับขี่", url: p?.driverLicensePhotoUrl },
        { label: "รถ", url: p?.vehiclePhotoUrl },
        { label: "ป้ายทะเบียน", url: p?.platePhotoUrl },
      ].filter((d) => d.url)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-lg flex-col gap-5 overflow-y-auto bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl text-emerald-900">{p?.fullName ?? "กำลังโหลด..."}</h2>
            {p && (
              <p className="text-sm text-stone-500">
                {isDriver ? `เบอร์วิน ${p.vinNumber} · ${p.licensePlate}` : p.email}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="ปิด" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!detail && !error && <Loader2 className="mx-auto h-6 w-6 animate-spin text-stone-400" />}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {detail && (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="เบอร์โทร" value={p.phone} />
              {isDriver ? (
                <>
                  <Field label="สถานะการยืนยัน" value={VERIFICATION[p.verificationStatus].label} />
                  <Field label="รุ่นรถ" value={p.vehicleModel ?? "-"} />
                  <Field label="พร้อมเพย์" value={p.promptPayId ?? "ยังไม่ได้ตั้งค่า"} />
                  <Field label="สถานะคิว" value={p.isOnline ? (p.isAvailable ? "ออนไลน์ รอรับงาน" : "ออนไลน์ อยู่ระหว่างทริป") : "ออฟไลน์"} />
                </>
              ) : (
                <Field label="รหัสนิสิต" value={p.studentId ?? "-"} />
              )}
              <Field label="สมัครเมื่อ" value={formatDate(p.createdAt)} />
            </dl>

            <div className="grid grid-cols-3 gap-3">
              <Stat label="ทริปทั้งหมด" value={s.totalTrips} />
              <Stat label="สำเร็จ" value={s.completedTrips} />
              <Stat label="ยกเลิก" value={s.cancelledTrips} />
              <Stat label={isDriver ? "รายได้รวม" : "ยอดใช้จ่ายรวม"} value={`${s.totalFare} ฿`} />
              <Stat label="ข้อพิพาทการจ่ายเงิน" value={s.disputedPayments} warn={s.disputedPayments > 0} />
              <Stat
                label={isDriver ? "คะแนนจากผู้โดยสาร" : "คะแนนจากคนขับ"}
                value={s.ratingAvg ? `${s.ratingAvg} (${s.ratingCount})` : "-"}
              />
            </div>

            {docs.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-stone-700">เอกสารยืนยันตัวตน</h3>
                <div className="grid grid-cols-5 gap-2">
                  {docs.map((d) => (
                    <a key={d.label} href={d.url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1">
                      <img src={d.url} alt={d.label} className="h-16 w-full rounded-lg border border-stone-200 object-cover" />
                      <span className="text-[11px] text-stone-500">{d.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ระงับ/ปลดระงับ */}
            {p.isSuspended ? (
              <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                  <Ban className="h-4 w-4" /> บัญชีนี้ถูกระงับเมื่อ {formatDate(p.suspendedAt, true)}
                </p>
                <p className="text-sm text-red-700">เหตุผล: {p.suspendedReason}</p>
                <Button onClick={() => act("unsuspend")} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} ปลดระงับบัญชี
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-stone-700">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" /> ระงับบัญชี
                </p>
                {s.runningTrips > 0 && (
                  <p className="text-xs text-amber-700">มีทริปที่กำลังดำเนินการอยู่ {s.runningTrips} รายการ ระงับได้หลังทริปเสร็จสิ้น</p>
                )}
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="เหตุผลที่ระงับ (บังคับ) เช่น ถูกร้องเรียนซ้ำ ๆ"
                  rows={2}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <Button variant="danger" onClick={suspend} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} ระงับบัญชี
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-stone-700">ทริปล่าสุด</h3>
              {detail.trips.length === 0 && <p className="text-sm text-stone-500">ยังไม่มีทริป</p>}
              {detail.trips.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-stone-900">
                      {t.pickupAddress ?? "จุดรับ"} → {t.destinationAddress ?? "ปลายทาง"}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatDate(t.requestedAt, true)} · {isDriver ? t.user?.fullName : (t.driver?.fullName ?? "ยังไม่มีคนขับ")}
                    </p>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1">
                    <Badge tone={TRIP_STATUS[t.status].tone} className="px-2 py-0.5 text-xs">
                      {TRIP_STATUS[t.status].label}
                    </Badge>
                    <span className="text-xs text-stone-500">{t.fare ?? "-"} ฿</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-stone-400">{label}</dt>
      <dd className="text-stone-900">{value}</dd>
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className={clsx("rounded-lg border px-3 py-2", warn ? "border-amber-300 bg-amber-50" : "border-stone-200")}>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-lg font-semibold text-stone-900">{value}</p>
    </div>
  );
}
