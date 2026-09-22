# Build เป็นไฟล์ static (React SPA) แล้วเสิร์ฟด้วย nginx — เบากว่ารัน `vite preview`/Node ใน production
FROM node:20-alpine AS build
WORKDIR /app

# คัดลอกเฉพาะ manifest ก่อนเพื่อให้ Docker cache layer นี้ไว้ (ไม่ต้อง npm ci ใหม่ทุกครั้งที่แก้แค่โค้ด)
COPY package.json ./
RUN npm install

COPY . .
# VITE_API_URL ต้อง build เข้าไปตอนนี้เลย (ไม่ใช่ runtime env) เพราะ Vite ฝัง import.meta.env ไว้ในบันเดิลตอน build
# ไม่ตั้งค่า = ใช้ hostname เดียวกับหน้าเว็บที่เปิดอยู่ (ดู src/lib/api.js) ซึ่งใช้ไม่ได้ถ้า frontend/backend อยู่คนละโดเมน
ARG VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
