// build แอป Android สำหรับทดสอบบนมือถือจริง โดยให้แอปยิง API ไปที่เครื่อง dev นี้ผ่าน Wi-Fi วงเดียวกัน
//   npm run android:dev                 → build APK (debug) ที่ android/app/build/outputs/apk/debug/app-debug.apk
//   npm run android:dev -- --run        → build แล้วติดตั้ง+เปิดบนมือถือที่เสียบสาย USB อยู่ (เปิด USB debugging ก่อน)
//   KUVIN_API_HOST=192.168.1.50 npm run android:dev   → กำหนด IP เองถ้าเดาผิด (เช่น มีหลาย network adapter)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const isWindows = process.platform === "win32";

// adapter เสมือน (WSL/Docker/VM) มี IP แบบ private เหมือนกันแต่มือถือเข้าไม่ถึง — ข้ามไป
const VIRTUAL_ADAPTER = /vEthernet|WSL|Docker|VirtualBox|VMware|Hyper-V|Loopback|Tailscale|ZeroTier/i;

function guessLanIp() {
  const candidates = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    if (VIRTUAL_ADAPTER.test(name)) continue;
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) {
        candidates.push({ name, address: a.address });
      }
    }
  }
  // Wi-Fi มาก่อน เพราะมือถือต่อ Wi-Fi วงเดียวกัน
  candidates.sort((a, b) => Number(/wi-?fi|wlan/i.test(b.name)) - Number(/wi-?fi|wlan/i.test(a.name)));
  return candidates[0]?.address;
}

function run(cmd, args, env = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: isWindows, env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const host = process.env.KUVIN_API_HOST || guessLanIp();
if (!host) {
  console.error("หา IP วง LAN ของเครื่องนี้ไม่เจอ — ต่อ Wi-Fi ก่อน หรือกำหนดเองด้วย KUVIN_API_HOST=<ip>");
  process.exit(1);
}

const pushEnabled = existsSync(join(root, "android", "app", "google-services.json"));
const apiUrl = `http://${host}:4000/api`;

console.log(`API ที่แอปจะยิงไป: ${apiUrl}`);
console.log(
  pushEnabled
    ? "Push notification: เปิด (เจอ android/app/google-services.json)"
    : "Push notification: ปิด (ยังไม่มี android/app/google-services.json — ดู README)"
);

run("npx", ["vite", "build"], {
  VITE_API_URL: apiUrl,
  VITE_PUSH_ENABLED: pushEnabled ? "1" : "",
  VITE_DEMO_LOGIN: "1",
});
run("npx", ["cap", "sync", "android"], { CAP_ALLOW_HTTP: "1" });

// Gradle ต้องการ JDK 21 — ใช้ JDK ที่มากับ Android Studio แทน JAVA_HOME ของเครื่อง (อาจเป็นเวอร์ชันใหม่เกินที่ Gradle รองรับ)
const studioJbr = isWindows ? "C:\\Program Files\\Android\\Android Studio\\jbr" : null;
const gradleEnv = {};
if (studioJbr && existsSync(studioJbr)) gradleEnv.JAVA_HOME = studioJbr;
if (!process.env.ANDROID_HOME && isWindows && process.env.LOCALAPPDATA) {
  const sdk = join(process.env.LOCALAPPDATA, "Android", "Sdk");
  if (existsSync(sdk)) gradleEnv.ANDROID_HOME = sdk;
}

if (process.argv.includes("--run")) {
  run("npx", ["cap", "run", "android"], gradleEnv);
} else {
  const androidDir = join(root, "android");
  // path เต็ม — บางสภาพแวดล้อมบน Windows ปิดการหาโปรแกรมจากโฟลเดอร์ปัจจุบัน (NoDefaultCurrentDirectoryInExePath)
  const gradlew = join(androidDir, isWindows ? "gradlew.bat" : "gradlew");
  console.log(`\n> ${gradlew} assembleDebug`);
  const result = spawnSync(isWindows ? `"${gradlew}"` : gradlew, ["assembleDebug"], {
    cwd: androidDir,
    stdio: "inherit",
    shell: isWindows,
    env: { ...process.env, ...gradleEnv },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(`\nAPK: ${join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk")}`);
}
