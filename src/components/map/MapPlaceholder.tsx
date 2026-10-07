import { LocateFixed, Flag, Route } from "lucide-react";

interface MapPlaceholderProps {
  compact?: boolean;
  origin?: string;
  destination?: string;
}

// Stage 1: a designed placeholder standing in for a real interactive map.
// It never claims to be real navigation — it's a route *preview* that reflects
// whatever start/destination the rider has chosen for the active ride.
// Stage 2+ will replace the SVG below with a live map provider (e.g. MapLibre/Google Maps),
// keeping this component's outer footprint so the surrounding layout doesn't need to change.
export default function MapPlaceholder({ compact, origin, destination }: MapPlaceholderProps) {
  const hasDestination = Boolean(destination && destination.trim());
  const hasOrigin = Boolean(origin && origin.trim());

  return (
    <div className={`map-placeholder ${compact ? "map-placeholder--compact" : ""}`}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="map-placeholder__grid" aria-hidden="true">
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          </pattern>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF6A33" />
            <stop offset="100%" stopColor="#FFB627" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#grid)" />
        {hasDestination && (
          <>
            <path
              d="M 40 260 C 100 220, 90 160, 150 140 S 260 90, 240 50 S 330 30, 360 40"
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="1 14"
            />
            <path
              d="M 40 260 C 100 220, 90 160, 150 140 S 260 90, 240 50 S 330 30, 360 40"
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.35"
            />
          </>
        )}
      </svg>

      <div className="map-placeholder__pin map-placeholder__pin--origin" style={{ left: "10%", top: "86%" }}>
        <span className="map-placeholder__pulse" />
        <LocateFixed size={16} strokeWidth={2.4} />
      </div>
      {hasDestination && (
        <div className="map-placeholder__pin map-placeholder__pin--dest" style={{ left: "88%", top: "12%" }}>
          <Flag size={14} strokeWidth={2.4} />
        </div>
      )}

      {/* Route preview labels — this is placeholder UI, not a real map render */}
      <div className="map-placeholder__route-labels">
        <span className="map-placeholder__route-chip">
          <LocateFixed size={12} />
          Start: {hasOrigin ? origin : "Not set"}
        </span>
        {hasDestination ? (
          <span className="map-placeholder__route-chip map-placeholder__route-chip--dest">
            <Flag size={12} />
            Destination: {destination}
          </span>
        ) : (
          <span className="map-placeholder__route-chip map-placeholder__route-chip--muted">
            <Route size={12} />
            Select a destination to preview your route.
          </span>
        )}
      </div>

      <div className="map-placeholder__badge">
        {hasDestination && hasOrigin
          ? `Route preview — ${origin} → ${destination}`
          : "Map preview — live map connects in Stage 2"}
      </div>
    </div>
  );
}
