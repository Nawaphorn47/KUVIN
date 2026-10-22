"""สตอรี่บอร์ดคลิปสาธิตแบบง่าย (6 ขั้น ประมาณ 2 นาที): python build-simple.py แล้วรัน node render-simple.mjs จาก e2e/"""
from pathlib import Path
import html
esc = html.escape
S = "../test-report/screens/"
STEPS = [
    ("เข้าสู่ระบบ", "0:00–0:15", "มือถือผู้โดยสาร", S + "02-passenger-auth/02-otp-test-banner.png",
     "กรอกเบอร์โทร กดขอรหัส OTP แล้วกรอกรหัสที่ขึ้นบนจอ",
     "เข้าใช้ KUVIN ได้ด้วยเบอร์โทร อีเมล หรือบัญชี Google"),
    ("เรียกวิน", "0:15–0:40", "มือถือผู้โดยสาร", S + "03-full-trip-passenger/02-confirm.png",
     "เลือกปลายทาง ดูค่าโดยสาร แล้วกด “เรียกวินเลย”",
     "เลือกปลายทาง เห็นค่าโดยสารก่อนยืนยัน แล้วกดเรียกได้ทันที"),
    ("คนขับรับงาน", "0:40–1:00", "มือถือผู้ขับขี่", S + "03-full-trip-driver/03-incoming-job.png",
     "คนขับกดออนไลน์ งานเด้งขึ้นพร้อมนับถอยหลัง 15 วินาที กด “รับงาน”",
     "ระบบเสนองานให้คนขับตามคิว มีเวลา 15 วินาทีให้ตอบรับ"),
    ("ติดตามและแชต", "1:00–1:15", "มือถือผู้โดยสาร", S + "03-full-trip-passenger/05-chat-sent.png",
     "ผู้โดยสารเห็นคนขับบนแผนที่ และพิมพ์แชตนัดจุดรับ",
     "ติดตามตำแหน่งคนขับและแชตกันในแอปได้เลย ไม่ต้องให้เบอร์โทร"),
    ("จบทริปและให้คะแนน", "1:15–1:40", "มือถือผู้ขับขี่และผู้โดยสาร", S + "03-full-trip-passenger/10-rating.png",
     "คนขับกดจบการเดินทางและยืนยันรับเงิน ผู้โดยสารให้ดาว 1–5",
     "ถึงที่หมายจ่ายเงินสดหรือโอนพร้อมเพย์ แล้วให้คะแนนคนขับ"),
    ("ผู้ดูแลอนุมัติคนขับ", "1:40–2:00", "คอมพิวเตอร์ (Web Dashboard)", S + "05-driver-signup-and-admin/09-admin-review-modal.png",
     "ผู้ดูแลเปิดแท็บรออนุมัติ ตรวจเอกสาร แล้วกด “อนุมัติ”",
     "ผู้ดูแลวิทยาเขตตรวจเอกสารและอนุมัติผู้ขับขี่ได้ในหน้าเดียว"),
]
TIPS = ["ใช้มือถือ 2 เครื่อง (ผู้โดยสาร/ผู้ขับขี่) และคอม 1 เครื่อง บันทึกหน้าจอแยกทีละขั้นแล้วนำมาต่อกัน",
        "ใช้เบอร์ทดสอบ (OTP_TEST_PHONES) เพื่อให้รหัสขึ้นบนจอ และเปิดโหมดห้ามรบกวนก่อนอัด",
        "ใช้ข้อมูลทดสอบ ไม่ให้เห็นเบอร์โทร เลขบัญชี หรือรูปบัตรประชาชนจริง",
        "ภาพในเอกสารเป็นรุ่นทดสอบ ตอนถ่ายจริงให้ใช้แอปรุ่นล่าสุด"]
CSS = '''@page{size:A4 landscape;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:"Leelawadee UI","Tahoma",sans-serif;color:#17302C}
.page{width:297mm;height:210mm;padding:10mm 12mm;page-break-after:always;display:flex;flex-direction:column;overflow:hidden}
header{border-bottom:3px solid #176B5E;padding-bottom:5px;margin-bottom:8px;display:flex;gap:12px;align-items:baseline}
header h2{margin:0;font-size:17pt;flex:1}header span{color:#176B5E;font-weight:700}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm;flex:1;min-height:0}
.st{display:flex;flex-direction:column;min-height:0}
.hd{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.n{background:#176B5E;color:#fff;border-radius:50%;width:26px;height:26px;display:grid;place-items:center;font-weight:800}
.hd b{font-size:13pt;flex:1}.hd small{color:#176B5E;font-weight:700}
.img{height:100mm;background:#EEF3F2;border:1px solid #C9DAD6;border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.img img{max-width:100%;max-height:100%;object-fit:contain}
.dev{font-size:9.5pt;color:#46605B;margin:4px 0}
.do{font-size:10.5pt;line-height:1.35;margin:2px 0}
.narr{font-size:10.5pt;background:#F3F7F6;border-left:4px solid #176B5E;padding:5px 8px;margin-top:5px;border-radius:4px}
.tips{font-size:10pt;margin-top:6px}.tips h3{margin:0 0 3px;color:#176B5E;font-size:11pt}.tips ul{margin:0;padding-left:18px}
'''
def step(i, s):
    t, tm, dev, img, do, narr = s
    return (f'<div class="st"><div class="hd"><span class="n">{i}</span><b>{esc(t)}</b><small>{tm}</small></div>'
            f'<div class="img"><img src="{img}"></div><div class="dev">{esc(dev)}</div>'
            f'<div class="do"><b>ทำ:</b> {esc(do)}</div><div class="narr">“{esc(narr)}”</div></div>')
def page(title, items, start, extra=""):
    return (f'<section class="page"><header><h2>{title}</h2><span>ความยาวรวมประมาณ 2 นาที</span></header>'
            f'<div class="row">{"".join(step(start + k, s) for k, s in enumerate(items))}</div>{extra}</section>')
tips = '<div class="tips"><h3>เตรียมก่อนถ่าย</h3><ul>' + "".join(f"<li>{esc(t)}</li>" for t in TIPS) + "</ul></div>"
doc = (f'<!doctype html><html lang="th"><meta charset="utf-8"><style>{CSS}</style>'
       + page("สตอรี่บอร์ดคลิปสาธิต KUVIN: ผู้โดยสารและผู้ขับขี่ (ขั้น 1–3)", STEPS[:3], 1)
       + page("สตอรี่บอร์ดคลิปสาธิต KUVIN: จนจบการเดินทางและผู้ดูแล (ขั้น 4–6)", STEPS[3:], 4, tips) + "</html>")
Path(__file__).with_name("simple-storyboard.html").write_text(doc, encoding="utf-8")
print("ok")
