import { useNavigate } from "react-router-dom";
import { ChevronRight, Globe, LifeBuoy, Phone } from "lucide-react";
import TopBar from "../../components/layout/TopBar";
import { emergencyContactsFor } from "../../lib/emergencyContacts";
import { useArea } from "../../context/AreaContext";

// เดิมทุกเมนูในหน้านี้กดแล้วไม่เกิดอะไร (นโยบายความเป็นส่วนตัว / Help Center / เกี่ยวกับ) — เหลือเฉพาะที่ใช้งานได้จริง
// นโยบายความเป็นส่วนตัวเอาออกไว้ก่อน: ต้องเป็นข้อความจริงตาม PDPA ที่เจ้าของโครงงานเขียนเอง ไม่ใช่ข้อความตัวอย่าง
export default function Settings() {
  const navigate = useNavigate();
  const { area } = useArea();
  const emergencyContacts = emergencyContactsFor(area);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <TopBar title="ตั้งค่า" />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-5">
        <section aria-labelledby="lang-title">
          <h2 id="lang-title" className="mb-2 text-sm font-semibold text-slate-600">
            ภาษา
          </h2>
          <div className="flex min-h-[3.5rem] items-center gap-3 rounded-xl bg-white px-4 ring-1 ring-slate-200">
            <Globe className="h-5 w-5 flex-none text-slate-500" aria-hidden="true" />
            <span className="flex-1 text-[15px] font-semibold text-slate-900">ภาษาของแอป</span>
            <span className="text-[15px] text-slate-600">ไทย</span>
          </div>
        </section>

        <section aria-labelledby="help-title" className="mt-6">
          <h2 id="help-title" className="mb-2 text-sm font-semibold text-slate-600">
            ช่วยเหลือ
          </h2>
          <button
            type="button"
            onClick={() => navigate("/chatbot")}
            className="flex min-h-[3.5rem] w-full items-center gap-3 rounded-xl bg-white px-4 text-left ring-1 ring-slate-200 active:bg-slate-50"
          >
            <LifeBuoy className="h-5 w-5 flex-none text-slate-500" aria-hidden="true" />
            <span className="flex-1 text-[15px] font-semibold text-slate-900">คำถามที่พบบ่อย</span>
            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </button>
        </section>

        <section aria-labelledby="emg-title" className="mt-6">
          <h2 id="emg-title" className="mb-2 text-sm font-semibold text-slate-600">
            เบอร์ฉุกเฉิน{area ? ` · ${area.displayName}` : ""}
          </h2>
          <ul className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            {emergencyContacts.map((c) => (
              <li key={c.phone} className="border-b border-slate-200 last:border-b-0">
                <a href={`tel:${c.phone}`} className="flex min-h-[3.5rem] items-center gap-3 px-4 active:bg-slate-50">
                  <Phone className="h-5 w-5 flex-none text-here" aria-hidden="true" />
                  <span className="flex-1 text-[15px] font-semibold text-slate-900">{c.label}</span>
                  <span className="tabular text-lg font-bold text-slate-900">{c.phone}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-center text-sm leading-relaxed text-slate-600">
          KUVIN — แพลตฟอร์มเรียกวินมอเตอร์ไซค์
          {area && <span className="block">วิทยาเขตที่ให้บริการ: {area.name}</span>}
          <span className="block">โครงงานปัญหาพิเศษ สาขาวิชาเทคโนโลยีสารสนเทศ มก. กำแพงแสน</span>
        </p>
      </main>
    </div>
  );
}
