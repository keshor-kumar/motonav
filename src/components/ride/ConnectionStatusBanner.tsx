import { Wifi, WifiOff, RotateCw } from "lucide-react";

interface ConnectionStatusBannerProps {
  isConnected: boolean;
  onRetry: () => void;
}

/**
 * "Server: Connected / Disconnected" + a manual retry — only shown while a
 * real group-ride session is active (the socket only exists then). Never
 * blames the rider's Wi-Fi; this is specifically about reaching the
 * MotoNav backend, which is a different failure than any other network issue.
 */
export default function ConnectionStatusBanner({ isConnected, onRetry }: ConnectionStatusBannerProps) {
  if (isConnected) {
    return (
      <div className="connection-status connection-status--online">
        <Wifi size={14} />
        <span>Server: Connected</span>
      </div>
    );
  }

  return (
    <div className="connection-status connection-status--offline">
      <WifiOff size={14} />
      <span>Server: Disconnected — trying to reconnect…</span>
      <button className="connection-status__retry" onClick={onRetry}>
        <RotateCw size={13} /> Retry connection
      </button>
    </div>
  );
}
