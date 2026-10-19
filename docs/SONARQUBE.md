# ตรวจคุณภาพโค้ดด้วย SonarQube

ใช้ชุดเครื่องมือของอาจารย์ที่ [suriyapi/SonarQube](https://github.com/suriyapi/SonarQube) (SonarQube Community + PostgreSQL ใน Docker)
ตั้งค่าการสแกนของ KU VIN อยู่ที่ [`sonar-project.properties`](../sonar-project.properties) ที่ root ของ repo

## 1. เปิด SonarQube

```bash
git clone https://github.com/suriyapi/SonarQube.git
cd SonarQube
docker compose up -d
```

รอ 1–2 นาที แล้วเปิด <http://localhost:9000> ล็อกอินครั้งแรกด้วย `admin` / `admin` แล้วระบบจะให้ตั้งรหัสใหม่
จากนั้นสร้าง token ที่ **My Account → Security → Generate Tokens** (ชนิด Global Analysis Token)

> ถ้ามี SonarQube ของแล็บอื่นใช้ชื่อ container `sonarqube` / `sonarqube_db` อยู่แล้ว ใช้ตัวเดิมได้เลย
> หรือแก้ `container_name` และ port ใน `docker-compose.yml` ก่อน `up` เพื่อไม่ให้ชนกัน

## 2. สแกน

สแกนจากไฟล์ที่อยู่ใน git เท่านั้น — ถ้า mount ทั้งโฟลเดอร์ที่มี `node_modules` เข้า container บน Windows
ตัว scanner จะไล่ไฟล์เป็นแสนไฟล์จน Docker Desktop ค้างได้

Git Bash จาก root ของ repo (แทน `<token>` ด้วย token ของตัวเอง):

```bash
rm -rf /tmp/kuvin-scan && mkdir -p /tmp/kuvin-scan
git archive HEAD | tar -x -C /tmp/kuvin-scan
cp sonar-project.properties /tmp/kuvin-scan/
MSYS_NO_PATHCONV=1 docker run --rm --network sonarqube_default \
  -e SONAR_HOST_URL=http://sonarqube:9000 -e SONAR_TOKEN=<token> \
  -v "$(cygpath -w /tmp/kuvin-scan):/usr/src" sonarsource/sonar-scanner-cli:11.3
```

- `--network sonarqube_default` คือ network ที่ compose ของอาจารย์สร้าง (ชื่อตามโฟลเดอร์ที่ clone มา)
- จบแล้วดูผลที่ <http://localhost:9000/dashboard?id=ku-vin>
- `git archive` ใช้ commit ล่าสุด — แก้โค้ดแล้วต้อง commit ก่อนสแกนผลถึงจะเปลี่ยน

## 3. ออกรายงาน PDF

ใช้ `sonar_report.py` ของอาจารย์ผ่าน [`sonarqube/sonar_report_th.py`](sonarqube/sonar_report_th.py)
ซึ่งแทนฟอนต์ Helvetica (ไม่มีอักษรไทย หัวข้อภาษาไทยจะกลายเป็นสี่เหลี่ยม) ด้วยฟอนต์ Sarabun ก่อนเรียกสคริปต์เดิม
ต้องวาง `sonar_report.py` ไว้โฟลเดอร์เดียวกัน และติดตั้งฟอนต์ Sarabun จาก Google Fonts

```bash
pip install requests reportlab
python sonar_report_th.py --host http://localhost:9000 --project ku-vin --token <token> --output report.pdf
```

## ผลการสแกน

| วันที่ | Quality Gate | Bugs | Vulnerabilities | Code Smells | รายงาน |
|---|---|---|---|---|---|
| 19 ต.ค. 2569 (ก่อนแก้) | ผ่าน¹ | 6 | 7 | 84 | [PDF](sonarqube/report-2026-10-19-baseline.pdf) |
| 19 ต.ค. 2569 (หลังแก้ CORS, regex, a11y) | ไม่ผ่าน² | 0 | 6 | 72 | [PDF](sonarqube/report-2026-10-19-after-fix.pdf) |

¹ สแกนครั้งแรกยังไม่มี "โค้ดใหม่" ให้ Quality Gate ตรวจ จึงผ่านโดยอัตโนมัติ
² ไม่ผ่านเพราะ coverage ของโค้ดใหม่ 0% (เกณฑ์ Sonar way ≥ 80%) — ชุดทดสอบ 91 กรณีผ่านทั้งหมด แต่ยังไม่ได้วัด coverage
ส่งเป็นไฟล์ lcov ให้ SonarQube ส่วนเงื่อนไขอื่นผ่าน (ไม่มี issue ใหม่, โค้ดซ้ำ 0%)

Vulnerabilities ที่เหลือ 6 จุด: container รันด้วย root 3 จุด (แก้ตอนทำ Docker สำหรับ deploy) และรหัสผ่านบัญชีทดสอบ
ใน `apps/mobile/src/pages/auth/Login.jsx` 3 จุด ซึ่งมีเฉพาะใน dev build (`__DEMO_LOGIN__` ตัดทิ้งตอน build จริง)

## การวัด coverage (ข้อจำกัดที่ต้องรู้)

- `cd apps/api && npm run test:coverage` เปิด API ชั่วคราวที่พอร์ต 4100 (`SLIP_PROVIDER=mock` เฉพาะตัวนี้), รันชุดทดสอบทั้ง 9 ชุด
  (รวม suspension/payment ที่ยิง HTTP+socket จริง) แล้วสร้าง `apps/api/coverage/lcov.info` — วัดได้ประมาณ 80% ของโค้ด API
- **coverage นับเฉพาะโค้ด API** (`sonar.coverage.exclusions` ตัด `apps/mobile`, `apps/web-dashboard`) เพราะหน้าจอ React ทดสอบด้วย
  Playwright e2e ที่ขับเบราว์เซอร์จริงและไม่ได้ออกรายงาน coverage ให้ Sonar อ่าน — ฝั่งหน้าจอจึงยังไม่มีตัวเลข coverage ที่วัดได้
  (ยังถูกตรวจ bug/vulnerability/code smell ตามปกติ)
- ขั้นตอนสแกน: รัน coverage → `git archive HEAD` ลง temp → คัดลอก `apps/api/coverage/lcov.info` ตามพาธเดิม → รัน scanner
