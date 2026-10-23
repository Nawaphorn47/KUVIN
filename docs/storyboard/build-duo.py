"""สตอรี่บอร์ดคลิปสาธิตแบบมีตัวละคร "วิน" กับ "ผู้โดยสาร" (12 ช็อต ประมาณ 50 วินาที)
รัน: python build-duo.py แล้วรัน node render-duo.mjs จากโฟลเดอร์ที่มี playwright (เช่น e2e/)"""
from pathlib import Path
import html
esc = html.escape
S = "../test-report/screens/"
CSS = '''
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:"Leelawadee UI","Tahoma",sans-serif;color:#17302C;font-size:10.5pt}
.page{width:297mm;height:210mm;padding:9mm 11mm;page-break-after:always;display:flex;flex-direction:column;overflow:hidden}
header{display:flex;align-items:baseline;gap:12px;border-bottom:3px solid #176B5E;padding-bottom:5px;margin-bottom:7px}
header .no{background:#176B5E;color:#fff;border-radius:6px;padding:2px 10px;font-weight:700;font-size:11.5pt}
header h2{margin:0;font-size:16pt;flex:1}
header .time{font-weight:700;color:#176B5E;font-size:12pt}
.grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:7mm 6mm;flex:1;min-height:0}
.shot{display:flex;flex-direction:column;min-height:0}
.fr{position:relative;height:49mm;border:1.5px solid #46605B;border-radius:4px;overflow:hidden;flex:none}
.fr .tag{position:absolute;left:0;top:0;background:#17302C;color:#fff;font-size:8.5pt;padding:1px 7px;border-bottom-right-radius:6px;z-index:3;font-weight:700}
.fr .sz{position:absolute;right:0;top:0;background:#fff;border-left:1px solid #46605B;border-bottom:1px solid #46605B;font-size:8pt;padding:1px 6px;z-index:3}
.fr .e{position:absolute;line-height:1;z-index:2;filter:grayscale(.1)}
.fr.in{background:linear-gradient(#F4E8D5,#E8D7BA)}
.fr.rain{background:linear-gradient(#C5D3DC,#AFBFC9)}
.fr.day{background:linear-gradient(#DFF0F6,#E9EFDD)}
.fr.night{background:linear-gradient(#1F2D4A,#0F1A2E)}
.fr.adm{background:linear-gradient(#EAF0EF,#D9E4E2)}
.fr.ins{background:#E9EEED;display:flex;align-items:center;justify-content:center}
.fr.ins img{height:92%;border:2px solid #17302C;border-radius:8px;object-fit:contain}
.fr.title{flex-direction:column;background:#176B5E;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:800;font-size:22pt;line-height:1.1}
.fr.title small{display:block;font-size:9pt;font-weight:400;margin-top:4px}
.info{font-size:9pt;line-height:1.3;margin-top:3px}
.info b{color:#176B5E}
.info .d{background:#F3F7F6;border-left:3px solid #176B5E;padding:2px 5px;margin-top:2px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12mm;flex:1;min-height:0}
h3{margin:0 0 4px;color:#176B5E;font-size:11.5pt}
ul{margin:0;padding-left:16px;line-height:1.35;font-size:10pt}
li{margin-bottom:3px}
table{width:100%;border-collapse:collapse;font-size:9.5pt}
th{background:#176B5E;color:#fff;padding:3px 6px;text-align:left}
td{border-bottom:1px solid #D5E3E0;padding:3px 6px;vertical-align:top}
.log{background:#F3F7F6;border-left:5px solid #176B5E;padding:6px 10px;border-radius:4px;font-size:11pt;margin-bottom:8px}
'''


def shot(s):
    n, loc, size, cam, bg, art, act, snd, sec = s
    if bg == "ins":
        inner = f'<img src="{art[0][0]}">'
    elif bg == "title":
        inner = 'KUVIN<small>เรียกวิน เรียกความสบายใจ · kuvinn.tech</small>'
    else:
        inner = "".join(f'<span class="e" style="left:{x}%;top:{y}%;font-size:{z}px">{e}</span>' for e, x, y, z in art)
    return (f'<div class="shot"><div class="fr {bg}"><span class="tag">ช็อต {n}</span><span class="sz">{esc(size)} · {sec} วิ</span>{inner}</div>'
            f'<div class="info"><b>{esc(loc)}</b> · กล้อง: {esc(cam)}<br>{esc(act)}<div class="d">{esc(snd)}</div></div></div>')



