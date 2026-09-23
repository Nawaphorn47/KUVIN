import { useNavigate } from "react-router-dom";
import { Globe, LifeBuoy, Phone, ChevronRight } from "lucide-react";
import Screen from "../../components/layout/Screen";
import TopBar from "../../components/layout/TopBar";
import Card from "../../components/ui/Card";
import { emergencyContacts } from "../../lib/emergencyContacts";

// เดิมทุกเมนูในหน้านี้กดแล้วไม่เกิดอะไร (นโยบายความเป็นส่วนตัว / Help Center / เกี่ยวกับ) — เหลือเฉพาะที่ใช้งานได้จริง
// นโยบายความเป็นส่วนตัวเอาออกไว้ก่อน: ต้องเป็นข้อความจริงตาม PDPA ที่เจ้าของโครงงานเขียนเอง ไม่ใช่ข้อความตัวอย่าง
export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="ตั้งค่า" />
      <Screen className="gap-6 pt-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">ภาษาและภูมิภาค</p>
          <Card className="flex items-center gap-3 px-4 py-3.5 shadow-none ring-slate-100">
            <Globe className="h-5 w-5 text-slate-400" />
            <span className="flex-1 text-sm font-medium text-slate-900">ภาษา</span>
            <span className="text-sm text-slate-400">ไทย</span>
          </Card>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">ช่วยเหลือ</p>
          <Card className="p-0 shadow-none ring-slate-100">
            <button
              onClick={() => navigate("/chatbot")}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <LifeBuoy className="h-5 w-5 text-slate-400" />
              <span className="flex-1 text-sm font-medium text-slate-900">คำถามที่พบบ่อย</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>
          </Card>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">เบอร์ฉุกเฉิน</p>
          <Card className="divide-y divide-slate-100 p-0 shadow-none ring-slate-100">
            {emergencyContacts.map((c) => (
              <a key={c.phone} href={`tel:${c.phone}`} className="flex items-center gap-3 px-4 py-3.5">
                <Phone className="h-5 w-5 text-slate-400" />
                <span className="flex-1 text-sm font-medium text-slate-900">{c.label}</span>
                <span className="text-sm font-semibold text-emerald-600">{c.phone}</span>
              </a>
            ))}
          </Card>
        </div>

        <div className="pt-4 text-center text-xs leading-relaxed text-slate-400">
          <p>KU VIN — ระบบเรียกวินมอเตอร์ไซค์ภายในมหาวิทยาลัย</p>
          <p>โครงงานปัญหาพิเศษ สาขาวิชาเทคโนโลยีสารสนเทศ</p>
          <p>มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน</p>
        </div>
      </Screen>
    </div>
  );
}
