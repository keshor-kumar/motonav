import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, AlertCircle, Undo2 } from "lucide-react";
import MapView, { type CoRiderMarker } from "@/components/map/MapView";
import WindIndicator from "@/components/map/WindIndicator";
import MapIconToolbar from "@/components/overlay/MapIconToolbar";
import LocationPermissionButton from "@/components/navigation/LocationPermissionButton";
import LocationSearchField from "@/components/navigation/LocationSearchField";
import RouteSummaryCard from "@/components/navigation/RouteSummaryCard";
import NavigationView from "@/components/navigation/NavigationView";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useRouteNavigation } from "@/hooks/useRouteNavigation";
import type { NavLocation } from "@/types";

interface RoutePlannerProps {
  /** The Stage 1 Create-Ride text values — auto-geocoded on first load so the
   *  real map/route appear without the rider having to re-search anything. */
  rideStartLabel: string;
  rideDestinationLabel: string;
  /** Set when the rider taps "Navigate here" from the Nearby tab — takes over
   *  as the destination immediately (coordinates are already known, so no
   *  extra geocoding round-trip is needed). */
  pendingDestination?: NavLocation | null;
  onPendingDestinationHandled?: () => void;
  /** Real co-riders from an active group ride, rendered as markers on the same map. */
  coRiders?: CoRiderMarker[];
  /** Fed into the map's Alerts icon panel — whatever the dashboard currently has active. */
  activeAlerts?: string[];
  onOpenWarmup?: () => void;
  renderRidersPanel?: () => ReactNode;
}

/**
 * The real navigation surface: permission-gated GPS, geocoded search for
 * both ends of the trip, a real route (Geoapify Routing) on a real MapTiler
 * map, and a hand-off into full navigation mode. Owns none of the external
 * calls directly — everything routes through services/ and hooks/.
 */
export default function RoutePlanner({
  rideStartLabel,
  rideDestinationLabel,
  pendingDestination,
  onPendingDestinationHandled,
  coRiders = [],
  activeAlerts = [],
  onOpenWarmup,
  renderRidersPanel,
}: RoutePlannerProps) {
  const geo = useGeolocation();
  const nav = useRouteNavigation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [recenterToken, setRecenterToken] = useState(0);

  // The ride's real destination, captured the first time it resolves — kept
  // separately so "Navigate here" to a nearby place (which overwrites the
  // active destination) never loses it, and the rider can always get back.
  const originalDestinationRef = useRef<NavLocation | null>(null);
  useEffect(() => {
    if (nav.destination && !originalDestinationRef.current) {
      originalDestinationRef.current = nav.destination;
    }
  }, [nav.destination]);

  const isDivertedFromOriginal =
    Boolean(originalDestinationRef.current) &&
    Boolean(nav.destination) &&
    (nav.destination!.coords.lat !== originalDestinationRef.current!.coords.lat ||
      nav.destination!.coords.lng !== originalDestinationRef.current!.coords.lng);

  function handleReturnToOriginalDestination() {
    if (originalDestinationRef.current) nav.setDestination(originalDestinationRef.current);
  }

  // Auto-resolve the Stage 1 ride text into real coordinates once per value
  // change, so Create Ride → Dashboard shows a real route without extra taps.
  const autoResolved = useRef<{ start?: string; dest?: string }>({});
  useEffect(() => {
    if (rideStartLabel.trim() && autoResolved.current.start !== rideStartLabel) {
      autoResolved.current.start = rideStartLabel;
      nav.autoResolveOrigin(rideStartLabel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideStartLabel]);

  useEffect(() => {
    if (rideDestinationLabel.trim() && autoResolved.current.dest !== rideDestinationLabel) {
      autoResolved.current.dest = rideDestinationLabel;
      nav.autoResolveDestination(rideDestinationLabel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideDestinationLabel]);

  // "Navigate here" from the Nearby tab — coordinates already known. Per
  // spec, this always starts from the rider's real current GPS position.
  useEffect(() => {
    if (pendingDestination) {
      nav.setDestination(pendingDestination);
      if (geo.coords) {
        nav.setOrigin({ label: "Current location", coords: geo.coords, source: "gps" });
      } else {
        geo.requestLocation(); // the effect below sets origin once granted
      }
      onPendingDestinationHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDestination]);

  // Only ever runs after the rider explicitly taps "Use my current location"
  // / "My Location" (geo.requestLocation is never called automatically).
  useEffect(() => {
    if (geo.status === "granted" && geo.coords) {
      nav.setOrigin({ label: "Current location", coords: geo.coords, source: "gps" });
      setRecenterToken((t) => t + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.coords]);

  if (isNavigating && nav.origin && nav.destination && nav.route) {
    return (
      <NavigationView
        origin={nav.origin}
        destination={nav.destination}
        initialRoute={nav.route}
        coRiders={coRiders}
        onExit={() => setIsNavigating(false)}
      />
    );
  }

  return (
    <div className="route-planner">
      <div className="route-planner__map-wrap">
        <MapView
          origin={nav.origin?.coords}
          originIsGps={nav.origin?.source === "gps"}
          heading={geo.heading}
          destination={nav.destination?.coords}
          routeGeometry={nav.route?.geometry ?? []}
          coRiders={coRiders}
          recenterToken={recenterToken}
          onRequestMyLocation={geo.requestLocation}
          heightClassName="route-planner__map"
        />
        <WindIndicator coords={nav.origin?.coords ?? geo.coords} heading={geo.heading} />
      </div>

      <MapIconToolbar
        coords={nav.origin?.coords ?? geo.coords}
        routeGeometry={nav.route?.geometry ?? []}
        activeAlerts={activeAlerts}
        onOpenWarmup={onOpenWarmup}
        renderRidersPanel={renderRidersPanel}
      />

      <div className="route-planner__controls">
        <LocationPermissionButton status={geo.status} onRequest={geo.requestLocation} />

        <LocationSearchField
          label="Starting location"
          placeholder="Or search a starting point"
          initialValue={rideStartLabel}
          onSelect={nav.setOriginFromSearchResult}
        />
        <LocationSearchField
          label="Destination"
          placeholder="Search destination (e.g. Ooty, Chennai Airport)"
          initialValue={nav.destination?.label ?? rideDestinationLabel}
          onSelect={nav.setDestinationFromSearchResult}
        />
        {isDivertedFromOriginal && (
          <button type="button" className="btn btn--ghost btn--md" onClick={handleReturnToOriginalDestination}>
            <Undo2 size={15} /> Back to {originalDestinationRef.current!.label}
          </button>
        )}

        {nav.status === "geocoding-origin" && (
          <p className="loading-msg">
            <Loader2 size={14} className="spin" /> Locating {rideStartLabel}…
          </p>
        )}
        {nav.status === "geocoding-destination" && (
          <p className="loading-msg">
            <Loader2 size={14} className="spin" /> Locating {rideDestinationLabel}…
          </p>
        )}
        {nav.status === "routing" && (
          <p className="loading-msg">
            <Loader2 size={14} className="spin" /> Calculating route…
          </p>
        )}
        {nav.status === "error" && (
          <p className="error-msg">
            <AlertCircle size={14} /> {nav.errorMessage}
          </p>
        )}

        {nav.status === "ready" && nav.route && nav.origin && nav.destination && (
          <RouteSummaryCard
            origin={nav.origin}
            destination={nav.destination}
            route={nav.route}
            onStartNavigation={() => setIsNavigating(true)}
          />
        )}
      </div>
    </div>
  );
}
