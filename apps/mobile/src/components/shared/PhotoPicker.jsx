import { useRef } from "react";
import { Check } from "lucide-react";

export default function PhotoPicker({ label, hint, icon: Icon, file, onChange }) {
  const inputRef = useRef(null);

  return (
    <div>
      <p className="mb-2 text-sm text-slate-600">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-emerald-700 bg-emerald-100/30 py-8"
      >
        {file ? (
          <>
            <Check className="h-7 w-7 text-emerald-700" />
            <span className="text-sm text-emerald-700">{file.name}</span>
          </>
        ) : (
          <>
            <Icon className="h-7 w-7 text-emerald-700" />
            <span className="text-sm text-emerald-700">{label}</span>
            {hint && <span className="text-xs text-slate-500">{hint}</span>}
          </>
        )}
      </button>
    </div>
  );
}
