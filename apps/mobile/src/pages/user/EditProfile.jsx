import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, IdCard, Phone, User } from "lucide-react";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import AvatarPicker from "../../components/shared/AvatarPicker";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, refreshMe } = useApp();

  const [fullName, setFullName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [studentId, setStudentId] = useState(user.studentId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // โปรไฟล์จริงโหลดมาทีหลัง (async ตอน AppProvider mount) — sync ใหม่ทุกครั้งที่ `user` เปลี่ยน
  // ไม่งั้นค่าว่างตอน mount ครั้งแรกจะค้างอยู่ในฟอร์ม
  useEffect(() => {
    setFullName(user.name ?? "");
    setPhone(user.phone ?? "");
    setStudentId(user.studentId ?? "");
  }, [user]);

  const phoneChanged = phone !== (user.phone ?? "");

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      await api.patch("/users/me", { fullName, phone, studentId });
      await refreshMe();
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TopBar title="ข้อมูลส่วนตัว" onBack={() => navigate("/profile")} />
      <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
        <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5">
          <div className="flex flex-col gap-4">
            <AvatarPicker src={user.avatarUrl} initial={user.avatarInitial} onChanged={refreshMe} className="pb-1" />
            <Input label="ชื่อ-นามสกุล" icon={User} autoComplete="name" maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <div>
              <Input
                label="เบอร์มือถือ"
                icon={Phone}
                inputMode="tel"
                maxLength={10}
                placeholder="08X XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="tabular"
              />
              {phoneChanged && (
                <p className="mt-1.5 text-sm font-medium text-amber-900">เปลี่ยนเบอร์แล้วต้องยืนยันด้วย OTP ใหม่ก่อนเรียกวินครั้งถัดไป</p>
              )}
            </div>
            <Input
              label="รหัสนิสิต / รหัสพนักงาน (ไม่บังคับ)"
              icon={IdCard}
              inputMode="numeric"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
            {user.email && (
              <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                อีเมล <span className="font-semibold text-slate-900">{user.email}</span> ใช้เป็นบัญชีเข้าสู่ระบบ เปลี่ยนไม่ได้
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-xl bg-here-soft px-3 py-2.5 text-sm font-medium text-here">
                {error}
              </p>
            )}
            {saved && (
              <output className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-sm font-bold text-brand-800">
                <Check className="h-4 w-4" strokeWidth={3} /> บันทึกแล้ว
              </output>
            )}
          </div>
        </main>
        <div className="flex-none border-t border-slate-200 bg-white px-4 py-3">
          <Button type="submit" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </form>
    </div>
  );
}
