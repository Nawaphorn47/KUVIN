// โลกของการออกแบบ: ป้ายแผนผัง "คุณอยู่ที่นี่" (ดู PRODUCT.md และ .impeccable/surfaces)
// - brand   : สีแบรนด์ของพื้นที่ (ค่าเริ่มต้นเขียว มก.) มาจากตัวแปร CSS ที่ src/theme/brand.js ตั้งตามพื้นที่ที่เลือก
// - emerald : ชื่อเดิมที่หน้าเก่ายังใช้อยู่ — ชี้ไปที่ brand ชุดเดียวกัน หน้าไหนยังไม่ได้ออกแบบใหม่ก็เปลี่ยนสีตามพื้นที่ด้วย
// - slate   : เทาอมเขียวเย็นของแผ่นป้าย (ไม่ใช่เทากลางๆ) — 400 ขึ้นไปใช้เป็นตัวอักษรบนพื้นขาวได้ (≥ 4.5:1)
// - here    : แดง "คุณอยู่ที่นี่" ใช้กับตำแหน่งตัวเอง SOS และสถานะวิกฤตเท่านั้น
const brand = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((s) => [s, `rgb(var(--brand-${s}) / <alpha-value>)`])
);

const neutral = {
  50: "#F3F6F4",
  100: "#E8EEEA",
  200: "#D3DDD7",
  300: "#B3C1B9",
  400: "#66776E",
  500: "#536259",
  600: "#414D47",
  700: "#313B36",
  800: "#222A26",
  900: "#15201B",
  950: "#0C1411",
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand,
        emerald: brand,
        slate: neutral,
        here: { DEFAULT: "#C62828", soft: "#FBE9E7" },
      },
      fontFamily: {
        sans: ["Anuphan", "Noto Sans Thai", "Leelawadee UI", "Tahoma", "sans-serif"],
      },
      fontSize: {
        // ตัวเลขราคา/เลขคิว — ลำดับความสำคัญบอกด้วยขนาดล้วน
        fare: ["3rem", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "700" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(21,32,27,0.06), 0 2px 8px -2px rgba(21,32,27,0.08)",
        floating: "0 6px 16px -6px rgba(21,32,27,0.35), 0 2px 4px -2px rgba(21,32,27,0.2)",
        sticker: "0 2px 0 rgba(21,32,27,0.18), 0 4px 10px -2px rgba(21,32,27,0.3)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};
