import { Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import LandmarkManager from "./pages/LandmarkManager";
import PeopleManager from "./pages/PeopleManager";
import AreaSettings from "./pages/AreaSettings";
import AreaManager from "./pages/AreaManager";
import AdminAccounts from "./pages/AdminAccounts";
import AdminLayout from "./components/AdminLayout";
import { useAdminSession } from "./lib/adminSession";

function SuperOnly({ children }) {
  const { isSuper } = useAdminSession();
  return isSuper ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AdminLogin />} />
      <Route element={<AdminLayout />}>
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/landmarks" element={<LandmarkManager />} />
        <Route path="/people" element={<PeopleManager />} />
        <Route path="/area-settings" element={<AreaSettings />} />
        <Route
          path="/areas"
          element={
            <SuperOnly>
              <AreaManager />
            </SuperOnly>
          }
        />
        <Route
          path="/admins"
          element={
            <SuperOnly>
              <AdminAccounts />
            </SuperOnly>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
