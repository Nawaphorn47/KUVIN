import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, KeyRound, Loader2, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import Button from "../components/Button";
import Badge from "../components/Badge";
import { PageHeader } from "../components/AdminLayout";
import { api } from "../services/api";
import { useAdminSession } from "../lib/adminSession";

// super admin จัดการบัญชีผู้ดูแล: สร้างแอดมินให้แต่ละพื้นที่ เปลี่ยนบทบาท/พื้นที่ ตั้งรหัสผ่านใหม่ ลบบัญชี
const ROLE_LABEL = { SUPER_ADMIN: "ผู้ดูแลระบบสูงสุด", AREA_ADMIN: "แอดมินพื้นที่" };

export default function AdminAccounts() {
  const { admin: me, areas } = useAdminSession();
  const [admins, setAdmins] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // {} = สร้างใหม่, object = แก้ไข

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/admins");
      setAdmins(data);
    } catch (err) {
      setError(err.response?.data?.message || "โหลดรายชื่อแอดมินไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(a) {
    if (!window.confirm(`ลบบัญชีแอดมิน "${a.fullName}" (${a.email})?\nบัญชีนี้จะเข้าสู่ระบบไม่ได้อีก`)) return;
    setError("");
    try {
      await api.delete(`/admin/admins/${a.id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "ลบไม่สำเร็จ");
    }
  }

  return (
    <div>
      <PageHeader
        title="บัญชีผู้ดูแล"
        subtitle="แอดมินพื้นที่เห็นและจัดการได้เฉพาะพื้นที่ของตัวเอง ส่วนผู้ดูแลระบบสูงสุดเห็นทุกพื้นที่"
        actions={
          <Button onClick={() => setEditing({})} disabled={areas.length === 0}>
            <Plus className="h-4 w-4" /> เพิ่มแอดมิน
          </Button>
        }
      />
      <div className="mx-auto max-w-7xl px-8 py-8">
        {error && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" /> {error}
          </p>
        )}
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-600">
              <tr>
                <th className="px-4 py-3">ชื่อ</th>
                <th className="px-4 py-3">อีเมล</th>
                <th className="px-4 py-3">บทบาท</th>
                <th className="px-4 py-3">พื้นที่ที่ดูแล</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {!admins && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-stone-400" />
                  </td>
                </tr>
              )}
              {admins?.map((a) => (
                <tr key={a.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium text-stone-900">
                    {a.fullName}
                    {a.id === me.id && <span className="ml-2 text-xs text-stone-400">(คุณ)</span>}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{a.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={a.role === "SUPER_ADMIN" ? "warning" : "info"} className="px-2 py-0.5 text-xs">
                      {a.role === "SUPER_ADMIN" && <ShieldCheck className="mr-1 h-3 w-3" />}
                      {ROLE_LABEL[a.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{a.role === "SUPER_ADMIN" ? "ทุกพื้นที่" : (a.area?.displayName ?? "-")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing(a)}
                        className="rounded-lg p-2 text-stone-500 hover:bg-emerald-50 hover:text-emerald-800"
                        aria-label="แก้ไข"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {a.id !== me.id && (
                        <button
                          onClick={() => remove(a)}
                          className="rounded-lg p-2 text-stone-500 hover:bg-red-50 hover:text-red-700"
                          aria-label="ลบ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <AdminModal
          target={editing}
          areas={areas}
          isSelf={editing.id === me.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function AdminModal({ target, areas, isSelf, onClose, onSaved }) {
  const creating = !target.id;
  const [fullName, setFullName] = useState(target.fullName ?? "");
  const [email, setEmail] = useState(target.email ?? "");
  const [role, setRole] = useState(target.role ?? "AREA_ADMIN");
  const [areaId, setAreaId] = useState(target.areaId ?? areas[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if ((creating || password) && password.length < 12) return setError("รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร");
    setSaving(true);
    try {
      const body = { fullName, role, areaId: role === "AREA_ADMIN" ? areaId : null };
      if (creating) await api.post("/admin/admins", { ...body, email, password });
      else await api.patch(`/admin/admins/${target.id}`, { ...body, ...(password ? { password } : {}) });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-emerald-900">{creating ? "เพิ่มแอดมิน" : "แก้ไขแอดมิน"}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-stone-100" aria-label="ปิด">
            <X className="h-5 w-5" />
          </button>
        </div>

        <Label text="ชื่อ-นามสกุล">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputCls} />
        </Label>
        <Label text="อีเมล (ใช้เข้าสู่ระบบ)">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!creating}
            className={inputCls}
          />
        </Label>
        <Label text="บทบาท">
          <select value={role} onChange={(e) => setRole(e.target.value)} disabled={isSelf} className={inputCls}>
            <option value="AREA_ADMIN">แอดมินพื้นที่ — จัดการเฉพาะพื้นที่ที่กำหนด</option>
            <option value="SUPER_ADMIN">ผู้ดูแลระบบสูงสุด — เห็นทุกพื้นที่ สร้างพื้นที่/แอดมินได้</option>
          </select>
        </Label>
        {role === "AREA_ADMIN" && (
          <Label text="พื้นที่ที่ดูแล">
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)} required className={inputCls}>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName}
                </option>
              ))}
            </select>
          </Label>
        )}
        <Label text={creating ? "รหัสผ่านเริ่มต้น" : "ตั้งรหัสผ่านใหม่ (เว้นว่าง = ไม่เปลี่ยน)"}>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="อย่างน้อย 12 ตัวอักษร"
              autoComplete="new-password"
              className={`${inputCls} pl-9`}
            />
          </div>
        </Label>
        {creating && (
          <p className="text-xs text-stone-500">ส่งอีเมลและรหัสผ่านให้แอดมินคนนั้นทางช่องทางที่ปลอดภัย ถ้าลืมรหัส ตั้งรหัสใหม่ให้ได้จากหน้านี้</p>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-none" /> {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {creating ? "สร้างบัญชี" : "บันทึก"}
          </Button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 disabled:bg-stone-100 disabled:text-stone-500";

function Label({ text, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-stone-600">{text}</span>
      {children}
    </label>
  );
}
