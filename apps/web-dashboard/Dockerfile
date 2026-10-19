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

# nginx-unprivileged: รันด้วย user ที่ไม่ใช่ root (พอร์ตเริ่มต้น 8080 แทนค่า ${PORT} ใน template เหมือนเดิม)
FROM nginxinc/nginx-unprivileged:1.27-alpine
ENV PORT=8080
COPY --from=build /app/apps/web-dashboard/dist /usr/share/nginx/html
COPY apps/web-dashboard/nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5   CMD wget -qO /dev/null http://127.0.0.1:${PORT}/ || exit 1
