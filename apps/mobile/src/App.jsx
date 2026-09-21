import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import Splash from "./pages/auth/Splash";
import Onboarding from "./pages/auth/Onboarding";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

import Home from "./pages/user/Home";
import SearchDestination from "./pages/user/SearchDestination";
import PickOnMap from "./pages/user/PickOnMap";
import ConfirmBooking from "./pages/user/ConfirmBooking";
import SearchingDriver from "./pages/user/SearchingDriver";
import DriverArriving from "./pages/user/DriverArriving";
import DuringRide from "./pages/user/DuringRide";
import RideCompleted from "./pages/user/RideCompleted";
import Rating from "./pages/user/Rating";
import History from "./pages/user/History";
import Notifications from "./pages/user/Notifications";
import Profile from "./pages/user/Profile";
import EditProfile from "./pages/user/EditProfile";
import Settings from "./pages/user/Settings";
import Sos from "./pages/user/Sos";
import Chatbot from "./pages/user/Chatbot";

import VerifyStep1 from "./pages/driver/VerifyStep1";
import VerifyStep2 from "./pages/driver/VerifyStep2";
import VerificationPending from "./pages/driver/VerificationPending";
import VerificationSuccess from "./pages/driver/VerificationSuccess";
import VerificationRejected from "./pages/driver/VerificationRejected";
import DriverHome from "./pages/driver/DriverHome";
import QueueStatus from "./pages/driver/QueueStatus";
import IncomingJob from "./pages/driver/IncomingJob";
import NavigatePickup from "./pages/driver/NavigatePickup";
import ArrivedPickup from "./pages/driver/ArrivedPickup";
import DriverDuringRide from "./pages/driver/DriverDuringRide";
import FinishRide from "./pages/driver/FinishRide";
import Earnings from "./pages/driver/Earnings";
import DriverHistory from "./pages/driver/DriverHistory";
import DriverProfile from "./pages/driver/DriverProfile";

export default function App() {
  const location = useLocation();

  return (
    <div className="device-frame">
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/splash" replace />} />

          <Route path="/splash" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/home" element={<Home />} />
          <Route path="/search-destination" element={<SearchDestination />} />
          <Route path="/pick-on-map" element={<PickOnMap />} />
          <Route path="/confirm-booking" element={<ConfirmBooking />} />
          <Route path="/searching-driver" element={<SearchingDriver />} />
          <Route path="/driver-arriving" element={<DriverArriving />} />
          <Route path="/during-ride" element={<DuringRide />} />
          <Route path="/ride-completed" element={<RideCompleted />} />
          <Route path="/rating" element={<Rating />} />
          <Route path="/history" element={<History />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/sos" element={<Sos />} />
          <Route path="/chatbot" element={<Chatbot />} />

          <Route path="/driver/verify/step-1" element={<VerifyStep1 />} />
          <Route path="/driver/verify/step-2" element={<VerifyStep2 />} />
          <Route path="/driver/verify/pending" element={<VerificationPending />} />
          <Route path="/driver/verify/success" element={<VerificationSuccess />} />
          <Route path="/driver/verify/rejected" element={<VerificationRejected />} />
          <Route path="/driver/home" element={<DriverHome />} />
          <Route path="/driver/queue" element={<QueueStatus />} />
          <Route path="/driver/incoming-job" element={<IncomingJob />} />
          <Route path="/driver/navigate-pickup" element={<NavigatePickup />} />
          <Route path="/driver/arrived-pickup" element={<ArrivedPickup />} />
          <Route path="/driver/during-ride" element={<DriverDuringRide />} />
          <Route path="/driver/finish-ride" element={<FinishRide />} />
          <Route path="/driver/earnings" element={<Earnings />} />
          <Route path="/driver/history" element={<DriverHistory />} />
          <Route path="/driver/profile" element={<DriverProfile />} />

          <Route path="*" element={<Navigate to="/splash" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}
