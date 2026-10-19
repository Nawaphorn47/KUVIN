// สีของแดชบอร์ดผูกกับชั้นแบรนด์ของพื้นที่ (src/theme/brand.js ตั้งตัวแปร --brand-* ตามพื้นที่ที่แอดมินกำลังดูอยู่)
// - emerald : ชื่อเดิมที่ทุกหน้ายังใช้ — ชี้ไปที่สีแบรนด์ชุดเดียวกัน เปลี่ยนพื้นที่ = เปลี่ยนสีทั้งแดชบอร์ด
// - stone   : เทาอมเขียวเย็น (ชุดเดียวกับ slate ของแอปมือถือ) 400 ขึ้นไปใช้เป็นตัวอักษรบนพื้นขาวได้ (≥ 4.5:1)
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
      colors: { brand, emerald: brand, stone: neutral },
      fontFamily: {
        sans: ["Anuphan", "Noto Sans Thai", "Leelawadee UI", "Tahoma", "sans-serif"],
      },
    },
  },
  plugins: [],
};
