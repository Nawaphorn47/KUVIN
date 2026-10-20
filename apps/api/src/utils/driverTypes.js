// ประเภทคนขับและเอกสารที่แต่ละประเภทต้องแนบ — ใช้ทั้งตอนสมัครขับ ตอนส่งเอกสาร และให้แอป/แดชบอร์ดโชว์รายการเดียวกัน
// คิวรับงานเดียวกันหมดทุกประเภท (FIFO) ต่างกันแค่หลักฐานยืนยันตัวตน
const DOC_LABELS = {
  photoUrl: "รูปถ่ายหน้าตรง",
  idCardPhotoUrl: "บัตรประชาชน",
  studentCardPhotoUrl: "บัตรนิสิต",
  driverLicensePhotoUrl: "ใบขับขี่รถจักรยานยนต์",
  vestPhotoUrl: "เสื้อวินที่เห็นเบอร์",
  vehiclePhotoUrl: "รถเต็มคัน",
  platePhotoUrl: "ป้ายทะเบียน",
};

const DRIVER_TYPES = {
  STUDENT: {
    label: "นิสิต",
    docs: ["photoUrl", "studentCardPhotoUrl", "driverLicensePhotoUrl", "vehiclePhotoUrl", "platePhotoUrl"],
  },
  PUBLIC: {
    label: "บุคคลทั่วไป",
    docs: ["photoUrl", "idCardPhotoUrl", "driverLicensePhotoUrl", "vehiclePhotoUrl", "platePhotoUrl"],
  },
  PRO: {
    label: "วินมอเตอร์ไซค์",
    // วินรับจ้างต้องมีใบขับขี่รถจักรยานยนต์สาธารณะ — ใช้ช่องใบขับขี่เดียวกัน แต่แอปบอกให้แนบใบขับขี่สาธารณะ
    docs: ["photoUrl", "idCardPhotoUrl", "driverLicensePhotoUrl", "vestPhotoUrl", "platePhotoUrl"],
  },
};

const isDriverType = (t) => Object.hasOwn(DRIVER_TYPES, t);
const ALL_DOCS = Object.keys(DOC_LABELS);

module.exports = { DRIVER_TYPES, DOC_LABELS, ALL_DOCS, isDriverType };
