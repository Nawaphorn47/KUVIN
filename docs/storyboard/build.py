"""สร้าง storyboard.html จากข้อมูลฉากด้านล่าง แล้วเรนเดอร์เป็น PDF ด้วย render.mjs
รัน: python build.py   (จากนั้นรัน node render.mjs จากโฟลเดอร์ที่มี playwright เช่น e2e/)
ภาพประกอบใช้ภาพหน้าจอจริงของระบบจาก docs/test-report (รุ่นทดสอบ) ตอนถ่ายจริงให้ใช้แอปรุ่นล่าสุด
"""
from pathlib import Path
import html

S = "../test-report/screens/"
F = "../test-report/figures/"

# (หมายเลขฉาก, ชื่อฉาก, เวลา, อุปกรณ์, ภาพ[(ไฟล์, คำอธิบายสั้น)], wide?, สิ่งที่ทำบนจอ[], คำบรรยาย, เคล็ดลับการถ่าย)
SCENES = [
    ("1", "เปิดตัวและที่มาของปัญหา", "0:00–0:15", "ภาพกราฟิกขึ้นข้อความ (ตัดต่อ) ตามด้วยโลโก้", [], False,
     ["ขึ้นชื่อ KUVIN พร้อมโลโก้ และข้อความ: ระบบเรียกวินมอเตอร์ไซค์ภายในมหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน",
      "ใส่ภาพบรรยากาศหน้าวิน หรือภาพผู้โดยสารรอคิว (ถ่ายจริง 3–5 วินาที)"],
     "ในมหาวิทยาลัยขนาดใหญ่ การเรียกวินต้องไปรอที่จุดวิน ไม่รู้ราคา และไม่รู้ว่าใครขับ KUVIN คือแพลตฟอร์มเรียกวินสำหรับทุกวิทยาเขตของ มก. เปิดให้บริการที่กำแพงแสนเป็นแห่งแรก",
     "ถ่ายภาพวินจริงตอนกลางวันแสงดี หลีกเลี่ยงถ่ายติดใบหน้าคนอื่นชัดเจน หรือขออนุญาตก่อน"),
    ("2", "ผู้ใช้บริการเข้าสู่ระบบ", "0:15–0:35", "มือถือผู้โดยสาร (บันทึกหน้าจอ)",
     [(S + "02-passenger-auth/01-login.png", "หน้าเข้าสู่ระบบ"),
      (S + "02-passenger-auth/02-otp-test-banner.png", "รหัส OTP (โหมดทดสอบ)"),
      (S + "02-passenger-auth/04-home.png", "หน้าแรกพร้อมแผนที่")], False,
     ["เปิดแอป กรอกเบอร์โทรศัพท์ กด “ขอรหัส OTP”", "กรอกรหัส 6 หลักที่แสดงบนจอ (โหมดทดสอบ)", "เข้าถึงหน้าแรก เห็นแผนที่และตำแหน่งปัจจุบัน"],
     "ผู้ใช้เข้าสู่ระบบได้ด้วยเบอร์โทร อีเมล หรือบัญชี Google บัญชีเดียวใช้ได้ทั้งผู้โดยสารและผู้ขับขี่ ในช่วงทดสอบระบบแสดงรหัส OTP บนหน้าจอโดยไม่ต้องส่ง SMS",
     "ใช้เบอร์ที่อยู่ในรายการเบอร์ทดสอบ (OTP_TEST_PHONES) ปิดการแจ้งเตือนอื่นบนมือถือก่อนอัดหน้าจอ"),
    ("3", "เรียกวินและดูค่าโดยสาร", "0:35–1:00", "มือถือผู้โดยสาร",
     [(S + "03-full-trip-passenger/01-home.png", "ค้นหาปลายทาง"),
      (S + "03-full-trip-passenger/02-confirm.png", "เช็กก่อนเรียก: เห็นค่าวินก่อนยืนยัน"),
      (S + "03-full-trip-passenger/03-searching.png", "กำลังค้นหาคนขับ")], False,
     ["กดช่องค้นหา เลือกปลายทาง (หรือปักหมุดบนแผนที่)", "ชี้ให้เห็นเส้นทาง ระยะทาง และค่าโดยสารที่หน้าเช็กก่อนเรียก", "กด “เรียกวินเลย” แล้วเห็นสถานะกำลังค้นหาคนขับ"],
     "ผู้โดยสารเลือกปลายทาง ระบบคำนวณเส้นทางและค่าโดยสารให้เห็นก่อนยืนยันเสมอ ไม่ต้องต่อรองราคา เมื่อกดเรียก ระบบจะหาคนขับให้ทันที",
     "ถ่ายระยะใกล้ตรงตัวเลขค่าโดยสาร 2–3 วินาที ให้คนดูอ่านทัน"),
    ("4", "ผู้ขับขี่รับงานตามคิว", "1:00–1:25", "มือถือผู้ขับขี่ (เครื่องที่ 2) แล้วตัดสลับกับเครื่องผู้โดยสาร",
     [(S + "03-full-trip-driver/02-home-online.png", "ออนไลน์เข้าคิว"),
      (S + "03-full-trip-driver/03-incoming-job.png", "งานใหม่ นับถอยหลัง 15 วินาที"),
      (S + "03-full-trip-driver/04-navigate-pickup.png", "นำทางไปจุดรับ")], False,
     ["ผู้ขับขี่กดออนไลน์ให้เห็นว่าอยู่ในคิว", "งานใหม่เด้งขึ้น เห็นจุดรับ จุดส่ง ค่าโดยสาร และตัวนับถอยหลัง 15 วินาที", "กด “รับงาน” แล้วเห็นแผนที่นำทางไปจุดรับ"],
     "ผู้ขับขี่ที่ออนไลน์จะเข้าคิว ระบบเสนองานให้คนที่อยู่หัวคิวก่อนตามลำดับ มีเวลา 15 วินาทีในการตอบรับ จึงเป็นธรรมกับทุกคนและไม่ต้องแย่งลูกค้ากัน",
     "ถ่ายสองเครื่องพร้อมกัน แล้วตัดต่อสลับไปมา หรือวางเครื่องไว้ข้างกันในเฟรมเดียวก็ได้"),
    ("5", "ติดตามคนขับและแชต", "1:25–1:45", "มือถือผู้โดยสารและผู้ขับขี่",
     [(S + "03-full-trip-passenger/04-driver-arriving.png", "ผู้โดยสารเห็นคนขับกำลังมา"),
      (S + "03-full-trip-passenger/05-chat-sent.png", "ผู้โดยสารส่งข้อความ"),
      (S + "03-full-trip-driver/05-chat-driver-view.png", "คนขับเห็นข้อความ")], False,
     ["ผู้โดยสารเห็นข้อมูลคนขับ ทะเบียน และตำแหน่งสดบนแผนที่", "พิมพ์ข้อความนัดจุดรับ แล้วตัดไปเครื่องคนขับที่เห็นข้อความเด้งขึ้น"],
     "ผู้โดยสารเห็นตำแหน่งคนขับแบบสด และแชตนัดหมายกันในแอปได้เลย โดยไม่ต้องเปิดเผยเบอร์โทร ทั้งสองฝ่ายได้รับแจ้งเตือนบนมือถือเมื่อมีข้อความใหม่",
     "ถ้าต้องการโชว์การแจ้งเตือนบนมือถือ ให้ย่อแอปแล้วส่งข้อความจากอีกเครื่อง ถ่ายตอนแจ้งเตือนเด้งที่หน้าจอล็อก"),
    ("6", "เดินทาง ชำระเงิน และให้คะแนน", "1:45–2:15", "มือถือผู้โดยสารและผู้ขับขี่",
     [(S + "03-full-trip-passenger/07-during-ride.png", "ระหว่างเดินทาง"),
      (S + "03-full-trip-driver/08-finish-collect.png", "คนขับจบทริปและยืนยันรับเงิน"),
      (S + "03-full-trip-passenger/10-rating.png", "ผู้โดยสารให้คะแนน")], False,
     ["คนขับกด “ถึงจุดรับ” และ “เริ่มเดินทาง” ผู้โดยสารเห็นสถานะเปลี่ยนทันที", "ถึงปลายทาง คนขับกด “จบการเดินทาง” และ “ยืนยันได้รับเงินแล้ว” (เงินสด)", "ผู้โดยสารให้ดาว 1–5 พร้อมความคิดเห็น"],
     "ระหว่างเดินทางสถานะเปลี่ยนแบบทันทีทั้งสองฝั่ง เมื่อถึงที่หมายชำระเป็นเงินสดหรือโอนพร้อมเพย์ก็ได้ ระบบตรวจสลิปให้อัตโนมัติ แล้วผู้โดยสารให้คะแนนคนขับ",
     "ถ้าโชว์พร้อมเพย์ ให้ใช้ยอดน้อย ๆ และปิดบังเลขบัญชีจริงในภาพก่อนเผยแพร่"),
    ("7", "ความปลอดภัยของผู้โดยสาร", "2:15–2:40", "มือถือผู้โดยสาร",
     [(F + "p-sos.png", "ปุ่ม SOS และเบอร์ฉุกเฉิน"),
      (S + "04-safety-and-privacy/01-share-page.png", "ลิงก์แชร์การเดินทาง"),
      (S + "04-safety-and-privacy/03-report-form.png", "รายงานปัญหาหลังจบทริป")], False,
     ["เปิดหน้า SOS ให้เห็นเบอร์ฉุกเฉินของวิทยาเขต (ถ่ายในโหมดทดลอง ไม่กดแจ้งเหตุจริง)", "กดแชร์ลิงก์การเดินทางให้เห็นหน้าติดตามที่ญาติเปิดได้ โดยไม่ต้องติดตั้งแอป", "เปิดฟอร์มรายงานปัญหาของทริปที่จบแล้ว"],
     "ความปลอดภัยคือหัวใจของระบบ ผู้โดยสารกดแจ้งเหตุฉุกเฉินได้ทันที แชร์ลิงก์การเดินทางให้คนที่บ้านติดตาม และรายงานปัญหาให้ผู้ดูแลตรวจสอบหลังจบทริป",
     "ก่อนอัดฉากนี้ แจ้งผู้ดูแลหรือใช้ข้อมูลทดสอบ ห้ามกดส่งเหตุฉุกเฉินจริง"),
    ("8", "ผู้ดูแลอนุมัติผู้ขับขี่", "2:40–3:10", "คอมพิวเตอร์ (Web Dashboard) บันทึกหน้าจอ",
     [(S + "05-driver-signup-and-admin/08-admin-dashboard.png", "คิวงานของผู้ดูแล"),
      (S + "05-driver-signup-and-admin/09-admin-review-modal.png", "ตรวจเอกสารผู้สมัคร"),
      (S + "05-driver-signup-and-admin/10-admin-after-approve.png", "หลังอนุมัติ")], True,
     ["เข้าสู่ Web Dashboard ด้วยบัญชีผู้ดูแล เห็นตัวเลขสรุปและแท็บคิวงาน", "เปิดแท็บ “รออนุมัติคนขับ” กด “ตรวจสอบ” ดูรูปบัตร ใบขับขี่ และรูปรถ", "กด “อนุมัติ” แล้วคิวงานลดลง"],
     "ผู้ดูแลวิทยาเขตเห็นงานเร่งด่วนเรียงตามลำดับ เช่น เหตุฉุกเฉิน รายงานปัญหา และผู้สมัครขับรอตรวจเอกสาร ตรวจเอกสารแล้วอนุมัติได้ในหน้าเดียว",
     "ใช้ข้อมูลผู้สมัครทดสอบ ไม่ใช้รูปบัตรประชาชนของจริงในคลิป"),
    ("9", "แพลตฟอร์มสำหรับหลายวิทยาเขตและปิดท้าย", "3:10–3:30", "คอมพิวเตอร์ แล้วตามด้วยภาพโลโก้",
     [(F + "a-areas.png", "รายการวิทยาเขต"),
      (F + "a-area-settings.png", "ตั้งค่าวิทยาเขต: สี ค่าโดยสาร เบอร์ฉุกเฉิน")], True,
     ["ผู้ดูแลระบบสูงสุดเปิดหน้ารายการวิทยาเขต ให้เห็นว่าเพิ่มวิทยาเขตใหม่ได้", "เปิดหน้าตั้งค่าวิทยาเขตให้เห็นสี ค่าโดยสาร และเบอร์ฉุกเฉินที่ปรับได้", "จบด้วยโลโก้ KUVIN ชื่อผู้จัดทำ และลิงก์ kuvinn.tech"],
     "KUVIN ออกแบบเป็นแพลตฟอร์ม ผู้ดูแลระบบสูงสุดสร้างวิทยาเขตใหม่และตั้งค่าได้เองโดยไม่ต้องแก้โค้ด ตอนนี้เปิดที่กำแพงแสน และพร้อมขยายไปวิทยาเขตอื่นของ มก. ขอบคุณครับ",
     "ปิดท้ายด้วยภาพนิ่งโลโก้ 3–5 วินาที พร้อมข้อความชื่อ เบอร์ติดต่อหรืออีเมล (ถ้าต้องการ)"),
]

