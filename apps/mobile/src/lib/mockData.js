export const currentUser = {
  name: "สมใจ นิสิตดี",
  email: "somjai@ku.th",
  phone: "089-123-4567",
  studentId: "6410400xxx",
  totalTrips: 24,
  avatarInitial: "ส",
};

export const currentDriver = {
  name: "สมชาย วินมอเตอร์",
  vinNumber: "วิน 7",
  phone: "089-123-4567",
  vehicleModel: "Honda Wave 125",
  plate: "กก 1234 นครปฐม",
  rating: 4.8,
  totalTrips: 1247,
  yearsActive: 3,
};

export const kuLandmarks = [
  { id: "lib", name: "สำนักหอสมุด", detail: "อาคารสำนักหอสมุด" },
  { id: "canteen-central", name: "โรงอาหารกลาง", detail: "โรงอาหารกลาง" },
  { id: "canteen-new", name: "โรงอาหารใหม่", detail: "โรงอาหารใหม่" },
  { id: "dorm", name: "หอพักนิสิต", detail: "หมู่บ้านนิสิต" },
  { id: "stadium", name: "สนามฟุตบอล", detail: "สนามกีฬากลาง" },
  { id: "vet", name: "โรงพยาบาลสัตว์", detail: "คณะสัตวแพทยศาสตร์" },
  { id: "eng", name: "คณะวิศวกรรมศาสตร์", detail: "อาคาร 3 ชั้น" },
  { id: "las", name: "คณะศิลปศาสตร์ฯ", detail: "คณะศิลปศาสตร์และวิทยาศาสตร์" },
  { id: "agri", name: "คณะเกษตร", detail: "คณะเกษตร กำแพงแสน" },
  { id: "fisheries", name: "คณะประมง", detail: "คณะประมง" },
  { id: "edu", name: "คณะศึกษาศาสตร์", detail: "คณะศึกษาศาสตร์" },
  { id: "lecture", name: "อาคารเรียนรวม", detail: "อาคารเรียนรวม 1" },
  { id: "it", name: "อาคารสารสนเทศ", detail: "อาคารสารสนเทศ" },
  { id: "gate1", name: "ประตู 1", detail: "ประตูทางเข้าหลัก" },
  { id: "gate2", name: "ประตู 2", detail: "ประตูที่ 2" },
  { id: "gate3", name: "ประตู 3", detail: "ประตูที่ 3" },
  { id: "station", name: "สถานีรถไฟกำแพงแสน", detail: "สถานีรถไฟ" },
  { id: "market", name: "ตลาดกำแพงแสน", detail: "ตลาดกำแพงแสน" },
];

export const popularDestinations = [
  { id: "lib", name: "สำนักหอสมุด" },
  { id: "canteen-central", name: "โรงอาหารกลาง" },
  { id: "dorm", name: "หอพักนิสิต" },
  { id: "convention", name: "คอนแวนชั่น" },
  { id: "sr4", name: "ศร 4" },
  { id: "front-gate", name: "หน้ามอ" },
];

export const recentTrips = [
  { id: 1, from: "หอพักนิสิต", to: "คณะวิศวกรรมศาสตร์", fare: 20 },
  { id: 2, from: "ประตู 1", to: "สำนักหอสมุด", fare: 20 },
  { id: 3, from: "ประตู 1", to: "ศร2", fare: 20 },
  { id: 4, from: "ประตู 1", to: "ศร3", fare: 20 },
  { id: 5, from: "ประตู 1", to: "หอในเอกชาย25", fare: 20 },
];

