import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import Button from "../../components/ui/Button";
import StatusScreen from "../../components/shared/StatusScreen";
import { useApp } from "../../context/AppContext";

export default function VerificationSuccess() {
  const navigate = useNavigate();
  const { setMode } = useApp();

  return (
    <StatusScreen
      tone="ok"
      icon={Check}
      title="ผ่านแล้ว พร้อมรับงาน!"
      text="เปิดออนไลน์เมื่อไหร่ก็เข้าคิวรับงานได้เลย"
      actions={
        <>
          <Button
            onClick={() => {
              setMode("driver");
              navigate("/driver/home");
            }}
          >
            เริ่มรับงานเลย
          </Button>
          <Button variant="ghost" onClick={() => navigate("/driver/profile")}>
            กลับไปหน้าบัญชี
          </Button>
        </>
      }
    />
  );
}
