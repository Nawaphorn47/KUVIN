# Build เป็นไฟล์ static (React SPA) แล้วเสิร์ฟด้วย nginx — เหมือน apps/mobile/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
# VITE_API_URL ต้อง build เข้าไปตอนนี้เลย (ไม่ใช่ runtime env) — ดูหมายเหตุเดียวกันใน apps/mobile/Dockerfile
ARG VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
