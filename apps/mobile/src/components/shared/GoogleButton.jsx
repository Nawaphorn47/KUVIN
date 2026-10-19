import { useEffect, useRef, useState } from "react";

const GIS_SRC = "https://accounts.google.com/gsi/client";
let gisPromise = null;

function loadGis() {
  gisPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => {
      gisPromise = null;
      reject(new Error("load failed"));
    };
    document.head.appendChild(s);
  });
  return gisPromise;
}

// ปุ่ม "เข้าสู่ระบบด้วย Google" ของ Google Identity Services — ได้ ID token (credential) ไปตรวจที่ server
// แสดงเฉพาะเมื่อ server ตั้ง GOOGLE_CLIENT_ID ไว้ (ดู GET /auth/config)
export default function GoogleButton({ clientId, onCredential }) {
  const box = useRef(null);
  const handler = useRef(onCredential);
  handler.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadGis()
      .then((google) => {
        if (!alive || !box.current) return;
        google.accounts.id.initialize({ client_id: clientId, callback: (res) => handler.current(res.credential) });
        google.accounts.id.renderButton(box.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          locale: "th",
          width: box.current.offsetWidth || 320,
        });
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [clientId]);

  if (failed) return <p className="text-center text-sm text-slate-500">โหลดปุ่ม Google ไม่สำเร็จ ใช้เบอร์โทรแทนได้</p>;
  return <div ref={box} className="flex min-h-[44px] w-full justify-center" />;
}
