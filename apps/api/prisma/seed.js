const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

// พิกัดสถานที่:
//  - `pos: [lat, lng]` = พิกัดจริงจาก OpenStreetMap (ตรวจกับแผนที่แล้ว)
//  - `offset: [dLat, dLng]` = ค่า "โดยประมาณ" วัดจากจุดศูนย์กลางแคมปัสจริง (14.0230, 99.9739) เพราะ OSM ยังไม่มีข้อมูล
//    อาคารเหล่านี้ — ต้องสำรวจ/ลากหมุดแก้ให้ตรงอาคารจริงก่อนใช้งานจริง (ขอบเขตแคมปัสควรใช้ PostGIS ตาม proposal)
const BASE_LAT = 14.023;
const BASE_LNG = 99.9739;

const landmarks = [
  { name: "สำนักหอสมุด", detail: "อาคารสำนักหอสมุด", pos: [14.02543, 99.97459], isPopular: true },
  { name: "โรงอาหารกลาง", detail: "โรงอาหารกลาง", offset: [-0.001, 0.0012], isPopular: true },
  { name: "โรงอาหารใหม่", detail: "โรงอาหารใหม่", offset: [-0.0016, 0.0018] },
  { name: "หอพักนิสิต", detail: "หมู่บ้านนิสิต", pos: [14.03039, 99.97892], isPopular: true },
  { name: "สนามฟุตบอล", detail: "สนามกีฬากลาง", offset: [0.0008, 0.0025] },
  { name: "โรงพยาบาลสัตว์", detail: "คณะสัตวแพทยศาสตร์", pos: [14.02055, 99.97328] },
  { name: "คณะวิศวกรรมศาสตร์", detail: "อาคาร 3 ชั้น", offset: [0.0005, -0.0022] },
  { name: "คณะศิลปศาสตร์ฯ", detail: "คณะศิลปศาสตร์และวิทยาศาสตร์", offset: [-0.0009, -0.0009] },
  { name: "คณะเกษตร", detail: "คณะเกษตร กำแพงแสน", offset: [-0.0028, 0.0006] },
  { name: "คณะประมง", detail: "คณะประมง", offset: [-0.0032, -0.0012] },
  { name: "คณะศึกษาศาสตร์", detail: "คณะศึกษาศาสตร์", offset: [0.0018, -0.0006] },
  { name: "อาคารเรียนรวม", detail: "อาคารเรียนรวม 1", offset: [0.0002, 0.0004] },
  { name: "อาคารสารสนเทศ", detail: "อาคารสารสนเทศ", offset: [0.0012, 0.0009] },
  { name: "ประตู 1", detail: "ประตูทางเข้าหลัก", offset: [0.004, 0] },
  { name: "ประตู 2", detail: "ประตูที่ 2", offset: [-0.004, 0.003] },
  { name: "ประตู 3", detail: "ประตูที่ 3", offset: [-0.003, -0.004] },
  { name: "สถานีรถไฟกำแพงแสน", detail: "สถานีรถไฟ", offset: [0.006, -0.003] },
  { name: "ตลาดกำแพงแสน", detail: "ตลาดกำแพงแสน", pos: [13.99584, 99.99647] },
  { name: "คอนแวนชั่น", detail: "อาคารคอนเวนชัน", offset: [0.0007, 0.0016], isPopular: true },
  { name: "ศร 4", detail: "อาคารศูนย์เรียนรวม 4", offset: [-0.0006, -0.0004], isPopular: true },
  { name: "หน้ามอ", detail: "ทางเข้าหน้ามหาวิทยาลัย", offset: [0.0035, -0.0009], isPopular: true },
];

