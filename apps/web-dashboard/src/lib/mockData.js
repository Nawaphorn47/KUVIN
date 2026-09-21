export const pendingDrivers = [
  { id: 1, name: "สมชาย สายแว้น", studentId: "641040xxx" },
  { id: 2, name: "วิภาวดี ขี่ไว", studentId: "652030xxx" },
  { id: 3, name: "ธนพนธ์ บิดหมด", studentId: "633020xxx" },
];

export const trips = [
  {
    id: 1,
    datetime: "24 ต.ค. 67, 10:30",
    driver: "สมชาย สายแว้น",
    route: "ประตูหน้า → ศร4",
    fare: 20,
    status: "สำเร็จ",
  },
  {
    id: 2,
    datetime: "24 ต.ค. 67, 09:45",
    driver: "วิภาวดี ขี่ไว",
    route: "ศร3 → หอพักนิสิต",
    fare: 15,
    status: "ยังไม่ได้รับ",
    dispute: true,
  },
  {
    id: 3,
    datetime: "24 ต.ค. 67, 09:12",
    driver: "ธนพนธ์ บิดหมด",
    route: "คาเฟ่วิศวะ → คณะศวท",
    fare: 25,
    status: "สำเร็จ",
  },
];