SHOTS = [
    (1, "ถนนในมหาวิทยาลัย", "WS กว้าง", "นิ่ง", "day", [("😟", 40, 30, 90), ("⌚", 62, 14, 50)], "ผู้โดยสาร (มิ้นท์) ยืนรอข้างถนน มองนาฬิกา ท่าทางรีบ ไม่มีวินผ่านมา", "มิ้นท์: “สายแล้ว... เรียกวินดีกว่า”", 4),
    (2, "ถนนในมหาวิทยาลัย", "INSERT หน้าจอ", "ใกล้", "ins", [(S + "03-full-trip-passenger/02-confirm.png", "")], "มิ้นท์เปิดแอป เลือกปลายทาง เห็นค่าวิน 20 บาท แล้วกด “เรียกวินเลย”", "มิ้นท์: “20 บาท เห็นราคาเลย”", 6),
    (3, "จุดวิน", "INSERT หน้าจอ", "ใกล้", "ins", [(S + "03-full-trip-driver/03-incoming-job.png", "")], "มือถือของวิน (ลุงสมชาย) สั่น งานใหม่เด้งขึ้นพร้อมนับถอยหลัง 15 วินาที", "เสียงแจ้งเตือนงานใหม่", 4),
    (4, "จุดวิน", "MS กลาง", "นิ่ง", "day", [("🧓", 30, 24, 90), ("👍", 50, 24, 60), ("🛵", 56, 46, 90)], "ลุงยิ้ม กด “รับงาน” แล้วสตาร์ทรถออกไปรับ", "ลุงสมชาย: “มีคนเรียกแล้ว ไปครับ”", 3),
    (5, "ถนนในมหาวิทยาลัย", "INSERT หน้าจอ", "ใกล้", "ins", [(S + "03-full-trip-passenger/04-driver-arriving.png", "")], "มิ้นท์เห็นข้อมูลวินและตำแหน่งสดบนแผนที่ว่ากำลังมา", "เสียงดนตรีสดใส", 3),
    (6, "ถนนในมหาวิทยาลัย", "WS กว้าง", "แพนตามรถ", "day", [("🛵", 18, 42, 100), ("🧓", 30, 36, 70), ("🙋‍♀️", 66, 26, 90)], "วินแล่นมาจอดตรงหน้ามิ้นท์พอดี มิ้นท์โบกมือ", "เสียงเครื่องยนต์", 4),
    (7, "ข้างถนน", "2-Shot สองคน", "นิ่ง", "day", [("🙋‍♀️", 22, 24, 90), ("🧓", 54, 24, 90), ("💬", 40, 8, 50)], "ลุงทักทายและยืนยันปลายทาง มิ้นท์เทียบทะเบียนกับในแอป แล้วขึ้นรถ", "ลุง: “ไปคณะวิทย์ใช่ไหมครับ” มิ้นท์: “ใช่ค่ะ”", 5),
    (8, "ถนนในมหาวิทยาลัย", "Tracking ตามรถ", "กล้องเคลื่อนขนานรถ", "day", [("🛵", 30, 44, 100), ("🌳", 8, 24, 70), ("🌳", 80, 22, 70)], "วินพามิ้นท์ขับผ่านถนนในมหาวิทยาลัย ดนตรีสดใส", "ดนตรีสดใส", 6),
    (9, "หน้าคณะ", "2-Shot สองคน", "นิ่ง", "day", [("🙋‍♀️", 20, 24, 90), ("💵", 44, 34, 60), ("🧓", 56, 24, 90)], "ถึงที่หมาย มิ้นท์ยื่นเงินสด 20 บาท ลุงรับและยิ้ม", "ลุง: “ขอบคุณครับ ตั้งใจเรียนนะ”", 5),
    (10, "หน้าคณะ", "INSERT หน้าจอ", "ใกล้", "ins", [(S + "03-full-trip-driver/08-finish-collect.png", "")], "ลุงกด “จบการเดินทาง” และ “ยืนยันได้รับเงินแล้ว”", "เสียงยืนยันสำเร็จ", 3),
    (11, "หน้าคณะ", "INSERT หน้าจอ", "ใกล้", "ins", [(S + "03-full-trip-passenger/10-rating.png", "")], "มิ้นท์กดให้ 5 ดาว", "เสียงดาวติ๊ง", 3),
    (12, "หน้าคณะ", "TITLE การ์ดปิด", "นิ่ง", "title", [], "มิ้นท์โบกมือลา ลุงยิ้มแล้วขี่ออกไป ตัดเป็นโลโก้ KUVIN และ kuvinn.tech", "ดนตรีจบ", 5),
]
TOTAL = sum(x[8] for x in SHOTS)
TIPS = ["นักแสดง 2 คน คือผู้โดยสารและวิน ใช้วินจริงหรือเพื่อนแสดงก็ได้ ขออนุญาตก่อนถ่ายและให้ทุกคนสวมหมวกกันน็อก",
        "ถ่ายฉากคนจริงก่อน แล้วอัดหน้าจอแอปจากมือถือ 2 เครื่อง (ผู้โดยสารและวิน) แยกต่างหากมาแทรก",
        "ใช้เบอร์ทดสอบ (OTP_TEST_PHONES) และข้อมูลทดสอบ ไม่ให้เห็นเบอร์โทร เลขบัญชี หรือบัตรประชาชนจริง",
        "ภาพร่างเป็นการวางองค์ประกอบเบื้องต้น ภาพหน้าจอเป็นแอปรุ่นทดสอบ ตอนถ่ายจริงให้ใช้แอปรุ่นล่าสุด"]


def page(chunk, title, extra=""):
    return (f'<section class="page"><header><span class="no">ช็อต {chunk[0][0]}–{chunk[-1][0]}</span><h2>{esc(title)}</h2></header>'
            f'<div class="grid">{"".join(shot(c) for c in chunk)}</div>{extra}</section>')


tips = '<div class="info" style="margin-top:4px"><b>เตรียมก่อนถ่าย</b><ul style="margin:2px 0;padding-left:16px">' + "".join(f"<li>{esc(t)}</li>" for t in TIPS) + "</ul></div>"
doc = (f'<!doctype html><html lang="th"><meta charset="utf-8"><style>{CSS}</style>'
       + page(SHOTS[:6], f"วินกับคนเรียก: เรียกวินและวินรับงาน (ความยาวรวมประมาณ {TOTAL} วินาที)")
       + page(SHOTS[6:], "วินกับคนเรียก: เดินทาง จ่ายเงิน และให้คะแนน", tips)
       + "</html>")
Path(__file__).with_name("duo-storyboard.html").write_text(doc, encoding="utf-8")
print("ok", TOTAL, "sec")
