const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

// พิกัดโดยประมาณ (ศูนย์กลาง มก. กำแพงแสน ~14.0206, 99.9679) — เป็นค่าตั้งต้นสำหรับพัฒนา/ทดสอบเท่านั้น
// ต้องสำรวจพิกัดจริงของแต่ละอาคารก่อนใช้งานจริง (ตรวจสอบขอบเขตด้วย PostGIS ตามที่ proposal ระบุ)
const BASE_LAT = 14.0206;
const BASE_LNG = 99.9679;

const landmarks = [
  { name: "สำนักหอสมุด", detail: "อาคารสำนักหอสมุด", offset: [0.0015, -0.001], isPopular: true },
  { name: "โรงอาหารกลาง", detail: "โรงอาหารกลาง", offset: [-0.001, 0.0012], isPopular: true },
  { name: "โรงอาหารใหม่", detail: "โรงอาหารใหม่", offset: [-0.0016, 0.0018] },
  { name: "หอพักนิสิต", detail: "หมู่บ้านนิสิต", offset: [0.0025, 0.002], isPopular: true },
  { name: "สนามฟุตบอล", detail: "สนามกีฬากลาง", offset: [0.0008, 0.0025] },
  { name: "โรงพยาบาลสัตว์", detail: "คณะสัตวแพทยศาสตร์", offset: [-0.0022, -0.0018] },
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
  { name: "ตลาดกำแพงแสน", detail: "ตลาดกำแพงแสน", offset: [0.005, 0.004] },
  { name: "คอนแวนชั่น", detail: "อาคารคอนเวนชัน", offset: [0.0007, 0.0016], isPopular: true },
  { name: "ศร 4", detail: "อาคารศูนย์เรียนรวม 4", offset: [-0.0006, -0.0004], isPopular: true },
  { name: "หน้ามอ", detail: "ทางเข้าหน้ามหาวิทยาลัย", offset: [0.0035, -0.0009], isPopular: true },
];

async function main() {
  for (const l of landmarks) {
    const [dLat, dLng] = l.offset;
    const exists = await prisma.landmark.findFirst({ where: { name: l.name } });
    if (exists) continue;

    await prisma.landmark.create({
      data: {
        name: l.name,
        detail: l.detail,
        lat: BASE_LAT + dLat,
        lng: BASE_LNG + dLng,
        isPopular: Boolean(l.isPopular),
      },
    });
  }
  console.log(`Seeded ${landmarks.length} landmarks.`);

  // บัญชีเดโม — เฉพาะ dev เท่านั้น เปลี่ยนรหัสผ่านก่อนใช้งานจริง
  const adminEmail = "admin@ku.th";
  if (!(await prisma.admin.findUnique({ where: { email: adminEmail } }))) {
    await prisma.admin.create({
      data: {
        fullName: "ผู้ดูแลระบบ",
        email: adminEmail,
        passwordHash: await bcrypt.hash("admin1234", 10),
      },
    });
    console.log(`Seeded admin: ${adminEmail} / admin1234 (เปลี่ยนรหัสผ่านก่อนใช้งานจริง)`);
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
