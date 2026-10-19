import clsx from "clsx";

// แผ่นข้อมูลบนป้าย: พื้นขาว เส้นขอบบาง ไม่มีเงาหนา — ความลึกเก็บไว้ให้สิ่งที่กดได้
export default function Card({ className, children, ...props }) {
  return (
    <div className={clsx("rounded-xl bg-white p-4 ring-1 ring-slate-200", className)} {...props}>
      {children}
    </div>
  );
}
