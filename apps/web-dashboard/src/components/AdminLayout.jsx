import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import {
  Bike,
  Building2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Map as MapIcon,
  MapPinned,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { useAdminSession } from "../lib/adminSession";

// โครงหน้าแอดมิน: แถบเมนูซ้าย + ตัวเลือกพื้นที่ (super) / ชื่อพื้นที่ (แอดมินพื้นที่)
export default function AdminLayout() {
  const navigate = useNavigate();
  const { admin, isSuper, areas, areaId, area, setAreaId, logout, ready } = useAdminSession();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
      </div>
    );
  }
  if (!admin) return <Navigate to="/login" replace />;

  const nav = [
    { to: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
    { to: "/people", label: "ผู้ใช้และคนขับ", icon: Users },
    { to: "/landmarks", label: "สถานที่", icon: MapIcon },
    // ตั้งค่าพื้นที่: แอดมินพื้นที่แก้ของตัวเอง / super ต้องเลือกพื้นที่ก่อน
    (!isSuper || areaId) && { to: "/area-settings", label: "ตั้งค่าพื้นที่", icon: Settings2 },
  ].filter(Boolean);
  const superNav = [
    { to: "/areas", label: "พื้นที่ทั้งหมด", icon: Building2 },
    { to: "/admins", label: "บัญชีผู้ดูแล", icon: ShieldCheck },
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen bg-stone-50">
      <aside className="flex w-64 flex-none flex-col border-r border-stone-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white">
            <Bike className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-bold leading-tight text-emerald-900">KU VIN Admin</p>
            <p className="text-xs text-stone-400">{isSuper ? "ผู้ดูแลระบบสูงสุด" : "ผู้ดูแลพื้นที่"}</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-stone-500">
            <MapPinned className="h-3.5 w-3.5" /> พื้นที่ที่กำลังดู
          </p>
          {isSuper ? (
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-900 outline-none focus:border-emerald-700"
            >
              <option value="">ทุกพื้นที่</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName}
                  {a.isActive ? "" : " (ปิดอยู่)"}
                </option>
              ))}
            </select>
          ) : (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
              {area?.displayName ?? admin.area?.displayName ?? "-"}
            </p>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {nav.map((item) => (
            <SideLink key={item.to} {...item} />
          ))}
          {isSuper && (
            <>
              <p className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">แพลตฟอร์ม</p>
              {superNav.map((item) => (
                <SideLink key={item.to} {...item} />
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-stone-200 p-4">
          <p className="truncate text-sm font-medium text-stone-900">{admin.fullName}</p>
          <p className="truncate text-xs text-stone-400">{admin.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* key = พื้นที่ → เปลี่ยนพื้นที่แล้วหน้าโหลดข้อมูลใหม่ทั้งหน้า ไม่ค้างข้อมูลพื้นที่เดิม */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet key={areaId || "all"} />
      </main>
    </div>
  );
}

function SideLink({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive ? "bg-emerald-800 text-white" : "text-stone-600 hover:bg-emerald-50 hover:text-emerald-900"
        )
      }
    >
      <Icon className="h-4 w-4" /> {label}
    </NavLink>
  );
}

// หัวหน้าแต่ละหน้า (ใช้ร่วมกันทุกหน้าในแดชบอร์ด)
export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-8 py-5">
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
