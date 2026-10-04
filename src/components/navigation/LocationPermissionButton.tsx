import { MapPin, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import type { GeoPermissionState } from "@/types";

interface LocationPermissionButtonProps {
  status: GeoPermissionState;
  onRequest: () => void;
}

/**
 * [ 📍 Enable Location ] → [ ✓ Location Enabled ] per the Stage 2 permission
 * UX spec. Never auto-fires — only calls onRequest on an explicit click, so
 * the browser permission prompt is never triggered without the rider asking.
 */
export default function LocationPermissionButton({ status, onRequest }: LocationPermissionButtonProps) {
  if (status === "granted") {
    return (
      <button className="geo-btn geo-btn--granted" disabled>
        <CheckCircle2 size={17} /> Location enabled
      </button>
    );
  }

  if (status === "requesting") {
    return (
      <button className="geo-btn" disabled>
        <Loader2 size={17} className="spin" /> Getting your location…
      </button>
    );
  }

  if (status === "denied") {
    return (
      <div className="geo-btn-group">
        <button className="geo-btn geo-btn--error" onClick={onRequest}>
          <AlertTriangle size={17} /> Location blocked — tap to retry
        </button>
        <p className="geo-btn__hint">
          Location access is disabled. Enable location permission in your browser settings, or enter a starting
          location manually below.
        </p>
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="geo-btn-group">
        <button className="geo-btn geo-btn--error" onClick={onRequest}>
          <AlertTriangle size={17} /> Location unavailable — tap to retry
        </button>
        <p className="geo-btn__hint">Your location couldn't be determined. Enter a starting location manually below.</p>
      </div>
    );
  }

  return (
    <button className="geo-btn" onClick={onRequest}>
      <MapPin size={17} /> Use my current location
    </button>
  );
}
