// ถ่ายรูปหน้าจอเก็บเป็นหลักฐานของแต่ละขั้น — ไฟล์ไปอยู่ที่ e2e/screens/<ชุดทดสอบ>/NN-ชื่อ.png
// (สคริปต์ npm run report:docs ใช้คัดลอกไปไว้ที่ docs/test-report ให้เปิดดูใน repo ได้)
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "screens");

function makeShooter(suite) {
  const dir = path.join(ROOT, suite);
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  return async function shot(page, name) {
    n += 1;
    const file = `${String(n).padStart(2, "0")}-${name}.png`;
    await page.screenshot({ path: path.join(dir, file) });
    return file;
  };
}

module.exports = { makeShooter };
