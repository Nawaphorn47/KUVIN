# รายงานผลทดสอบอัตโนมัติ (E2E)

สร้างเมื่อ 20/10/2569 23:29:23 จากการรัน `e2e` (Playwright, Chromium ขนาดมือถือ 375×812) กับ stack ในเครื่อง

| ผ่าน | ไม่ผ่าน | ข้าม | รวม | เวลา |
|---:|---:|---:|---:|---:|
| **27** | **0** | 0 | 27 | 35.0 วินาที |

## รายการทดสอบ

| รหัส | รายการ | ผล | เวลา |
|---|---|:-:|---:|
| TC-01-01 | API /health ตอบ 200 และเชื่อมฐานข้อมูลได้ | ✅ | 0.4 วิ |
| TC-01-02 | API ส่ง security headers และไม่เปิดเผยรุ่นของ framework | ✅ | 0.0 วิ |
| TC-01-03 | ค่าตั้งค่าที่แอปใช้ (auth/config) บอกว่า OTP เป็นโหมดทดสอบ และมีประเภทคนขับครบ 3 แบบ | ✅ | 0.0 วิ |
| TC-01-04 | เว็บแอปเปิดได้ → Splash → หน้าต้อนรับ → หน้าเข้าสู่ระบบ | ✅ | 2.9 วิ |
| TC-01-05 | หน้าแอดมินเปิดได้และมีฟอร์มล็อกอิน | ✅ | 0.7 วิ |
| TC-01-06 | ลิงก์แชร์ทริปที่ไม่ถูกต้องแสดงข้อความ ไม่พังทั้งหน้า | ✅ | 1.0 วิ |
| TC-02-01 | เบอร์ใหม่: ขอ OTP → ใส่รหัส → ตั้งชื่อ → เข้าหน้าแรกได้ | ✅ | 1.7 วิ |
| TC-02-02 | กรอก OTP ผิด: ขึ้นข้อความผิดพลาด ไม่เข้าระบบ | ✅ | 1.4 วิ |
| TC-02-03 | ขอ OTP ซ้ำทันทีไม่ได้ (นับถอยหลัง 30 วินาที) | ✅ | 1.2 วิ |
| TC-02-04 | เบอร์ไม่ถูกต้อง (ไม่ครบ 10 หลัก) กดขอรหัสไม่ได้ | ✅ | 0.7 วิ |
| TC-02-05 | เรียกวินครั้งแรกต้องถ่ายเซลฟี่ก่อน แล้วกลับมาเรียกต่อได้ | ✅ | 2.2 วิ |
| TC-03-01 | ทริปเต็ม: เรียกวิน → รับงาน → แชต → เดินทาง → จบ → จ่ายเงินสด → ให้คะแนน | ✅ | 10.0 วิ |
| TC-04-01 | แชร์ทริป: คนรับลิงก์เห็นชื่อเล่น/ป้ายทะเบียน/ตำแหน่ง แต่ไม่เห็นเบอร์โทรและนามสกุล | ✅ | 1.4 วิ |
| TC-04-02 | ผู้โดยสารเห็นเบอร์คนขับเฉพาะระหว่างทริป | ✅ | 0.0 วิ |
| TC-04-03 | จบทริปแล้วเบอร์ของอีกฝ่ายถูกซ่อน ทั้งในรายละเอียดและประวัติ | ✅ | 0.1 วิ |
| TC-04-04 | แจ้งปัญหาหลังทริปจากหน้าประวัติ → ส่งสำเร็จ → แอดมินพื้นที่เห็นเคส | ✅ | 1.5 วิ |
| TC-04-05 | แจ้งปัญหาซ้ำทริปเดิมขณะเคสยังเปิดอยู่ไม่ได้ | ✅ | 0.0 วิ |
| TC-04-06 | เอกสารคนขับเป็นไฟล์ส่วนตัว: เปิดผ่านลิงก์เซ็นแล้วได้ แต่เปิดผ่านโฟลเดอร์สาธารณะไม่ได้ | ✅ | 0.1 วิ |
| TC-04-07 | อัปโหลดเอกสาร: ไฟล์ที่ไม่ใช่รูปจริง (HTML ปลอมนามสกุล) ถูกปฏิเสธ | ✅ | 0.0 วิ |
| TC-04-08 | ผู้ใช้ทั่วไปอัปโหลดเข้าโฟลเดอร์สาธารณะไม่ได้ (เฉพาะแอดมิน) | ✅ | 0.0 วิ |
| TC-04-09 | สิทธิ์: ผู้โดยสารเรียกหน้าที่ของแอดมิน/คนขับไม่ได้ และคนนอกทริปอ่านแชตไม่ได้ | ✅ | 0.1 วิ |
| TC-04-10 | ไม่มี token เรียก API ที่ต้องล็อกอินไม่ได้ (401) | ✅ | 0.0 วิ |
| TC-05-01 | นิสิตสมัครขับ: เลือกประเภท → กรอกรหัสนิสิต → ส่งเอกสาร 5 ใบ → รอตรวจ | ✅ | 1.7 วิ |
| TC-05-02 | วินมอเตอร์ไซค์: ต้องกรอกเบอร์เสื้อวินและชื่อวิน, เอกสารต่างจากนิสิต (เสื้อวิน + ใบขับขี่สาธารณะ) | ✅ | 1.3 วิ |
| TC-05-03 | ไม่เลือกประเภท/นิสิตไม่กรอกรหัสนิสิต กดต่อไปไม่ได้ | ✅ | 0.8 วิ |
| TC-05-04 | แอดมินล็อกอินแดชบอร์ด เห็นคนขับรออนุมัติพร้อมประเภทและรูปเอกสาร แล้วอนุมัติได้ | ✅ | 2.2 วิ |
| TC-05-05 | แอดมินปฏิเสธเอกสาร: ต้องระบุเหตุผล และคนขับเห็นเหตุผลในแอป | ✅ | 3.7 วิ |

