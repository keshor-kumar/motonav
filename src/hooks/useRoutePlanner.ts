import { useCallback, useEffect, useRef, useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useRouteNavigation } from "@/hooks/useRouteNavigation";
import type { NavLocation, SearchResult } from "@/types";

interface Options {
  /** A destination handed in from elsewhere (group ride, nearby place, co-rider). */
  pendingDestination: NavLocation | null;
  onPendingDestinationHandled: () => void;
}

/**
 * Route-planning state for the dashboard: GPS origin, destination, the real
 * route, and navigation start/stop. This is the logic that used to live inside
 * RoutePlanner, moved into a hook so the map can be full-screen and the
 * controls can live in sheets. One routing function (getRoute, via
 * useRouteNavigation) serves every destination type.
 */
export function useRoutePlanner({ pendingDestination, onPendingDestinationHandled }: Options) {
  const geo = useGeolocation();
  const nav = useRouteNavigation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [following, setFollowing] = useState(true);
  const [recenterToken, setRecenterToken] = useState(0);
  const isNavigatingRef = useRef(false);

  // The destination the rider had before being diverted to a nearby place / co-rider,
  // so they can always get back to it.
  const [original, setOriginal] = useState<NavLocation | null>(null);
  const isDiverted =
    original !== null &&
    nav.destination !== null &&
    (nav.destination.coords.lat !== original.coords.lat || nav.destination.coords.lng !== original.coords.lng);

  const returnToOriginal = useCallback(() => {
    if (original) nav.setDestination(original);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original]);

  const selectDestination = useCallback(
    (result: SearchResult) => {
      setOriginal(null);
      nav.setDestinationFromSearchResult(result);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // A destination arrives from outside: use it, and start from the rider's real GPS.
  useEffect(() => {
    if (!pendingDestination) return;
    const current = nav.destination;
    if (current && !original && (current.coords.lat !== pendingDestination.coords.lat || current.coords.lng !== pendingDestination.coords.lng)) {
      setOriginal(current);
    }
    nav.setDestination(pendingDestination);
    if (geo.coords) nav.setOrigin({ label: "Current location", coords: geo.coords, source: "gps" });
    else geo.requestLocation(); // the effect below sets the origin once granted
    onPendingDestinationHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDestination]);

  // After an explicit "use my location" fix, that fix becomes the route start.
  // Skipped while navigating: live GPS ticks must never trigger a new route.
  useEffect(() => {
    if (isNavigatingRef.current) return;
    if (geo.status === "granted" && geo.coords) {
      nav.setOrigin({ label: "Current location", coords: geo.coords, source: "gps" });
      setRecenterToken((t) => t + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.coords]);

  const startNavigation = useCallback(() => {
    isNavigatingRef.current = true;
    setIsNavigating(true);
    setFollowing(true);
    geo.startWatching(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endNavigation = useCallback(() => {
    isNavigatingRef.current = false;
    setIsNavigating(false);
    geo.stopWatching();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => geo.stopWatching(), [geo.stopWatching]);

  /** Manual reroute from where the rider is now (there is no automatic rerouting). */
  const recalculateFromHere = useCallback(() => {
    if (geo.coords) nav.setOrigin({ label: "Current location", coords: geo.coords, source: "gps" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.coords]);

  const recenter = useCallback(() => {
    setFollowing(true);
    setRecenterToken((t) => t + 1);
  }, []);

  const routeReady = nav.status === "ready" && nav.route !== null && nav.origin !== null && nav.destination !== null;

  return {
    geo,
    nav,
    isNavigating,
    following,
    setFollowing,
    recenterToken,
    recenter,
    startNavigation,
    endNavigation,
    recalculateFromHere,
    original,
    isDiverted,
    returnToOriginal,
    selectDestination,
    routeReady,
  };
}
