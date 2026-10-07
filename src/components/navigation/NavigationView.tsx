import { useEffect, useState } from "react";
import { ChevronLeft, LocateFixed, Clock, AlertTriangle } from "lucide-react";
import MapView, { type CoRiderMarker } from "@/components/map/MapView";
import { useGeolocation } from "@/hooks/useGeolocation";
import { formatDistanceMeters, formatDurationSeconds } from "@/utils/format";
import { haversineMeters } from "@/utils/geo";
import type { NavLocation, RouteResult } from "@/types";

interface NavigationViewProps {
  origin: NavLocation;
  destination: NavLocation;
  initialRoute: RouteResult;
  coRiders?: CoRiderMarker[];
  onExit: () => void;
}

function formatEta(secondsFromNow: number): string {
  const eta = new Date(Date.now() + secondsFromNow * 1000);
  return eta.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Navigation mode: real map, live GPS (watchPosition) rendered as a
 * heading-aware motorcycle marker, and remaining distance/ETA to the
 * destination. Kept deliberately lightweight — no turn-by-turn
 * instructions, no route-progress/off-route tracking, and no automatic
 * rerouting; the route calculated when navigation started is shown as-is.
 */
export default function NavigationView({ origin, destination, initialRoute, coRiders = [], onExit }: NavigationViewProps) {
  const { coords, heading, error: geoError, startWatching, stopWatching } = useGeolocation();
  const [recenterToken, setRecenterToken] = useState(0);

  useEffect(() => {
    startWatching();
    return () => stopWatching(); // always clear watchPosition when navigation ends/unmounts
  }, [startWatching, stopWatching]);

  // Cheap, local straight-line distance to the destination — updates as the
  // live marker moves, with no API calls or route-geometry math involved.
  const remainingDistanceMeters = coords ? haversineMeters(coords, destination.coords) : initialRoute.distanceMeters;

  return (
    <div className="nav-view">
      <header className="nav-view__header">
        <button className="icon-btn" aria-label="Exit navigation" onClick={onExit}>
          <ChevronLeft size={20} />
        </button>
        <span>Navigation to {destination.label}</span>
      </header>

      <div className="nav-view__map">
        <MapView
          origin={origin.coords}
          originIsGps
          heading={heading}
          destination={destination.coords}
          liveCoords={coords ?? origin.coords}
          routeGeometry={initialRoute.geometry}
          coRiders={coRiders}
          recenterToken={recenterToken}
          heightClassName="nav-view__map-fill"
        />
        <button className="nav-view__recenter" onClick={() => setRecenterToken((t) => t + 1)}>
          <LocateFixed size={16} /> Recenter
        </button>
      </div>

      <div className="nav-view__sheet">
        {geoError && !coords && (
          <p className="nav-view__warning">
            <AlertTriangle size={14} /> {geoError.message}
          </p>
        )}

        <div className="nav-view__stats">
          <span>{formatDistanceMeters(remainingDistanceMeters)}</span>
          <span>
            <Clock size={15} /> {formatDurationSeconds(initialRoute.durationSeconds)}
          </span>
          <span>ETA {formatEta(initialRoute.durationSeconds)}</span>
        </div>

        <button className="btn btn--danger btn--lg btn--full" onClick={onExit}>
          End navigation
        </button>
      </div>
    </div>
  );
}