## รูปหน้าจอประกอบ

### 01 ระบบขึ้นครบ

<table><tr>
<td align="center" valign="top" width="200"><img src="screens/01-smoke/01-splash.png" width="190" alt="splash"><br><sub>splash</sub></td>
<td align="center" valign="top" width="200"><img src="screens/01-smoke/02-onboarding.png" width="190" alt="onboarding"><br><sub>onboarding</sub></td>
<td align="center" valign="top" width="200"><img src="screens/01-smoke/03-login.png" width="190" alt="login"><br><sub>login</sub></td>
<td align="center" valign="top" width="200"><img src="screens/01-smoke/04-admin-login.png" width="190" alt="admin-login"><br><sub>admin-login</sub></td>
</tr><tr>
<td align="center" valign="top" width="200"><img src="screens/01-smoke/05-track-invalid.png" width="190" alt="track-invalid"><br><sub>track-invalid</sub></td>
</tr></table>

### 02 ผู้โดยสาร: สมัคร/เข้าระบบ/ยืนยันตัวตน

<table><tr>
<td align="center" valign="top" width="200"><img src="screens/02-passenger-auth/01-login.png" width="190" alt="login"><br><sub>login</sub></td>
<td align="center" valign="top" width="200"><img src="screens/02-passenger-auth/02-otp-test-banner.png" width="190" alt="otp-test-banner"><br><sub>otp-test-banner</sub></td>
<td align="center" valign="top" width="200"><img src="screens/02-passenger-auth/03-ask-name.png" width="190" alt="ask-name"><br><sub>ask-name</sub></td>
<td align="center" valign="top" width="200"><img src="screens/02-passenger-auth/04-home.png" width="190" alt="home"><br><sub>home</sub></td>
</tr><tr>
<td align="center" valign="top" width="200"><img src="screens/02-passenger-auth/05-otp-wrong.png" width="190" alt="otp-wrong"><br><sub>otp-wrong</sub></td>
<td align="center" valign="top" width="200"><img src="screens/02-passenger-auth/06-otp-cooldown.png" width="190" alt="otp-cooldown"><br><sub>otp-cooldown</sub></td>
<td align="center" valign="top" width="200"><img src="screens/02-passenger-auth/07-confirm-needs-verify.png" width="190" alt="confirm-needs-verify"><br><sub>confirm-needs-verify</sub></td>
<td align="center" valign="top" width="200"><img src="screens/02-passenger-auth/08-verify-selfie-step.png" width="190" alt="verify-selfie-step"><br><sub>verify-selfie-step</sub></td>
</tr><tr>
<td align="center" valign="top" width="200"><img src="screens/02-passenger-auth/09-selfie-preview.png" width="190" alt="selfie-preview"><br><sub>selfie-preview</sub></td>
<td align="center" valign="top" width="200"><img src="screens/02-passenger-auth/10-confirm-ready.png" width="190" alt="confirm-ready"><br><sub>confirm-ready</sub></td>
</tr></table>

### 03 ทริปเต็ม — ฝั่งคนขับ

<table><tr>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-driver/01-home-offline.png" width="190" alt="home-offline"><br><sub>home-offline</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-driver/02-home-online.png" width="190" alt="home-online"><br><sub>home-online</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-driver/03-incoming-job.png" width="190" alt="incoming-job"><br><sub>incoming-job</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-driver/04-navigate-pickup.png" width="190" alt="navigate-pickup"><br><sub>navigate-pickup</sub></td>
</tr><tr>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-driver/05-chat-driver-view.png" width="190" alt="chat-driver-view"><br><sub>chat-driver-view</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-driver/06-arrived-pickup.png" width="190" alt="arrived-pickup"><br><sub>arrived-pickup</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-driver/07-during-ride.png" width="190" alt="during-ride"><br><sub>during-ride</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-driver/08-finish-collect.png" width="190" alt="finish-collect"><br><sub>finish-collect</sub></td>
</tr><tr>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-driver/09-finish-paid.png" width="190" alt="finish-paid"><br><sub>finish-paid</sub></td>
</tr></table>

