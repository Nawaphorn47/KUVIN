import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AreaForm, { toForm } from "../components/AreaForm";
import { PageHeader } from "../components/AdminLayout";
import { api } from "../services/api";
import { useAdminSession } from "../lib/adminSession";

// ตั้งค่าพื้นที่ที่กำลังดู: แอดมินพื้นที่แก้พื้นที่ตัวเอง / super แก้พื้นที่ที่เลือกไว้ทางซ้าย
export default function AreaSettings() {
  const { isSuper, areaId, reloadAreas } = useAdminSession();
  const [area, setArea] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!areaId) return;
    api
      .get(`/admin/areas/${areaId}`)
      .then(({ data }) => setArea(data))
      .catch((err) => setError(err.response?.data?.message || "โหลดข้อมูลพื้นที่ไม่สำเร็จ"));
  }, [areaId]);

  async function save(body) {
    const { data } = await api.patch(`/admin/areas/${areaId}`, body);
    setArea(data);
    reloadAreas();
  }

  return (
    <div>
      <PageHeader
        title="ตั้งค่าพื้นที่"
        subtitle={area ? `${area.displayName} · ${area.name}` : "ค่าโดยสาร ขอบเขต เบอร์ฉุกเฉิน ชื่อและโลโก้"}
      />
      <div className="mx-auto max-w-7xl px-8 py-8">
        {!areaId && <p className="text-stone-500">เลือกพื้นที่ที่ต้องการตั้งค่าจากเมนูด้านซ้ายก่อน</p>}
        {error && <p className="text-red-700">{error}</p>}
        {areaId && !area && !error && <Loader2 className="h-6 w-6 animate-spin text-stone-400" />}
        {area && <AreaForm key={area.id} initial={toForm(area)} mode="edit" canManage={isSuper} onSubmit={save} />}
      </div>
    </div>
  );
}
