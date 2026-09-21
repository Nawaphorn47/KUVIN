import { useNavigate } from "react-router-dom";
import { Mail, KeyRound } from "lucide-react";
import Screen from "../../components/layout/Screen";
import TopBar from "../../components/layout/TopBar";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function ForgotPassword() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="ลืมรหัสผ่าน" />
      <Screen className="items-center gap-6 pt-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <KeyRound className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">รีเซ็ตรหัสผ่าน</h1>
          <p className="mt-2 text-sm text-slate-500">
            กรอกอีเมล @ku.th ของคุณ เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้
          </p>
        </div>

        <form
          className="flex w-full flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("/login");
          }}
        >
          <Input label="อีเมล (@ku.th)" icon={Mail} type="email" placeholder="student@ku.th" />
          <Button type="submit">ส่งลิงก์รีเซ็ตรหัสผ่าน</Button>
        </form>

        <button onClick={() => navigate("/login")} className="text-sm text-slate-500">
          กลับไป Login
        </button>
      </Screen>
    </div>
  );
}