async function main() {
  for (const l of landmarks) {
    const [lat, lng] = l.pos ?? [BASE_LAT + l.offset[0], BASE_LNG + l.offset[1]];
    const exists = await prisma.landmark.findFirst({ where: { name: l.name } });

    // สถานที่ที่มีอยู่แล้วไม่แตะ — พิกัดอาจถูก admin ปักหมุดแก้ไว้ (หน้า "จัดการสถานที่") ห้าม seed เขียนทับ
    if (exists) continue;

    await prisma.landmark.create({
      data: { name: l.name, detail: l.detail, lat, lng, isPopular: Boolean(l.isPopular), coordsVerified: Boolean(l.pos) },
    });
  }
  console.log(`Seeded ${landmarks.length} landmarks.`);

  // production (server จริงที่เปิดสาธารณะ): สร้างแค่สถานที่ + แอดมินที่ใช้รหัสผ่านจาก SEED_ADMIN_PASSWORD เท่านั้น
  // ห้ามมีบัญชีรหัสผ่านเดาง่ายแบบ dev (admin1234 = ใครก็เข้าหน้าแอดมินได้ ดู/ระงับผู้ใช้ เห็นเอกสารยืนยันตัวตนคนขับ)
  const isProduction = process.env.NODE_ENV === "production";
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@ku.th").toLowerCase();
  const adminPassword = isProduction ? process.env.SEED_ADMIN_PASSWORD : "admin1234";
  if (isProduction && (!adminPassword || adminPassword.length < 12)) {
    throw new Error("production ต้องตั้ง SEED_ADMIN_PASSWORD (อย่างน้อย 12 ตัวอักษร) ก่อนรัน seed");
  }

  if (!(await prisma.admin.findUnique({ where: { email: adminEmail } }))) {
    await prisma.admin.create({
      data: {
        fullName: "ผู้ดูแลระบบ",
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
      },
    });
    console.log(`Seeded admin: ${adminEmail}${isProduction ? "" : " / admin1234 (เฉพาะ dev)"}`);
  }

  if (isProduction) {
    console.log("production: ข้ามบัญชีผู้ใช้/คนขับเดโม");
    return;
  }

  const demoUserPhone = "0800000001";
  if (!(await prisma.user.findUnique({ where: { phone: demoUserPhone } }))) {
    await prisma.user.create({
      data: {
        fullName: "สมใจ นิสิตดี",
        phone: demoUserPhone,
        email: "somjai@ku.th",
        studentId: "6410400999",
        passwordHash: await bcrypt.hash("user1234", 10),
      },
    });
    console.log(`Seeded demo user: ${demoUserPhone} / user1234`);
  }

  // เบอร์วิน 1-3 — คนขับเดโมสามคน เพื่อทดสอบคิวหมุนเวียนตามเบอร์วิน (vinNumber ต้องเป็นตัวเลขล้วนเท่านั้น
  // เพราะใช้กำหนดลำดับคิวรับงานโดยตรง ดู assertNumericVinNumber ใน auth.service.js)
  const demoDrivers = [
    { phone: "0800000002", fullName: "สมชาย วินมอเตอร์", vinNumber: "1", licensePlate: "กก 1234 นครปฐม" },
    { phone: "0800000003", fullName: "วิชัย ขับดี", vinNumber: "2", licensePlate: "กข 2345 นครปฐม" },
    { phone: "0800000004", fullName: "ประสิทธิ์ ปลอดภัย", vinNumber: "3", licensePlate: "กค 3456 นครปฐม" },
  ];

  for (const [i, d] of demoDrivers.entries()) {
    if (await prisma.driver.findUnique({ where: { phone: d.phone } })) continue;

    await prisma.driver.create({
      data: {
        fullName: d.fullName,
        phone: d.phone,
        passwordHash: await bcrypt.hash("driver1234", 10),
        vinNumber: d.vinNumber,
        licensePlate: d.licensePlate,
        vehicleModel: "Honda Wave 125",
        verificationStatus: "APPROVED",
        isOnline: true,
        isAvailable: true,
        queueJoinedAt: new Date(Date.now() + i), // เข้าคิวเรียงตามเบอร์วิน 1,2,3
      },
    });
    console.log(`Seeded demo driver: ${d.phone} / driver1234 (เบอร์วิน ${d.vinNumber}, APPROVED)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
