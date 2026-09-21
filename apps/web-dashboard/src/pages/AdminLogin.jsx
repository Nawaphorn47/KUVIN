import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Bike, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import Button from "../components/Button";
import { api } from "../services/api";
import { setToken } from "../lib/auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin/login", { email, password });
      setToken(data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-100 px-6 py-16">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-900/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-md rounded-2xl border border-stone-200 bg-white p-10 shadow-xl"
      >
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-900 text-white">
            <Bike className="h-6 w-6" />
          </span>
          <h1 className="text-3xl font-bold text-emerald-900">KU VIN Admin</h1>
          <p className="text-base text-stone-500">ระบบจัดการวินรถจักรยานยนต์รับจ้าง</p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm text-stone-800">อีเมล</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                required
                placeholder="admin@ku.th"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 w-full rounded-xl border-2 border-stone-300 bg-stone-50 pl-12 pr-4 text-base outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-stone-800">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 w-full rounded-xl border-2 border-stone-300 bg-stone-50 pl-12 pr-4 text-base outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 flex-none" /> {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="h-14 w-full text-lg">
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-stone-200 pt-6 text-center">
          <p className="text-base text-stone-500">มหาวิทยาลัยเกษตรศาสตร์</p>
        </div>
      </motion.div>
    </div>
  );
}
