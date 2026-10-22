// เรนเดอร์ simple-storyboard.html เป็น PDF (รันจากโฟลเดอร์ที่มี playwright เช่น e2e/): node render-simple.mjs
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const dir = dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(pathToFileURL(resolve(dir, "simple-storyboard.html")).href);
await p.pdf({ path: resolve(dir, "KUVIN_Demo_Storyboard_Simple.pdf"), width: "297mm", height: "210mm", printBackground: true });
await b.close();
