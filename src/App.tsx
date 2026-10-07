import { Routes, Route, Navigate } from "react-router-dom";
import { GroupRideProvider } from "@/context/GroupRideContext";
import LandingPage from "@/pages/LandingPage";
import DashboardPage from "@/pages/DashboardPage";
import CreateRidePage from "@/pages/CreateRidePage";
import JoinRidePage from "@/pages/JoinRidePage";

// GroupRideProvider owns the real backend-backed ride session (REST + Socket.IO).
export default function App() {
  return (
    <GroupRideProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/create-ride" element={<CreateRidePage />} />
        <Route path="/join-ride" element={<JoinRidePage />} />
        {/* Public shareable ride link / QR target — e.g. https://motonav.app/join/MN7K42 */}
        <Route path="/join/:code" element={<JoinRidePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GroupRideProvider>
  );
}