PREP = [
    "อุปกรณ์: มือถือ 2 เครื่อง (ผู้โดยสาร และผู้ขับขี่) และคอมพิวเตอร์ 1 เครื่องสำหรับ Web Dashboard ตั้งแนวตั้ง ความละเอียด 1080p ขึ้นไป",
    "ติดตั้งแอป Android ล่าสุด (หรือใช้ https://kuvinn.tech) และล็อกอินสองบัญชีไว้ล่วงหน้า: ผู้โดยสาร 1 บัญชี และผู้ขับขี่ที่อนุมัติแล้ว 1 บัญชี",
    "เตรียมผู้สมัครขับรายที่ 2 (ข้อมูลทดสอบ) ที่อัปโหลดเอกสารแล้วและยังรออนุมัติ เพื่อใช้ถ่ายฉาก 8",
    "ใช้เบอร์ในรายการ OTP_TEST_PHONES เพื่อให้รหัสแสดงบนจอ ไม่ต้องรอ SMS",
    "บนมือถือ: เปิดโหมดห้ามรบกวน ปิดแจ้งเตือนของแอปอื่น ชาร์จแบตให้เต็ม และเปิดการบันทึกหน้าจอ (Android: ปัดแถบด่วน > บันทึกหน้าจอ)",
    "ตรวจให้มือถือทั้งสองเครื่องอนุญาตตำแหน่ง กล้อง และการแจ้งเตือนแล้ว ก่อนเริ่มอัด",
    "อัดแยกทีละฉากและทีละเครื่อง แล้วนำมาตัดต่อ (เช่น CapCut) ใส่คำบรรยายตามสคริปต์ในแต่ละฉาก หรืออัดเสียงพากย์ทับภายหลัง",
    "ก่อนเผยแพร่ ตรวจว่าไม่มีเบอร์โทร เลขบัญชี หรือรูปบัตรประชาชนของจริงติดอยู่ในภาพ",
]


