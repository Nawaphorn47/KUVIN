import { Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import LandmarkManager from "./pages/LandmarkManager";
import PeopleManager from "./pages/PeopleManager";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/dashboard" element={<AdminDashboard />} />
      <Route path="/landmarks" element={<LandmarkManager />} />
      <Route path="/people" element={<PeopleManager />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
