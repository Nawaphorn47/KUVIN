"""เรียก sonar_report.py ของอาจารย์โดยแทนฟอนต์ Helvetica (ไม่มีอักษรไทย) ด้วย Sarabun"""
import runpy, sys
from pathlib import Path
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONTS = Path.home() / "AppData/Local/Microsoft/Windows/Fonts"  # Sarabun ติดตั้งแบบรายผู้ใช้
for name, file in {
    "Helvetica": "Sarabun-Regular.ttf",
    "Helvetica-Bold": "Sarabun-Bold.ttf",
    "Helvetica-Oblique": "Sarabun-Italic.ttf",
    "Helvetica-BoldOblique": "Sarabun-BoldItalic.ttf",
}.items():
    pdfmetrics.registerFont(TTFont(name, str(FONTS / file)))
pdfmetrics.registerFontFamily("Helvetica", normal="Helvetica", bold="Helvetica-Bold",
                              italic="Helvetica-Oblique", boldItalic="Helvetica-BoldOblique")

sys.argv[0] = str(Path(__file__).with_name("sonar_report.py"))
runpy.run_path(sys.argv[0], run_name="__main__")