def esc(s):
    return html.escape(s)


def frames(sc):
    cls = "frames wide" if sc[5] else "frames"
    out = f'<div class="{cls}">'
    for f, cap in sc[4]:
        out += f'<figure><div class="img"><img src="{f}"></div><figcaption>{esc(cap)}</figcaption></figure>'
    return out + "</div>"


def scene_page(sc):
    n, title, t, dev, _imgs, _w, steps, narr, tip = sc
    left = frames(sc) if sc[4] else '<div class="frames title"><div class="titlecard">KUVIN<br><small>ระบบเรียกวินมอเตอร์ไซค์ภายในมหาวิทยาลัยเกษตรศาสตร์<br>วิทยาเขตกำแพงแสน</small></div></div>'
    return f'''<section class="page">
<header><span class="no">ฉากที่ {n}</span><h2>{esc(title)}</h2><span class="time">{esc(t)}</span></header>
<div class="body">{left}
<aside>
<h3>อุปกรณ์</h3><p>{esc(dev)}</p>
<h3>สิ่งที่ทำบนจอ</h3><ol>{"".join(f"<li>{esc(s)}</li>" for s in steps)}</ol>
<h3>คำบรรยาย</h3><p class="narr">“{esc(narr)}”</p>
<h3>เคล็ดลับการถ่าย</h3><p class="tip">{esc(tip)}</p>
</aside></div></section>'''


