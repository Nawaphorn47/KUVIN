import { Globe, ShieldCheck, LifeBuoy, Info, ChevronRight } from "lucide-react";
import Screen from "../../components/layout/Screen";
import TopBar from "../../components/layout/TopBar";
import Card from "../../components/ui/Card";

const sections = [
  {
    title: "ภาษาและภูมิภาค",
    items: [{ icon: Globe, label: "ภาษา", value: "ไทย" }],
  },
  {
    title: "ความปลอดภัย",
    items: [{ icon: ShieldCheck, label: "นโยบายความเป็นส่วนตัว" }],
  },
  {
    title: "ช่วยเหลือ",
    items: [
      { icon: LifeBuoy, label: "Help Center" },
      { icon: Info, label: "เกี่ยวกับ KU VIN" },
    ],
  },
];

export default function Settings() {
  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="ตั้งค่า" />
      <Screen className="gap-6 pt-2">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {section.title}
            </p>
            <Card className="divide-y divide-slate-100 p-0 shadow-none ring-slate-100">
              {section.items.map(({ icon: Icon, label, value }) => (
                <button
                  key={label}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <Icon className="h-5 w-5 text-slate-400" />
                  <span className="flex-1 text-sm font-medium text-slate-900">{label}</span>
                  {value && <span className="text-sm text-slate-400">{value}</span>}
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              ))}
            </Card>
          </div>
        ))}

        <p className="pt-4 text-center text-xs text-slate-400">
          KU VIN by มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน
        </p>
      </Screen>
    </div>
  );
}
