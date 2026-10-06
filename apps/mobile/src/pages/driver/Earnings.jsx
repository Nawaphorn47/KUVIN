import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CircleDot,
  Droplet,
  Fuel,
  Gauge,
  Hammer,
  Loader2,
  Plus,
  Receipt,
  Settings2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import clsx from "clsx";
import BottomNav from "../../components/layout/BottomNav";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { api } from "../../lib/api";

// หน้าการเงินของคนขับ: รายรับจากทริป − รายจ่าย (น้ำมัน + ต้นทุนที่จดเอง เช่น เปลี่ยนยาง) = กำไร
// ข้อมูลสรุปคำนวณที่ backend (finance.service.js) ตัดช่วงตามเวลาไทย

const PERIODS = [
  { value: "day", label: "รายวัน", rangeLabel: "7 วันล่าสุด", currentLabel: "วันนี้" },
  { value: "week", label: "รายสัปดาห์", rangeLabel: "8 สัปดาห์ล่าสุด", currentLabel: "สัปดาห์นี้" },
  { value: "month", label: "รายเดือน", rangeLabel: "6 เดือนล่าสุด", currentLabel: "เดือนนี้" },
];

const CATEGORY_META = {
  FUEL: { label: "เติมน้ำมัน", icon: Fuel, color: "bg-amber-50 text-amber-600" },
  TIRE: { label: "เปลี่ยนยาง", icon: CircleDot, color: "bg-slate-100 text-slate-700" },
  ENGINE_OIL: { label: "น้ำมันเครื่อง", icon: Droplet, color: "bg-sky-50 text-sky-600" },
  MAINTENANCE: { label: "เช็กระยะ/บำรุงรักษา", icon: Wrench, color: "bg-emerald-50 text-emerald-600" },
  REPAIR: { label: "ซ่อมรถ", icon: Hammer, color: "bg-red-50 text-red-600" },
  OTHER: { label: "อื่น ๆ", icon: Receipt, color: "bg-violet-50 text-violet-600" },
};

// ชื่อช่วงสำหรับข้อความ — ป้ายช่วงรายสัปดาห์เป็นวันจันทร์ต้นสัปดาห์ เติมคำว่า "สัปดาห์" ให้ไม่สับสนกับรายวัน
const bucketTitle = (period, b) => (period === "week" ? `สัปดาห์ ${b.label}` : b.label);

const baht = (n) => `${Math.round(n ?? 0).toLocaleString("th-TH")} ฿`;
const num = (n, digits = 1) => (n == null ? "-" : Number(n).toLocaleString("th-TH", { maximumFractionDigits: digits }));

