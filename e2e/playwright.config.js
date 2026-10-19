// ทดสอบ KU VIN ปลายทางถึงปลายทางด้วยเบราว์เซอร์จริง (Chromium ขนาดมือถือ)
// เป้าหมายเริ่มต้นคือ stack ในเครื่องจาก `docker compose up --build -d` (web 3302 / admin 3303 / api 3301)
// เปลี่ยนเป้าหมายด้วย WEB_URL / ADMIN_URL / API_URL — **ห้ามชี้ไปเว็บจริง (kuvinn.tech)**: เทสต์สร้างผู้ใช้/ทริปทดสอบจริงลงฐานข้อมูล
const { defineConfig } = require("@playwright/test");

const WEB_URL = process.env.WEB_URL || "http://localhost:3302";

module.exports = defineConfig({
  testDir: "./tests",
  // ทุกไฟล์ใช้ฐานข้อมูลเดียวกัน และเทสต์ทริปเต็มต้องรันต่อเนื่อง — รันทีละไฟล์ ไม่ขนาน
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { outputFolder: "report", open: "never" }], ["json", { outputFile: "report/results.json" }]],
  outputDir: "test-results",
  use: {
    baseURL: WEB_URL,
    viewport: { width: 375, height: 812 },
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    // พิกัดกลางพื้นที่ มก. กำแพงแสน (ให้หน้าเรียกวินได้จุดรับอยู่ในพื้นที่ให้บริการ)
    geolocation: { latitude: 14.023, longitude: 99.9739 },
    permissions: ["geolocation"],
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
});
