import { Routes, Route, Navigate } from "react-router-dom";
import { RideProvider } from "@/context/RideContext";
import { GroupRideProvider } from "@/context/GroupRideContext";
import LandingPage from "@/pages/LandingPage";
import DashboardPage from "@/pages/DashboardPage";
import CreateRidePage from "@/pages/CreateRidePage";
import JoinRidePage from "@/pages/JoinRidePage";

// RideProvider: Stage 1's mock "demo ride" fallback (used when the dashboard
// is opened with no real ride active — e.g. "Explore map" from the landing
// page). GroupRideProvider: the real Stage 3 backend-backed group ride
// session (REST + Socket.IO) — see src/context/GroupRideContext.tsx.
export default function App() {
  return (
    <RideProvider>
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
    </RideProvider>
  );
}
