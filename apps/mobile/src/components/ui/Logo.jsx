// โลโก้ KU VIN: ตัวอักษร KU (ใช้สี currentColor) + จุดแดง "คุณอยู่ที่นี่" — สัญลักษณ์เดียวกับไอคอนแอป (รูปไฟล์: docs/brand/kuvin-logo-1024.png)
// วางบนพื้นสีเข้ม (เช่น วงกลมสีแบรนด์) ตั้งสีตัวอักษรด้วย text-white
export default function Logo({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="12 2 78 84" className={className} fill="none" role="img" aria-label="KU VIN">
      <g stroke="currentColor" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 28V72M44 28L22 51M29 45L48 72" />
        <path d="M58 28V56a11 11 0 0 0 22 0V28" />
      </g>
      <circle cx="80" cy="12.5" r="5.5" fill="#C62828" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}
