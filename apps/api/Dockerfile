# build context = root ของ repo (เช่น `docker build -f apps/api/Dockerfile .`) — โปรเจกต์เป็น npm workspaces ที่มี
# package-lock.json อันเดียวอยู่ที่ root ถ้า build จากใน apps/api ตรง ๆ จะไม่มี lockfile → ได้เวอร์ชัน dependency ไม่ตรงกับที่ทดสอบ
#
# ใช้ Debian slim ไม่ใช่ alpine: Prisma engine กับ bcrypt มี binary สำเร็จรูปสำหรับ glibc อยู่แล้ว ไม่ต้อง compile เอง
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# คัดลอกเฉพาะ manifest ก่อน (แคช layer ติดตั้ง dependency ไว้ ถ้าแก้แค่โค้ดไม่ต้องติดตั้งใหม่) — npm ci ต้องเห็น
# package.json ของทุก workspace ที่ lockfile อ้างถึง แม้จะติดตั้งให้แค่ apps/api
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY apps/web-dashboard/package.json apps/web-dashboard/

# --include=dev: prisma CLI เป็น devDependency แต่ต้องใช้ทั้งตอน generate (ข้างล่าง) และ migrate deploy ตอนเริ่ม container
# (เดิมใช้ --omit=dev แล้ว npx ไปดึง prisma เวอร์ชันล่าสุดจาก registry สด ๆ ทุกครั้งที่ build — ไม่ตรงกับ @prisma/client)
RUN npm ci --workspace=apps/api --include=dev

COPY apps/api apps/api
WORKDIR /app/apps/api
RUN npx prisma generate

EXPOSE 4000
# ทุกครั้งที่เริ่ม container: apply migration ที่ค้าง (ไม่แตะข้อมูลเดิม) → ถ้าตั้ง SEED_ADMIN_PASSWORD ไว้ ให้ seed สถานที่ +
# บัญชีแอดมิน (ข้ามของที่มีอยู่แล้ว รันซ้ำได้) → เปิด server; platform ที่ไม่มีช่องให้รันคำสั่งครั้งเดียวจะได้ไม่ต้อง seed เอง
CMD ["sh", "-c", "npx prisma migrate deploy && if [ -n \"$SEED_ADMIN_PASSWORD\" ]; then node prisma/seed.js; fi && node src/index.js"]
