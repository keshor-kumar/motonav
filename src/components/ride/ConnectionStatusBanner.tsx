import { WifiOff } from "lucide-react";

interface ConnectionStatusBannerProps {
  isConnected: boolean;
  onRetry: () => void;
}

/** Compact "is the MotoNav server reachable?" pill — about the backend, never the rider's Wi-Fi. */
export default function ConnectionStatusBanner({ isConnected, onRetry }: ConnectionStatusBannerProps) {
  if (isConnected) {
    return (
      <span className="conn-pill conn-pill--on" title="Server: Connected">
        <span className="conn-pill__dot" /> Live
      </span>
    );
  }
  return (
    <button type="button" className="conn-pill conn-pill--off" onClick={onRetry} title="Server: Disconnected — tap to retry">
      <WifiOff size={13} /> Server offline · Retry
    </button>
  );
}
