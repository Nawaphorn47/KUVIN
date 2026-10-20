import { BookUser, Bike, Camera, GraduationCap, IdCard, RectangleHorizontal, Shirt, User } from "lucide-react";

// ประเภทคนขับและเอกสารของแต่ละประเภท — ต้องตรงกับ apps/api/src/utils/driverTypes.js (server ตรวจซ้ำเสมอ)
// คิวรับงานเดียวกันหมด ต่างกันแค่หลักฐานยืนยันตัวตน
export const DOCS = {
  photoUrl: { label: "รูปถ่ายหน้าตรง", hint: "เห็นหน้าชัด ไม่สวมหมวกกันน็อก", icon: Camera, round: true },
  idCardPhotoUrl: { label: "บัตรประชาชน", hint: "เห็นชื่อและเลขบัตรชัดเจน", icon: IdCard },
  studentCardPhotoUrl: { label: "บัตรนิสิต", hint: "บัตรที่ยังไม่หมดอายุ เห็นรหัสนิสิต", icon: GraduationCap },
  driverLicensePhotoUrl: { label: "ใบขับขี่รถจักรยานยนต์", hint: "ใบขับขี่ที่ยังไม่หมดอายุ", icon: BookUser },
  vestPhotoUrl: { label: "เสื้อวิน", hint: "ใส่เสื้อแล้วถ่ายให้เห็นเบอร์ชัด", icon: Shirt },
  vehiclePhotoUrl: { label: "รถเต็มคัน", hint: "ถ่ายด้านข้างให้เห็นทั้งคัน", icon: Bike },
  platePhotoUrl: { label: "ป้ายทะเบียน", hint: "ตัวอักษรบนป้ายอ่านออก", icon: RectangleHorizontal },
};

export const DRIVER_TYPES = {
  STUDENT: {
    label: "นิสิต",
    tagline: "ว่างระหว่างเรียนก็ขับหารายได้เสริม",
    icon: GraduationCap,
    docs: ["photoUrl", "studentCardPhotoUrl", "driverLicensePhotoUrl", "vehiclePhotoUrl", "platePhotoUrl"],
  },
  PUBLIC: {
    label: "บุคคลทั่วไป",
    tagline: "คนในพื้นที่ที่มีรถและใบขับขี่",
    icon: User,
    docs: ["photoUrl", "idCardPhotoUrl", "driverLicensePhotoUrl", "vehiclePhotoUrl", "platePhotoUrl"],
  },
  PRO: {
    label: "วินมอเตอร์ไซค์",
    tagline: "วินรับจ้างที่มีเสื้อวินและสังกัดวินอยู่แล้ว",
    icon: Shirt,
    docs: ["photoUrl", "idCardPhotoUrl", "driverLicensePhotoUrl", "vestPhotoUrl", "platePhotoUrl"],
    // วินรับจ้างต้องใช้ใบขับขี่รถจักรยานยนต์สาธารณะ
    docOverrides: { driverLicensePhotoUrl: { label: "ใบขับขี่รถจักรยานยนต์สาธารณะ", hint: "ใบขับขี่สาธารณะที่ยังไม่หมดอายุ" } },
  },
};

export const TYPE_ORDER = ["STUDENT", "PUBLIC", "PRO"];

export function docInfo(type, key) {
  return { ...DOCS[key], ...DRIVER_TYPES[type]?.docOverrides?.[key] };
}
