# เวอร์ชันเว็บของแอป (ให้คนใช้ iPhone/เบราว์เซอร์เปิดผ่าน HTTPS) — build เป็นไฟล์ static แล้วเสิร์ฟด้วย nginx
# build context = root ของ repo: `docker build -f apps/mobile/Dockerfile --build-arg VITE_API_URL=https://.../api .`
FROM node:22-alpine AS build
WORKDIR /app

# ติดตั้งจาก package-lock.json ของ workspace ที่ root (ได้เวอร์ชันเดียวกับที่ทดสอบ) — ต้องเห็น package.json ของทุก workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY apps/web-dashboard/package.json apps/web-dashboard/
RUN npm ci --workspace=apps/mobile

COPY apps/mobile apps/mobile
# VITE_API_URL ต้อง build เข้าไปตอนนี้เลย (ไม่ใช่ runtime env) เพราะ Vite ฝัง import.meta.env ไว้ในบันเดิลตอน build
# ไม่ตั้งค่า = ใช้ hostname เดียวกับหน้าเว็บที่เปิดอยู่ (ดู src/lib/api.js) ซึ่งใช้ไม่ได้ถ้า frontend/backend อยู่คนละโดเมน
ARG VITE_API_URL
RUN npm run build --workspace=apps/mobile

FROM nginx:1.27-alpine
# platform อย่าง Railway กำหนดพอร์ตผ่าน $PORT — image ของ nginx แทนค่า ${PORT} ในไฟล์ templates/ ให้ตอนเริ่ม container
ENV PORT=80
COPY --from=build /app/apps/mobile/dist /usr/share/nginx/html
COPY apps/mobile/nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
