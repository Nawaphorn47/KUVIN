// เรนเดอร์ภาพประกอบเล่มรายงานจากไฟล์ HTML ในโฟลเดอร์นี้ (รันจากโฟลเดอร์ที่มี playwright เช่น e2e/): node render.mjs
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const dir = dirname(fileURLToPath(import.meta.url));
const jobs = [
  ["persona", "body", "persona"],
  ["journey", "#pas", "journey-passenger"],
  ["journey", "#drv", "journey-driver"],
  ["wireframe", "#a", "wireframe-passenger-1"],
  ["wireframe", "#b", "wireframe-driver-1"],
  ["wireframe", "#c", "wireframe-admin"],
];
const b = await chromium.launch();
for (const [page, sel, out] of jobs) {
  const p = await b.newPage({ viewport: { width: 1700, height: 900 }, deviceScaleFactor: 2 });
  await p.goto(pathToFileURL(resolve(dir, page + ".html")).href);
  await p.locator(sel).screenshot({ path: resolve(dir, out + ".png") });
  await p.close();
}
await b.close();
