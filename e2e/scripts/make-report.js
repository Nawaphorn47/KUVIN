// สร้างรายงานผลทดสอบ (Markdown + รูปหน้าจอ) จากการรันล่าสุด → docs/test-report/README.md
// ใช้หลัง `npx playwright test`:  npm run report:docs
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "..", "docs", "test-report");
const resultsFile = path.join(root, "report", "results.json");

if (!fs.existsSync(resultsFile)) {
  console.error("ไม่พบ report/results.json — รัน `npx playwright test` ก่อน");
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsFile, "utf8"));

// ดึงรายการเทสต์ทั้งหมดจากโครงสร้าง suites ซ้อนกันของ Playwright
const cases = [];
(function walk(suite, file) {
  const f = suite.file || file;
  for (const spec of suite.specs ?? []) {
    const r = spec.tests?.[0]?.results?.at(-1);
    cases.push({
      file: f,
      title: spec.title,
      ok: spec.ok,
      status: r?.status ?? "unknown",
      ms: r?.duration ?? 0,
      error: r?.error?.message?.split("\n")[0] ?? "",
    });
  }
  for (const s of suite.suites ?? []) walk(s, f);
})({ suites: results.suites }, "");

const passed = cases.filter((c) => c.ok).length;
const failed = cases.filter((c) => !c.ok && c.status !== "skipped").length;
const skipped = cases.filter((c) => c.status === "skipped").length;
const totalMs = cases.reduce((s, c) => s + c.ms, 0);

// คัดลอกรูปหน้าจอ
const screensSrc = path.join(root, "screens");
const screensOut = path.join(outDir, "screens");
fs.rmSync(screensOut, { recursive: true, force: true });
fs.mkdirSync(screensOut, { recursive: true });
const suites = fs.existsSync(screensSrc) ? fs.readdirSync(screensSrc).sort() : [];
for (const s of suites) fs.cpSync(path.join(screensSrc, s), path.join(screensOut, s), { recursive: true });

const stamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
let md = `# รายงานผลทดสอบอัตโนมัติ (E2E)\n\n`;
md += `สร้างเมื่อ ${stamp} จากการรัน \`e2e\` (Playwright, Chromium ขนาดมือถือ 375×812) กับ stack ในเครื่อง\n\n`;
md += `| ผ่าน | ไม่ผ่าน | ข้าม | รวม | เวลา |\n|---:|---:|---:|---:|---:|\n`;
md += `| **${passed}** | **${failed}** | ${skipped} | ${cases.length} | ${(totalMs / 1000).toFixed(1)} วินาที |\n\n`;

md += `## รายการทดสอบ\n\n| รหัส | รายการ | ผล | เวลา |\n|---|---|:-:|---:|\n`;
for (const c of cases) {
  const id = c.title.match(/^TC-\d+-\d+/)?.[0] ?? "";
  const name = c.title.replace(/^TC-\d+-\d+\s*/, "").replace(/\|/g, "\\|");
  md += `| ${id} | ${name} | ${c.ok ? "✅" : c.status === "skipped" ? "⏭" : "❌"} | ${(c.ms / 1000).toFixed(1)} วิ |\n`;
}

const failedCases = cases.filter((c) => !c.ok && c.status !== "skipped");
if (failedCases.length) {
  md += `\n## ที่ไม่ผ่าน\n\n`;
  for (const c of failedCases) md += `- **${c.title}** — ${c.error}\n`;
}

md += `\n## รูปหน้าจอประกอบ\n`;
const titles = {
  "01-smoke": "01 ระบบขึ้นครบ",
  "02-passenger-auth": "02 ผู้โดยสาร: สมัคร/เข้าระบบ/ยืนยันตัวตน",
  "03-full-trip-passenger": "03 ทริปเต็ม — ฝั่งผู้โดยสาร",
  "03-full-trip-driver": "03 ทริปเต็ม — ฝั่งคนขับ",
  "04-safety-and-privacy": "04 ความปลอดภัยและความเป็นส่วนตัว",
  "05-driver-signup-and-admin": "05 สมัครขับวิน + แอดมินตรวจเอกสาร",
};
for (const s of suites) {
  const files = fs.readdirSync(path.join(screensOut, s)).filter((f) => f.endsWith(".png")).sort();
  if (!files.length) continue;
  md += `\n### ${titles[s] ?? s}\n\n`;
  md += `<table><tr>\n`;
  files.forEach((f, i) => {
    const label = f.replace(/^\d+-/, "").replace(/\.png$/, "");
    md += `<td align="center" valign="top" width="200"><img src="screens/${s}/${f}" width="190" alt="${label}"><br><sub>${label}</sub></td>\n`;
    if ((i + 1) % 4 === 0 && i + 1 < files.length) md += `</tr><tr>\n`;
  });
  md += `</tr></table>\n`;
}

md += `\n---\nแผนทดสอบมือสำหรับสิ่งที่ autotest ทำแทนไม่ได้ (GPS จริง, กล้อง, แจ้งเตือน, iPhone ฯลฯ): [../TEST_PLAN.md](../TEST_PLAN.md)\n`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "README.md"), md);
console.log(`เขียน ${path.relative(path.join(root, ".."), path.join(outDir, "README.md"))} แล้ว — ผ่าน ${passed}/${cases.length}`);
