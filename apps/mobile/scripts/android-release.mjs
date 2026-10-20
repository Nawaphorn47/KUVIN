// build แอป Android สำหรับแจกจริง: ชี้ API ที่ https://api.kuvinn.tech ไม่มีปุ่มเข้าสู่ระบบด่วน ไม่เปิด cleartext
//   npm run android:release                      → android/app/build/outputs/apk/release/app-release.apk
//   KUVIN_API_URL=https://api.example.com/api npm run android:release   → ชี้ไปที่ API อื่น (ต้องเป็น https)
//
// การเซ็นชื่อแอป:
// - ตั้ง KUVIN_KEYSTORE (path ไฟล์ .jks), KUVIN_KEYSTORE_PASSWORD, KUVIN_KEY_ALIAS, KUVIN_KEY_PASSWORD → เซ็นด้วยคีย์ของคุณ
//   (ต้องใช้คีย์เดียวกันทุกเวอร์ชัน ไม่งั้นลงทับเวอร์ชันเดิมไม่ได้ และใช้ขึ้น Play Store) — เก็บไฟล์คีย์ให้ปลอดภัย ห้าม commit
// - ไม่ตั้ง → เซ็นด้วยคีย์ debug ของเครื่องนี้ (ลงมือถือได้ แจกให้ทดสอบ/ส่งอาจารย์ได้ แต่ขึ้น Play Store ไม่ได้)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const isWindows = process.platform === "win32";
const apiUrl = (process.env.KUVIN_API_URL || "https://api.kuvinn.tech/api").replace(/\/$/, "");

if (!apiUrl.startsWith("https://")) {
  console.error("KUVIN_API_URL ต้องขึ้นต้นด้วย https:// (build จริงไม่เปิด cleartext)");
  process.exit(1);
}

function run(cmd, args, env = {}, cwd = root) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: isWindows, env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const pushEnabled = existsSync(join(root, "android", "app", "google-services.json"));
console.log(`API ที่แอปจะยิงไป: ${apiUrl}`);
console.log(`Push notification: ${pushEnabled ? "เปิด (เจอ google-services.json)" : "ปิด (ไม่มี google-services.json)"}`);
console.log(`เซ็นชื่อด้วย: ${process.env.KUVIN_KEYSTORE ? "คีย์ของคุณ (KUVIN_KEYSTORE)" : "คีย์ debug (แจกทดสอบได้ ขึ้น Play Store ไม่ได้)"}`);

run("npx", ["vite", "build"], { VITE_API_URL: apiUrl, VITE_PUSH_ENABLED: pushEnabled ? "1" : "", VITE_DEMO_LOGIN: "" });
run("npx", ["cap", "sync", "android"], { CAP_ALLOW_HTTP: "" });

// Gradle ต้องการ JDK 21 — ใช้ JDK ที่มากับ Android Studio แทน JAVA_HOME ของเครื่อง (อาจเป็นเวอร์ชันใหม่เกินไป)
const gradleEnv = {};
const studioJbr = isWindows ? "C:\Program Files\Android\Android Studio\jbr" : null;
if (studioJbr && existsSync(studioJbr)) {
  gradleEnv.JAVA_HOME = studioJbr;
  // นำ java ของ Android Studio ขึ้นหน้า PATH ด้วย — เครื่องที่มี JDK ใหม่เกิน (เช่น 25) ใน PATH จะทำให้ Gradle ที่ค้างอยู่ใช้ JDK ผิดตัว
  gradleEnv.PATH = `${join(studioJbr, "bin")};${process.env.PATH}`;
}
if (!process.env.ANDROID_HOME && isWindows && process.env.LOCALAPPDATA) {
  const sdk = join(process.env.LOCALAPPDATA, "Android", "Sdk");
  if (existsSync(sdk)) gradleEnv.ANDROID_HOME = sdk;
}

const androidDir = join(root, "android");
const gradlew = join(androidDir, isWindows ? "gradlew.bat" : "gradlew");
run(isWindows ? `"${gradlew}"` : gradlew, ["--stop"], gradleEnv, androidDir); // ปิด daemon เก่าที่อาจเปิดด้วย JDK คนละตัว
// -Dorg.gradle.java.home บังคับ JVM ของ daemon ตรงๆ (ตัวแปร PATH/JAVA_HOME อย่างเดียวไม่พอบน Windows ถ้ามี JDK ใหม่เกินอยู่ใน PATH)
const jvmArg = gradleEnv.JAVA_HOME ? [`"-Dorg.gradle.java.home=${gradleEnv.JAVA_HOME}"`] : [];
run(isWindows ? `"${gradlew}"` : gradlew, ["assembleRelease", ...jvmArg], gradleEnv, androidDir);
console.log(`\nAPK: ${join(androidDir, "app", "build", "outputs", "apk", "release", "app-release.apk")}`);
