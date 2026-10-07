import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import Logo from "@/components/common/Logo";
import MotorcycleIcon from "@/components/common/MotorcycleIcon";
import ConnectionStatusBanner from "@/components/ride/ConnectionStatusBanner";

interface AppTopBarProps {
  rideName: string | null;
  rideCode: string | null;
  connection: { isConnected: boolean; onRetry: () => void } | null;
  onOpenCrew: () => void;
  onOpenMore: () => void;
}

export default function AppTopBar({ rideName, rideCode, connection, onOpenCrew, onOpenMore }: AppTopBarProps) {
  return (
    <header className="app-topbar">
      <Link to="/" className="app-topbar__brand" aria-label="MotoNav home">
        <Logo compact />
      </Link>
      {rideName && (
        <button type="button" className="app-topbar__ride" onClick={onOpenCrew} aria-label="Open crew panel">
          <MotorcycleIcon size={16} />
          <span className="app-topbar__ride-name">{rideName}</span>
          {rideCode && <span className="app-topbar__ride-code mono">{rideCode}</span>}
        </button>
      )}
      <div className="app-topbar__right">
        {connection && <ConnectionStatusBanner isConnected={connection.isConnected} onRetry={connection.onRetry} />}
        <button type="button" className="rail-btn rail-btn--sm" onClick={onOpenMore} aria-label="Settings and more">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