def cover():
    rows = "".join(f"<tr><td>{s[0]}</td><td>{esc(s[1])}</td><td>{esc(s[2])}</td><td>{esc(s[3])}</td></tr>" for s in SCENES)
    prep = "".join(f"<li>{esc(p)}</li>" for p in PREP)
    return f'''<section class="page cover">
<header><span class="no">Storyboard</span><h2>คลิปสาธิตการใช้งาน KUVIN (ความยาวประมาณ 3 นาที 30 วินาที)</h2></header>
<div class="two">
<div><h3>ลำดับฉากและเวลา</h3>
<table><tr><th>ฉาก</th><th>เนื้อหา</th><th>เวลา</th><th>อุปกรณ์</th></tr>{rows}</table>
<p class="tip" style="margin-top:8px">ภาพประกอบในแต่ละฉากเป็นหน้าจอจริงของระบบจากรุ่นทดสอบ ใช้เพื่อวางแผนการถ่าย ตอนถ่ายจริงให้ใช้แอปรุ่นล่าสุด</p></div>
<div><h3>เตรียมก่อนถ่าย</h3><ul class="prep">{prep}</ul></div>
</div></section>'''


CSS = '''
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:"Leelawadee UI","Tahoma",sans-serif;color:#17302C;font-size:11.5pt}
.page{width:297mm;height:210mm;padding:11mm 13mm;page-break-after:always;display:flex;flex-direction:column;overflow:hidden}
header{display:flex;align-items:baseline;gap:14px;border-bottom:3px solid #176B5E;padding-bottom:6px;margin-bottom:9px}
header .no{background:#176B5E;color:#fff;border-radius:6px;padding:2px 10px;font-weight:700;font-size:12pt}
header h2{margin:0;font-size:17pt;flex:1}
header .time{font-weight:700;color:#176B5E;font-size:13pt}
.body{display:flex;gap:12px;flex:1;min-height:0}
.frames{display:flex;gap:9px;flex:0 0 200mm}
.frames figure{margin:0;flex:1;text-align:center}
.frames .img{height:138mm;background:#EEF3F2;border:1px solid #C9DAD6;border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.frames img{max-width:100%;max-height:100%;object-fit:contain}
.frames figcaption{font-size:9.5pt;margin-top:4px;font-weight:700}
.frames.wide{flex-direction:column;flex-wrap:wrap}
.frames.wide figure{flex:0 0 auto;width:100%}
.frames.wide .img{height:auto}
.frames.wide{display:grid;grid-template-columns:1fr 1fr;gap:9px;align-content:start}
.frames.wide figure:first-child{grid-column:1/3}
.frames.wide figure:first-child .img{height:78mm}
.frames.wide figure:not(:first-child) .img{height:58mm}
.frames.title{align-items:center;justify-content:center;background:#176B5E;border-radius:10px}
.titlecard{color:#fff;font-size:44pt;font-weight:800;text-align:center;line-height:1.2}
.titlecard small{display:block;font-size:14pt;font-weight:400;margin-top:10px}
aside{flex:1;min-width:0;font-size:10.5pt}
aside h3{margin:8px 0 2px;font-size:10.5pt;color:#176B5E;border-bottom:1px solid #C9DAD6}
aside p,aside ol{margin:2px 0;line-height:1.35}
aside ol{padding-left:18px}
.narr{background:#F3F7F6;border-left:4px solid #176B5E;padding:6px 8px;border-radius:4px}
.tip{color:#46605B;font-size:9.5pt}
.cover .two{display:grid;grid-template-columns:1.15fr 1fr;gap:18px;flex:1;min-height:0}
.cover h3{margin:0 0 5px;color:#176B5E;font-size:12pt}
table{width:100%;border-collapse:collapse;font-size:10pt}
th{background:#176B5E;color:#fff;padding:4px 6px;text-align:left}
td{border-bottom:1px solid #D5E3E0;padding:4px 6px;vertical-align:top}
.prep{margin:0;padding-left:18px;font-size:10.5pt;line-height:1.4}
.prep li{margin-bottom:5px}
'''

doc = f'<!doctype html><html lang="th"><meta charset="utf-8"><title>KUVIN Storyboard</title><style>{CSS}</style>{cover()}{"".join(scene_page(s) for s in SCENES)}</html>'
Path(__file__).with_name("storyboard.html").write_text(doc, encoding="utf-8")
print("ok", len(SCENES), "scenes")
