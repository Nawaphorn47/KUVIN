// ใช้ตอนวัด coverage เท่านั้น: preload ให้ server ปิดตัวเองแบบปกติ (เพื่อให้ V8 เขียนไฟล์ coverage) เมื่อได้รับข้อความ "stop" ทาง stdin
// — บน Windows ไม่มี SIGTERM ที่ให้โปรเซสจัดการเองได้ จึงใช้ stdin แทน
process.stdin.on("data", (d) => {
  if (String(d).includes("stop")) process.exit(0);
});
process.stdin.resume();