export default function Earnings() {
  const [period, setPeriod] = useState("day");
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [selected, setSelected] = useState(null); // index ของช่วงที่แตะบนกราฟ (ค่าเริ่มต้น = ช่วงล่าสุด)
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState(null); // { type: "expense", expense? } | { type: "vehicle" }

  const load = useCallback(async () => {
    setError("");
    try {
      const [s, e] = await Promise.all([
        api.get("/drivers/me/finance", { params: { period } }),
        api.get("/drivers/me/expenses", { params: { limit: 30 } }),
      ]);
      setSummary(s.data);
      setExpenses(e.data);
      setSelected(s.data.series.length - 1);
    } catch (err) {
      setError(err.response?.data?.message || "โหลดข้อมูลการเงินไม่สำเร็จ");
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const periodMeta = PERIODS.find((p) => p.value === period);
  const bucket = summary && selected != null ? summary.series[selected] : null;
  const isCurrent = summary && selected === summary.series.length - 1;

  function closeSheet(changed) {
    setSheet(null);
    if (changed) load();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto bg-slate-50">
        {/* หัวหน้าจอ: กำไรของช่วงที่เลือก */}
        <div className="flex flex-col gap-4 rounded-b-[2rem] bg-gradient-to-b from-emerald-600 to-emerald-700 px-5 pb-6 pt-6 text-white">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">การเงินของฉัน</h1>
            <button
              onClick={() => setSheet({ type: "vehicle" })}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold active:bg-white/25"
            >
              <Settings2 className="h-4 w-4" /> ตั้งค่ารถ
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-full bg-white/10 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={clsx(
                  "rounded-full py-1.5 text-xs font-semibold transition-colors",
                  period === p.value ? "bg-white text-emerald-700" : "text-white/75"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div>
            <p className="text-sm text-emerald-100">
              กำไรสุทธิ · {bucket ? (isCurrent ? periodMeta.currentLabel : bucketTitle(period, bucket)) : "..."}
            </p>
            <p className={clsx("text-4xl font-bold", bucket && bucket.profit < 0 && "text-red-200")}>
              {bucket ? baht(bucket.profit) : "—"}
            </p>
            {bucket && (
              <p className="mt-1 text-xs text-emerald-100">
                {bucket.trips} เที่ยว · {num(bucket.distanceKm)} กม.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatPill icon={TrendingUp} label="รายรับ" value={bucket ? baht(bucket.income) : "—"} />
            <StatPill
              icon={TrendingDown}
              label="รายจ่าย"
              value={bucket ? baht(bucket.expenses) : "—"}
              hint={bucket?.fuelSource === "estimated" ? "รวมค่าน้ำมันโดยประมาณ" : null}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-6 pt-4">
          {error && (
            <p className="flex items-center gap-1.5 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 flex-none" /> {error}
            </p>
          )}

          {!summary && !error && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
            </div>
          )}

          {summary && (
            <>
              <Section
                title="รายรับ–รายจ่าย"
                subtitle={`${periodMeta.rangeLabel} · แตะแท่งเพื่อดูรายละเอียด`}
              >
                <IncomeExpenseChart series={summary.series} selected={selected} onSelect={setSelected} />
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <MiniTotal label="รายรับรวม" value={baht(summary.totals.income)} className="text-emerald-600" />
                  <MiniTotal label="รายจ่ายรวม" value={baht(summary.totals.expenses)} className="text-red-500" />
                  <MiniTotal
                    label="กำไรรวม"
                    value={baht(summary.totals.profit)}
                    className={summary.totals.profit < 0 ? "text-red-600" : "text-slate-900"}
                  />
                </div>
              </Section>

              <FuelCard fuel={summary.fuel} bucket={bucket} title={bucket && bucketTitle(period, bucket)} onSetup={() => setSheet({ type: "vehicle" })} />

              {summary.byCategory.length > 0 && (
                <Section title="รายจ่ายแยกหมวด" subtitle={periodMeta.rangeLabel}>
                  <CategoryBreakdown items={summary.byCategory} />
                </Section>
              )}
            </>
          )}

          <Section
            title="บันทึกต้นทุน"
            subtitle="เติมน้ำมัน เปลี่ยนยาง ซ่อมรถ ฯลฯ"
            action={
              <button
                onClick={() => setSheet({ type: "expense" })}
                className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white active:bg-emerald-700"
              >
                <Plus className="h-4 w-4" /> จดรายจ่าย
              </button>
            }
          >
            {expenses && expenses.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Wallet className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">ยังไม่มีรายการ</p>
                <p className="text-xs text-slate-400">จดค่าน้ำมันพร้อมเลขไมล์ทุกครั้งที่เติมเต็มถัง ระบบจะคำนวณอัตราสิ้นเปลืองจริงให้</p>
              </div>
            )}
            <div className="flex flex-col divide-y divide-slate-100">
              {(expenses ?? []).map((e) => (
                <ExpenseRow key={e.id} expense={e} onClick={() => setSheet({ type: "expense", expense: e })} />
              ))}
            </div>
          </Section>
        </div>
      </div>
      <BottomNav />

      <AnimatePresence>
        {sheet?.type === "expense" && <ExpenseSheet key="expense" expense={sheet.expense} onClose={closeSheet} />}
        {sheet?.type === "vehicle" && <VehicleSheet key="vehicle" fuel={summary?.fuel} onClose={closeSheet} />}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ชิ้นส่วนหน้าจอ
// ---------------------------------------------------------------------------
function StatPill({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="flex items-center gap-1 text-xs text-emerald-100">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="text-lg font-bold">{value}</p>
      {hint && <p className="text-[10px] text-emerald-100/80">{hint}</p>}
    </div>
  );
}

function Section({ title, subtitle, action, children }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MiniTotal({ label, value, className }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={clsx("text-sm font-bold", className)}>{value}</p>
    </div>
  );
}

// กราฟแท่งคู่ รายรับ (เขียว) / รายจ่าย (แดง) ต่อช่วง — วาดด้วย SVG เองไม่ต้องพึ่งไลบรารีกราฟ
function IncomeExpenseChart({ series, selected, onSelect }) {
  const W = 320;
  const H = 150;
  const top = 8;
  const bottom = 22;
  const plotH = H - top - bottom;
  const max = Math.max(1, ...series.flatMap((b) => [b.income, b.expenses]));
  const slot = W / series.length;
  const barW = Math.min(14, slot / 3);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="กราฟรายรับรายจ่าย">
        {[0.5, 1].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={top + plotH * (1 - f)}
            y2={top + plotH * (1 - f)}
            className="stroke-slate-100"
            strokeDasharray="3 3"
          />
        ))}
        <line x1="0" x2={W} y1={top + plotH} y2={top + plotH} className="stroke-slate-200" />
        {series.map((b, i) => {
          const cx = slot * i + slot / 2;
          const incomeH = (b.income / max) * plotH;
          const expenseH = (b.expenses / max) * plotH;
          const active = i === selected;
          return (
            <g key={b.label} onClick={() => onSelect(i)} className="cursor-pointer">
              <rect x={slot * i} y="0" width={slot} height={H} className={active ? "fill-emerald-50" : "fill-transparent"} rx="8" />
              <rect
                x={cx - barW - 1}
                y={top + plotH - incomeH}
                width={barW}
                height={Math.max(incomeH, b.income > 0 ? 2 : 0)}
                rx="3"
                className="fill-emerald-500"
              />
              <rect
                x={cx + 1}
                y={top + plotH - expenseH}
                width={barW}
                height={Math.max(expenseH, b.expenses > 0 ? 2 : 0)}
                rx="3"
                className={b.fuelSource === "estimated" && b.otherExpenses === 0 ? "fill-red-300" : "fill-red-400"}
              />
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                className={clsx("text-[9px]", active ? "fill-emerald-700 font-bold" : "fill-slate-400")}
              >
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> รายรับ
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-400" /> รายจ่าย
        </span>
      </div>
    </div>
  );
}

function FuelCard({ fuel, bucket, title, onSetup }) {
  const configured = fuel.kmPerLiter != null && fuel.pricePerLiter != null;
  const kmplSource = fuel.measuredKmPerLiter != null ? "วัดจากการเติมจริง" : "ตามที่ตั้งไว้";

  return (
    <Section title="น้ำมันและอัตราสิ้นเปลือง" subtitle="ใช้คำนวณต้นทุนต่อกิโลเมตร">
      {!configured ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            ตั้งค่ารถกินน้ำมันกี่ กม./ลิตร และราคาน้ำมัน เพื่อให้ระบบประมาณค่าน้ำมันจากระยะทางที่วิ่งได้
          </p>
          <Button size="md" variant="secondary" onClick={onSetup}>
            <Gauge className="h-4 w-4" /> ตั้งค่าอัตราสิ้นเปลือง
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <FuelStat label="อัตราสิ้นเปลือง" value={`${num(fuel.kmPerLiter)}`} unit="กม./ลิตร" hint={kmplSource} />
          <FuelStat label="ราคาน้ำมัน" value={num(fuel.pricePerLiter, 2)} unit="บาท/ลิตร" />
          <FuelStat label="ต้นทุนน้ำมัน" value={num(fuel.costPerKm, 2)} unit="บาท/กม." />
        </div>
      )}

      {bucket && bucket.fuelSource !== "none" && (
        <p className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
          ค่าน้ำมันช่วง {title}: <b className="text-slate-900">{baht(bucket.fuelCost)}</b>{" "}
          {bucket.fuelSource === "recorded" ? "(จากที่จดเติมจริง)" : `(ประมาณจาก ${num(bucket.distanceKm)} กม. ที่พาผู้โดยสาร)`}
        </p>
      )}
      {fuel.measuredKmPerLiter == null && configured && (
        <p className="mt-2 text-[11px] text-slate-400">
          จดเติมน้ำมันเต็มถังพร้อมเลขไมล์อย่างน้อย 2 ครั้ง ระบบจะคำนวณอัตราสิ้นเปลืองจริงแทนค่าที่ตั้งไว้
        </p>
      )}
    </Section>
  );
}

function FuelStat({ label, value, unit, hint }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-2.5 text-center">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-400">{unit}</p>
      {hint && <p className="mt-0.5 text-[10px] font-medium text-emerald-600">{hint}</p>}
    </div>
  );
}

function CategoryBreakdown({ items }) {
  const total = items.reduce((s, c) => s + c.amount, 0);
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((c) => {
        const meta = CATEGORY_META[c.category];
        const pct = total ? (c.amount / total) * 100 : 0;
        return (
          <div key={c.category} className="flex items-center gap-3">
            <span className={clsx("flex h-8 w-8 flex-none items-center justify-center rounded-full", meta.color)}>
              <meta.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-700">{meta.label}</span>
                <span className="font-semibold text-slate-900">{baht(c.amount)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExpenseRow({ expense, onClick }) {
  const meta = CATEGORY_META[expense.category] ?? CATEGORY_META.OTHER;
  const details = [
    new Date(expense.occurredAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }),
    expense.liters != null && `${num(expense.liters, 2)} ลิตร`,
    expense.odometerKm != null && `ไมล์ ${num(expense.odometerKm, 0)}`,
  ].filter(Boolean);

  return (
    <button onClick={onClick} className="flex items-center gap-3 py-3 text-left active:bg-slate-50">
      <span className={clsx("flex h-10 w-10 flex-none items-center justify-center rounded-full", meta.color)}>
        <meta.icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-800">{expense.note || meta.label}</span>
        <span className="block truncate text-xs text-slate-400">{details.join(" · ")}</span>
      </span>
      <span className="flex-none text-sm font-bold text-red-500">−{baht(expense.amount)}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// แผ่นฟอร์ม (bottom sheet)
// ---------------------------------------------------------------------------
function Sheet({ title, onClose, children }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => onClose(false)}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar flex max-h-[90vh] w-full max-w-[430px] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-5"
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={() => onClose(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

// yyyy-mm-dd ตามเวลาเครื่อง (input type=date ใช้รูปแบบนี้)
function toDateInput(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ExpenseSheet({ expense, onClose }) {
  const editing = Boolean(expense);
  const [category, setCategory] = useState(expense?.category ?? "FUEL");
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? "");
  const [date, setDate] = useState(toDateInput(expense?.occurredAt ?? new Date()));
  const [note, setNote] = useState(expense?.note ?? "");
  const [liters, setLiters] = useState(expense?.liters?.toString() ?? "");
  const [odometer, setOdometer] = useState(expense?.odometerKm?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const today = toDateInput(new Date());

  async function save(e) {
    e.preventDefault();
    setError("");
    if (!(Number(amount) > 0)) return setError("กรุณากรอกจำนวนเงิน");
    if (date > today) return setError("วันที่ต้องไม่เกินวันนี้");

    // วันนี้ = ใช้เวลาปัจจุบัน, วันก่อนหน้า = เที่ยงวันของวันนั้น (กันตกไปวันข้างเคียงเพราะเขตเวลา)
    const occurredAt = date === today ? new Date() : new Date(`${date}T12:00:00`);
    const body = {
      category,
      amount: Number(amount),
      occurredAt: occurredAt.toISOString(),
      note,
      liters: category === "FUEL" ? liters : null,
      odometerKm: category === "FUEL" ? odometer : null,
    };

    setSaving(true);
    try {
      if (editing) await api.patch(`/drivers/me/expenses/${expense.id}`, body);
      else await api.post("/drivers/me/expenses", body);
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    setSaving(true);
    try {
      await api.delete(`/drivers/me/expenses/${expense.id}`);
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.message || "ลบไม่สำเร็จ");
      setSaving(false);
    }
  }

  return (
    <Sheet title={editing ? "แก้ไขรายจ่าย" : "จดรายจ่าย"} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={save}>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(CATEGORY_META).map(([value, meta]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={clsx(
                "flex flex-col items-center gap-1 rounded-2xl p-2.5 text-[11px] font-medium ring-1 transition-colors",
                category === value ? "bg-emerald-50 text-emerald-700 ring-emerald-400" : "bg-white text-slate-600 ring-slate-200"
              )}
            >
              <meta.icon className="h-5 w-5" />
              {meta.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="จำนวนเงิน (บาท)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input label="วันที่" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {category === "FUEL" && (
          <div className="flex flex-col gap-2 rounded-2xl bg-amber-50 p-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="จำนวนลิตร"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="ไม่บังคับ"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
              />
              <Input
                label="เลขไมล์ (กม.)"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="ไม่บังคับ"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-amber-800">
              เติมเต็มถังแล้วจดลิตร + เลขไมล์ทุกครั้ง ระบบจะคำนวณ กม./ลิตร จริงของรถคุณ
            </p>
          </div>
        )}

        <Input
          label="บันทึกเพิ่มเติม"
          placeholder={category === "TIRE" ? "เช่น ยางหลัง IRC" : "ไม่บังคับ"}
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 flex-none" /> {error}
          </p>
        )}

        <div className="flex gap-2">
          {editing && (
            <Button type="button" variant={confirmDelete ? "danger" : "ghost"} size="md" className="w-auto px-4" onClick={remove} disabled={saving}>
              <Trash2 className="h-4 w-4" /> {confirmDelete ? "ยืนยันลบ" : "ลบ"}
            </Button>
          )}
          <Button type="submit" size="md" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function VehicleSheet({ fuel, onClose }) {
  const [kmpl, setKmpl] = useState(fuel?.kmPerLiterSetting?.toString() ?? "");
  const [price, setPrice] = useState(fuel?.pricePerLiterSetting?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.patch("/drivers/me/vehicle", { fuelKmPerLiter: kmpl, fuelPricePerLiter: price });
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
      setSaving(false);
    }
  }

  return (
    <Sheet title="ตั้งค่ารถ" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={save}>
        <Input
          label="รถกินน้ำมัน (กม./ลิตร)"
          type="number"
          inputMode="decimal"
          min="5"
          max="150"
          step="0.1"
          placeholder="เช่น 45"
          value={kmpl}
          onChange={(e) => setKmpl(e.target.value)}
        />
        <Input
          label="ราคาน้ำมัน (บาท/ลิตร)"
          type="number"
          inputMode="decimal"
          min="1"
          max="200"
          step="0.01"
          placeholder="เช่น 35.50"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <p className="text-xs text-slate-500">
          ถ้ามีการจดเติมน้ำมันพร้อมเลขไมล์แล้ว ระบบจะใช้อัตราสิ้นเปลืองที่วัดได้จริงแทนค่านี้ ส่วนราคาน้ำมันถ้าเว้นว่าง
          จะใช้ราคาจากการเติมครั้งล่าสุด
        </p>
        {fuel?.measuredKmPerLiter != null && (
          <p className="rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800">
            วัดจากการเติมจริงได้ {num(fuel.measuredKmPerLiter)} กม./ลิตร
          </p>
        )}
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 flex-none" /> {error}
          </p>
        )}
        <Button type="submit" size="md" disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </form>
    </Sheet>
  );
}
