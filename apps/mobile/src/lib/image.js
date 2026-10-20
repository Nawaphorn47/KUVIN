// ย่อรูปก่อนอัปโหลด (ด้านยาวสุด ≤ max พิกเซล เป็น JPEG) — ประหยัดเน็ตมือถือและเซิร์ฟเวอร์ รับไฟล์ได้ไม่เกิน 2MB
// ถ้าเบราว์เซอร์ย่อไม่ได้ (เช่น รูปรูปแบบที่ไม่รองรับ) คืนไฟล์เดิม ให้เซิร์ฟเวอร์ตัดสินว่ารับหรือไม่
export async function resizeImage(file, max = 512, quality = 0.86) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob ? new File([blob], "avatar.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}
