import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, ChevronRight, MapPinned, Plus } from "lucide-react";
import clsx from "clsx";
import Button from "../components/Button";
import Badge from "../components/Badge";
import AreaForm, { blankArea } from "../components/AreaForm";
import { PageHeader } from "../components/AdminLayout";
import { api } from "../services/api";
import { useAdminSession } from "../lib/adminSession";

// super admin: ดูทุกพื้นที่ในแพลตฟอร์ม + เปิดพื้นที่ใหม่ (เช่น ขายแฟรนไชส์ให้วินที่อื่นไปใช้)
export default function AreaManager() {
  const navigate = useNavigate();
  const { areas, setAreaId, reloadAreas } = useAdminSession();
  const [creating, setCreating] = useState(false);

  function open(id) {
    setAreaId(id);
    navigate("/area-settings");
  }

  async function create(body) {
    const { data } = await api.post("/admin/areas", body);
    await reloadAreas();
    open(data.id);
  }

  if (creating) {
    return (
      <div>
        <PageHeader
          title="เพิ่มพื้นที่ใหม่"
          subtitle="ตั้งชื่อ ขอบเขต และค่าโดยสาร — สร้างแล้วค่อยเพิ่มแอดมินพื้นที่ในหน้าบัญชีผู้ดูแล"
          actions={
            <Button variant="ghost" onClick={() => setCreating(false)}>
              <ArrowLeft className="h-4 w-4" /> กลับ
            </Button>
          }
        />
        <div className="mx-auto max-w-7xl px-8 py-8">
          <AreaForm initial={blankArea()} mode="create" canManage onSubmit={create} submitLabel="สร้างพื้นที่" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="พื้นที่ทั้งหมด"
        subtitle="แต่ละพื้นที่มีคิวคนขับ ค่าโดยสาร สถานที่ และแอดมินของตัวเอง ผู้โดยสารใช้บัญชีเดียวได้ทุกพื้นที่"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> เพิ่มพื้นที่
          </Button>
        }
      />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-8 py-8 md:grid-cols-2 xl:grid-cols-3">
        {areas.length === 0 && <p className="text-stone-500">ยังไม่มีพื้นที่</p>}
        {areas.map((a) => (
          <button
            key={a.id}
            onClick={() => open(a.id)}
            className={clsx(
              "flex flex-col gap-4 rounded-xl border bg-white p-5 text-left shadow-sm transition-colors hover:border-emerald-600",
              a.isActive ? "border-stone-200" : "border-dashed border-stone-300 opacity-70"
            )}
          >
            <div className="flex items-center gap-3">
              {a.logoUrl ? (
                <img src={a.logoUrl} alt="" className="h-12 w-12 flex-none rounded-xl object-cover" />
              ) : (
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-emerald-800 text-white">
                  <MapPinned className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-emerald-900">{a.displayName}</p>
                <p className="truncate text-xs text-stone-500">{a.name}</p>
              </div>
              <ChevronRight className="h-5 w-5 flex-none text-stone-300" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={a.isActive ? "success" : "neutral"} className="px-2 py-0.5 text-xs">
                {a.isActive ? "เปิดให้บริการ" : "ปิดอยู่"}
              </Badge>
              <Badge tone="info" className="px-2 py-0.5 text-xs">
                เหมาจ่าย {a.flatFare} ฿ · {a.ratePerKm} ฿/กม.
              </Badge>
            </div>
            <div className="grid grid-cols-3 divide-x divide-stone-100 text-center">
              <Count label="คนขับ" value={a._count?.drivers} />
              <Count label="สถานที่" value={a._count?.landmarks} />
              <Count label="แอดมิน" value={a._count?.admins} />
            </div>
            <p className="flex items-center gap-1 text-[11px] text-stone-400">
              <Building2 className="h-3 w-3" /> {a.slug} · รัศมีบริการ {a.serviceRadiusKm} กม.
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Count({ label, value }) {
  return (
    <div>
      <p className="text-xl font-bold text-stone-900">{value ?? 0}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );
}
