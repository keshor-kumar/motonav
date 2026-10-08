import { Routes, Route, Navigate } from "react-router-dom";
import { GroupRideProvider } from "@/context/GroupRideContext";
import { RideCommsProvider } from "@/context/RideCommsContext";
import KeyboardViewportSync from "@/components/common/KeyboardViewportSync";
import LandingPage from "@/pages/LandingPage";
import DashboardPage from "@/pages/DashboardPage";
import CreateRidePage from "@/pages/CreateRidePage";
import JoinRidePage from "@/pages/JoinRidePage";
import NewsPage from "@/pages/NewsPage";
import RoutesPage from "@/pages/RoutesPage";
import RouteDetailPage from "@/pages/RouteDetailPage";
import CommunityHomePage from "@/pages/CommunityHomePage";
import CommunityPage from "@/pages/CommunityPage";

// GroupRideProvider owns the real backend-backed ride session (REST + Socket.IO).
// RideCommsProvider adds Rider Comms (push-to-talk voice + quick messages) on that same socket.
export default function App() {
  return (
    <GroupRideProvider>
      <RideCommsProvider>
      <KeyboardViewportSync />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/create-ride" element={<CreateRidePage />} />
        <Route path="/join-ride" element={<JoinRidePage />} />
        {/* Public shareable ride link / QR target — e.g. https://motonav.app/join/MN7K42 */}
        <Route path="/join/:code" element={<JoinRidePage />} />
        {/* Moto News, Famous Rides, Moto Community — separate from the ride session (own token, own socket namespace) */}
        <Route path="/news" element={<NewsPage />} />
        <Route path="/routes" element={<RoutesPage />} />
        <Route path="/routes/:id" element={<RouteDetailPage />} />
        <Route path="/community" element={<CommunityHomePage />} />
        {/* Public shareable community link / QR target — e.g. https://motonav.app/community/MNCHENNAI82 */}
        <Route path="/community/:code" element={<CommunityPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </RideCommsProvider>
    </GroupRideProvider>
  );
}
