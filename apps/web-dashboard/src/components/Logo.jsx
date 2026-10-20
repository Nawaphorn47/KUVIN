// โลโก้ KUVIN (ไฟล์ SVG อยู่ที่ public/brand — สร้างจาก docs/brand)
// variant: "mark" = เครื่องหมายเดี่ยว | "lockup" = เครื่องหมาย + ชื่อแนวตั้ง | "horizontal" = แนวนอน
// dark = ใช้บนพื้นสีเข้ม/สีแบรนด์ (ชื่อสีขาว ช่องบนเข้มขึ้น)
const FILES = {
  mark: ["kuvin-mark", "kuvin-mark-dark"],
  lockup: ["kuvin-logo", "kuvin-logo-dark"],
  horizontal: ["kuvin-horizontal", "kuvin-horizontal-dark"],
};

export default function Logo({ variant = "mark", dark = false, className = "h-10 w-10" }) {
  const file = FILES[variant][dark ? 1 : 0];
  return <img src={`/brand/${file}.svg`} alt="KUVIN" className={className} draggable="false" />;
}
