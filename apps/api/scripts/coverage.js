// วัด code coverage ของโค้ด API จากชุดทดสอบระดับ service (ไม่ต้องเปิด server) — รัน: npm run test:coverage
// รันแต่ละไฟล์ test-*.js ด้วย NODE_V8_COVERAGE ชี้โฟลเดอร์เดียวกัน แล้วให้ c8 รวมผลเป็น coverage/lcov.info
// (SonarQube อ่านไฟล์นี้ผ่าน sonar.javascript.lcov.reportPaths — ดู sonar-project.properties)
require("dotenv").config();
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const tmp = path.join(root, "coverage", "tmp");
fs.rmSync(path.join(root, "coverage"), { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

// ชุดที่เรียก service ตรง + ชุดที่ยิง HTTP/socket เข้า server จริง (suspension, payment) — server เปิดชั่วคราวที่พอร์ตแยก
// (ไม่ชนกับ API ที่รันอยู่) พร้อมวัด coverage ด้วย แล้วปิดแบบปกติตอนจบเพื่อให้ไฟล์ coverage ถูกเขียน
const suites = ["queue", "auth", "platform", "identity", "chat", "security", "trip-safety", "suspension", "payment"];
const PORT = process.env.COVERAGE_PORT || "4100";
const env = { ...process.env, NODE_V8_COVERAGE: tmp, QUEUE_RACE_ROUNDS: "5", PORT, SLIP_PROVIDER: "mock" };

async function main() {
  const server = spawn(process.execPath, ["-r", path.join(__dirname, "exit-on-stdin.js"), "src/index.js"], {
    cwd: root,
    env,
    stdio: ["pipe", "ignore", "inherit"],
  });
  const closed = new Promise((resolve) => server.on("close", resolve));
  for (let i = 0; i < 30; i++) {
    try {
      if ((await fetch(`http://localhost:${PORT}/api/health`)).ok) break;
    } catch {
      /* ยังไม่พร้อม */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  let failed = 0;
  for (const name of suites) {
    const res = spawnSync(process.execPath, [path.join(__dirname, `test-${name}.js`)], { cwd: root, env, stdio: "inherit" });
    if (res.status !== 0) failed++;
  }
  server.stdin.write("stop\n");
  await closed;
  return failed;
}

main().then(finish);

function finish(failed) {
const c8 = path.join(root, "..", "..", "node_modules", "c8", "bin", "c8.js");
const report = spawnSync(
  process.execPath,
  [c8, "report", "--temp-directory", tmp, "--reporter=lcov", "--reporter=text-summary", "--include=src/**", "--exclude=src/index.js", "--all", "--src=src"],
  { cwd: root, stdio: "inherit" }
);

// SonarQube เทียบพาธไฟล์จาก root ของ repo — c8 เขียนเป็น src/... (สัมพัทธ์กับ apps/api) จึงเติมคำนำหน้าให้
const lcov = path.join(root, "coverage", "lcov.info");
if (fs.existsSync(lcov)) {
  // บน Windows c8 เขียนพาธด้วย \ — แปลงเป็น / ด้วย (Sonar บน Linux/Docker อ่านเฉพาะแบบ /)
  const fixed = fs
    .readFileSync(lcov, "utf8")
    .split(/\r?\n/)
    .map((line) => (line.startsWith("SF:") ? `SF:apps/api/${line.slice(3).replace(/\\/g, "/")}` : line))
    .join("\n");
  fs.writeFileSync(lcov, fixed);
}

if (failed) console.error(`\n${failed} ชุดทดสอบล้มเหลว — coverage ที่ได้อาจต่ำกว่าจริง`);
process.exit(failed || report.status || 0);
}