### 03 ทริปเต็ม — ฝั่งผู้โดยสาร

<table><tr>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-passenger/01-home.png" width="190" alt="home"><br><sub>home</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-passenger/02-confirm.png" width="190" alt="confirm"><br><sub>confirm</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-passenger/03-searching.png" width="190" alt="searching"><br><sub>searching</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-passenger/04-driver-arriving.png" width="190" alt="driver-arriving"><br><sub>driver-arriving</sub></td>
</tr><tr>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-passenger/05-chat-sent.png" width="190" alt="chat-sent"><br><sub>chat-sent</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-passenger/06-chat-reply-received.png" width="190" alt="chat-reply-received"><br><sub>chat-reply-received</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-passenger/07-during-ride.png" width="190" alt="during-ride"><br><sub>during-ride</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-passenger/08-ride-completed-unpaid.png" width="190" alt="ride-completed-unpaid"><br><sub>ride-completed-unpaid</sub></td>
</tr><tr>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-passenger/09-ride-completed-paid.png" width="190" alt="ride-completed-paid"><br><sub>ride-completed-paid</sub></td>
<td align="center" valign="top" width="200"><img src="screens/03-full-trip-passenger/10-rating.png" width="190" alt="rating"><br><sub>rating</sub></td>
</tr></table>

### 04 ความปลอดภัยและความเป็นส่วนตัว

<table><tr>
<td align="center" valign="top" width="200"><img src="screens/04-safety-and-privacy/01-share-page.png" width="190" alt="share-page"><br><sub>share-page</sub></td>
<td align="center" valign="top" width="200"><img src="screens/04-safety-and-privacy/02-history.png" width="190" alt="history"><br><sub>history</sub></td>
<td align="center" valign="top" width="200"><img src="screens/04-safety-and-privacy/03-report-form.png" width="190" alt="report-form"><br><sub>report-form</sub></td>
<td align="center" valign="top" width="200"><img src="screens/04-safety-and-privacy/04-report-sent.png" width="190" alt="report-sent"><br><sub>report-sent</sub></td>
</tr></table>

### 05 สมัครขับวิน + แอดมินตรวจเอกสาร

<table><tr>
<td align="center" valign="top" width="200"><img src="screens/05-driver-signup-and-admin/01-choose-type.png" width="190" alt="choose-type"><br><sub>choose-type</sub></td>
<td align="center" valign="top" width="200"><img src="screens/05-driver-signup-and-admin/02-student-form.png" width="190" alt="student-form"><br><sub>student-form</sub></td>
<td align="center" valign="top" width="200"><img src="screens/05-driver-signup-and-admin/03-student-documents-empty.png" width="190" alt="student-documents-empty"><br><sub>student-documents-empty</sub></td>
<td align="center" valign="top" width="200"><img src="screens/05-driver-signup-and-admin/04-student-documents-full.png" width="190" alt="student-documents-full"><br><sub>student-documents-full</sub></td>
</tr><tr>
<td align="center" valign="top" width="200"><img src="screens/05-driver-signup-and-admin/05-pending.png" width="190" alt="pending"><br><sub>pending</sub></td>
<td align="center" valign="top" width="200"><img src="screens/05-driver-signup-and-admin/06-pro-form.png" width="190" alt="pro-form"><br><sub>pro-form</sub></td>
<td align="center" valign="top" width="200"><img src="screens/05-driver-signup-and-admin/07-pro-documents.png" width="190" alt="pro-documents"><br><sub>pro-documents</sub></td>
<td align="center" valign="top" width="200"><img src="screens/05-driver-signup-and-admin/08-admin-dashboard.png" width="190" alt="admin-dashboard"><br><sub>admin-dashboard</sub></td>
</tr><tr>
<td align="center" valign="top" width="200"><img src="screens/05-driver-signup-and-admin/09-admin-review-modal.png" width="190" alt="admin-review-modal"><br><sub>admin-review-modal</sub></td>
<td align="center" valign="top" width="200"><img src="screens/05-driver-signup-and-admin/10-admin-after-approve.png" width="190" alt="admin-after-approve"><br><sub>admin-after-approve</sub></td>
<td align="center" valign="top" width="200"><img src="screens/05-driver-signup-and-admin/11-admin-reject-reason.png" width="190" alt="admin-reject-reason"><br><sub>admin-reject-reason</sub></td>
<td align="center" valign="top" width="200"><img src="screens/05-driver-signup-and-admin/12-driver-sees-rejection.png" width="190" alt="driver-sees-rejection"><br><sub>driver-sees-rejection</sub></td>
</tr></table>

---
แผนทดสอบมือสำหรับสิ่งที่ autotest ทำแทนไม่ได้ (GPS จริง, กล้อง, แจ้งเตือน, iPhone ฯลฯ): [../TEST_PLAN.md](../TEST_PLAN.md)
