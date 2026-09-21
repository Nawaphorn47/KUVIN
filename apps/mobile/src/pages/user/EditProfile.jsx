import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, IdCard, Phone, AlertTriangle, CheckCircle2 } from "lucide-react";
import Screen from "../../components/layout/Screen";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, refreshMe } = useApp();

  const [fullName, setFullName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [studentId, setStudentId] = useState(user.studentId ?? "");
  const [saving, setSaving] = useState(false);

  // โปรไฟล์จริงโหลดมาทีหลัง (async ตอน AppProvider mount) — ตอน component นี้ mount ครั้งแรก `user` อาจยังเป็น
  // ค่า mock ชั่วคราวอยู่ ถ้า seed state จากมันครั้งเดียวตอน useState จะได้ค่าผิดค้างไว้ ต้อง sync ใหม่ทุกครั้งที่
  // `user` เปลี่ยน (เช่น ตอนโปรไฟล์จริงโหลดเสร็จ)
  useEffect(() => {
    setFullName(user.name ?? "");
    setPhone(user.phone ?? "");
    setStudentId(user.studentId ?? "");
  }, [user]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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
      setError(err.response?.data?.message || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="ข้อมูลส่วนตัว" onBack={() => navigate("/profile")} />
      <Screen className="gap-4 pt-2">
        <form className="flex flex-col gap-4" onSubmit={handleSave}>
          <Input
            label="ชื่อ-นามสกุล"
            icon={User}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="เบอร์โทรศัพท์"
            icon={Phone}
            placeholder="0xx-xxx-xxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="รหัสนิสิต / รหัสพนักงาน"
            icon={IdCard}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />

          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-400">
            อีเมล: {user.email} — เปลี่ยนอีเมลไม่ได้เพราะใช้เป็นบัญชีเข้าสู่ระบบ
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 flex-none" /> {error}
            </p>
          )}
          {saved && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4 flex-none" /> บันทึกข้อมูลเรียบร้อยแล้ว
            </p>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </form>
      </Screen>
    </div>
  );
}
