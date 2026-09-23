# เว็บแดชบอร์ดแอดมิน — build เป็นไฟล์ static แล้วเสิร์ฟด้วย nginx (โครงเดียวกับ apps/mobile/Dockerfile)
# build context = root ของ repo: `docker build -f apps/web-dashboard/Dockerfile --build-arg VITE_API_URL=https://.../api .`
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY apps/web-dashboard/package.json apps/web-dashboard/
RUN npm ci --workspace=apps/web-dashboard

COPY apps/web-dashboard apps/web-dashboard
# VITE_API_URL ต้อง build เข้าไปตอนนี้เลย (ไม่ใช่ runtime env) — ดูหมายเหตุเดียวกันใน apps/mobile/Dockerfile
ARG VITE_API_URL
RUN npm run build --workspace=apps/web-dashboard

FROM nginx:1.27-alpine
ENV PORT=80
COPY --from=build /app/apps/web-dashboard/dist /usr/share/nginx/html
COPY apps/web-dashboard/nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
