import { useEffect } from "react";

// พื้นหลังมืดของหน้าต่าง popup — คลิกนอกกล่องหรือกด Esc เพื่อปิด
// พื้นหลังเป็นปุ่มจริง (ไม่ใส่ onClick ให้ div) เนื้อหาที่ส่งเข้ามาต้องมี class "relative" เพื่อให้อยู่เหนือปุ่มนี้
// และไม่ต้อง stopPropagation เพราะคลิกในกล่องไม่ได้โดนปุ่มพื้นหลังตั้งแต่แรก
export default function Overlay({ onClose, className = "", backdropClassName = "bg-black/40", children }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${className}`}>
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        tabIndex={-1}
        onClick={onClose}
        className={`absolute inset-0 h-full w-full cursor-default ${backdropClassName}`}
      />
      {children}
    </div>
  );
}