export const rideHistory = [
  { id: 1, date: "16 ก.ค. 2568", time: "08:30 น.", from: "หอพักนิสิต", to: "คณะวิศวกรรมศาสตร์", fare: 20, status: "เสร็จสิ้น", driver: "สมชาย วินมอเตอร์" },
  { id: 2, date: "15 ก.ค. 2568", time: "17:15 น.", from: "คณะเกษตร", to: "ตลาดลานสบาย", fare: 35, status: "เสร็จสิ้น", driver: "วิชัย ขับดี" },
  { id: 3, date: "14 ก.ค. 2568", time: "12:00 น.", from: "สำนักหอสมุด", to: "โรงอาหารกลาง", fare: 20, status: "เสร็จสิ้น", driver: "ประสิทธิ์ ปลอดภัย" },
  { id: 4, date: "13 ก.ค. 2568", time: "09:00 น.", from: "ประตู 1", to: "คณะประมง", fare: 20, status: "เสร็จสิ้น", driver: "สมชาย วินมอเตอร์" },
  { id: 5, date: "12 ก.ค. 2568", time: "16:45 น.", from: "อาคารสารสนเทศ", to: "ตลาดกำแพงแสน", fare: 40, status: "ยกเลิก", driver: "วิชัย ขับดี" },
];

export const notifications = [
  {
    id: 1,
    icon: "bike",
    title: "คนขับตอบรับงานแล้ว",
    body: "สมชาย วินมอเตอร์ รับงานของคุณแล้ว กำลังมารับที่หอพักนิสิต",
    time: "เมื่อกี้",
    unread: true,
  },
  {
    id: 2,
    icon: "check",
    title: "เดินทางเสร็จสิ้น",
    body: "คุณเดินทางจาก สำนักหอสมุด ถึง โรงอาหารกลาง เรียบร้อยแล้ว",
    time: "เมื่อวาน",
    unread: false,
  },
];

export const driverDailyHistory = [
  { date: "16 ก.ค. 2568", trips: 10, earnings: 215 },
  { date: "15 ก.ค. 2568", trips: 14, earnings: 300 },
  { date: "14 ก.ค. 2568", trips: 8, earnings: 175 },
  { date: "13 ก.ค. 2568", trips: 16, earnings: 340 },
  { date: "12 ก.ค. 2568", trips: 11, earnings: 230 },
  { date: "11 ก.ค. 2568", trips: 13, earnings: 270 },
  { date: "10 ก.ค. 2568", trips: 9, earnings: 190 },
];

export const todayTrips = [
  { id: 1, time: "08:30 น.", route: "ประตู 1 → หอพักนิสิต", fare: 20 },
  { id: 2, time: "09:15 น.", route: "หอพักนิสิต → คณะวิศวฯ", fare: 20 },
  { id: 3, time: "10:40 น.", route: "สำนักหอสมุด → โรงอาหารกลาง", fare: 20 },
  { id: 4, time: "11:55 น.", route: "อาคารเรียนรวม → ประตู 1", fare: 20 },
  { id: 5, time: "13:10 น.", route: "คณะเกษตร → สถานีรถไฟ", fare: 35 },
  { id: 6, time: "14:30 น.", route: "ประตู 2 → คณะประมง", fare: 20 },
  { id: 7, time: "15:50 น.", route: "โรงอาหารใหม่ → หอพักนิสิต", fare: 20 },
  { id: 8, time: "17:00 น.", route: "หอพักนิสิต → ตลาดกำแพงแสน", fare: 40 },
  { id: 9, time: "18:10 น.", route: "ประตู 3 → คณะสัตวแพทย์", fare: 20 },
  { id: 10, time: "19:05 น.", route: "สนามฟุตบอล → หอพักนิสิต", fare: 20 },
];

export const incomingJobRequest = {
  passengerName: "สมใจ นิสิตดี",
  passengerRating: 4.9,
  passengerTrips: 24,
  pickup: "หอพักนิสิต",
  dropoff: "คณะวิศวกรรมศาสตร์",
  distanceKm: 1.4,
  etaMinutes: 6,
  fare: 20,
};

export const emergencyContacts = [
  { label: "รปภ. มหาวิทยาลัย", phone: "034-280-000" },
  { label: "ตำรวจ", phone: "191" },
  { label: "หน่วยแพทย์ฉุกเฉิน (EMS)", phone: "1669" },
];
