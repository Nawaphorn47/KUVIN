import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import Avatar from "../ui/Avatar";
import { api } from "../../lib/api";
import { resizeImage } from "../../lib/image";

// ตั้ง/เปลี่ยน/ลบรูปโปรไฟล์ — แตะรูปแล้วเลือกจากกล้องหรือคลังรูป ย่อรูปในเครื่องก่อนส่ง
// บัญชีเดียวใช้รูปเดียวทั้งโหมดผู้โดยสารและคนขับ (API: POST/DELETE /users/me/avatar)
export default function AvatarPicker({ src, initial, onChanged, size = "xl", className = "", showRemove = true, avatarClassName = "" }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const small = await resizeImage(file);
      const form = new FormData();
      form.append("file", small);
      await api.post("/users/me/avatar", form);
      await onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || "อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api.delete("/users/me/avatar");
      await onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || "ลบรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative">
        <Avatar src={src} initial={initial} size={size} className={`${avatarClassName} ${busy ? "opacity-50" : ""}`} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-label={src ? "เปลี่ยนรูปโปรไฟล์" : "ตั้งรูปโปรไฟล์"}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-sticker active:scale-95 disabled:opacity-60"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" onChange={pick} className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="avatar-input" />
      {showRemove && src && !busy && (
        <button type="button" onClick={remove} className="flex items-center gap-1 text-sm font-semibold text-slate-600 active:text-here">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> ลบรูป
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-here">
          {error}
        </p>
      )}
    </div>
  );
}
