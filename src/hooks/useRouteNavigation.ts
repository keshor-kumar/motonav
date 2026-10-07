import { useCallback, useEffect, useRef, useState } from "react";
import { searchPlaces } from "@/services/geocodingService";
import { getRoute } from "@/services/routingService";
import type { NavLocation, RouteResult, SearchResult } from "@/types";

export type RouteStatus =
  | "idle"
  | "geocoding-origin"
  | "geocoding-destination"
  | "routing"
  | "ready"
  | "error";

/**
 * Owns origin/destination NavLocations and the real route between them
 * (Geoapify Routing API). Automatically (re)fetches the route whenever both
 * points are set or either one changes — but only then, never on a timer or
 * keystroke, to keep external API usage minimal (performance requirement).
 */
export function useRouteNavigation() {
  const [origin, setOrigin] = useState<NavLocation | null>(null);
  const [destination, setDestination] = useState<NavLocation | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [status, setStatus] = useState<RouteStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guards against a slow, stale request overwriting a newer one.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!origin || !destination) {
      setRoute(null);
      return;
    }
    const thisRequestId = ++requestIdRef.current;
    setStatus("routing");
    setErrorMessage(null);

    getRoute(origin.coords, destination.coords)
      .then((result) => {
        if (requestIdRef.current !== thisRequestId) return; // superseded
        setRoute(result);
        setStatus("ready");
      })
      .catch((err: Error) => {
        if (requestIdRef.current !== thisRequestId) return;
        setRoute(null);
        setStatus("error");
        setErrorMessage(err.message || "Couldn't calculate a route. Please try again.");
      });
  }, [origin, destination]);

  /** Resolves a free-text place name to a NavLocation via geocoding (first result). */
  const geocodeToLocation = useCallback(
    async (query: string, source: NavLocation["source"] = "search"): Promise<NavLocation | null> => {
      const results = await searchPlaces(query);
      if (results.length === 0) return null;
      const first = results[0];
      return { label: first.label, coords: first.coords, source };
    },
    []
  );

  const setOriginFromSearchResult = useCallback((result: SearchResult) => {
    setOrigin({ label: result.label, coords: result.coords, source: "search" });
  }, []);

  const setDestinationFromSearchResult = useCallback((result: SearchResult) => {
    setDestination({ label: result.label, coords: result.coords, source: "search" });
  }, []);

  /** Best-effort auto-resolve for the Stage 1 ride name text (e.g. "Chennai"). */
  const autoResolveOrigin = useCallback(
    async (label: string) => {
      if (!label.trim()) return;
      setStatus("geocoding-origin");
      try {
        const loc = await geocodeToLocation(label, "ride");
        if (loc) setOrigin(loc);
        else setStatus("idle");
      } catch (err) {
        // Best-effort auto-resolve: fail quietly back to idle rather than
        // surfacing an error banner for something the rider didn't directly
        // trigger. They can still search manually below.
        setStatus("idle");
        // eslint-disable-next-line no-console
        console.warn("Auto-resolving starting location failed:", err);
      }
    },
    [geocodeToLocation]
  );

  const autoResolveDestination = useCallback(
    async (label: string) => {
      if (!label.trim()) return;
      setStatus("geocoding-destination");
      try {
        const loc = await geocodeToLocation(label, "ride");
        if (loc) setDestination(loc);
        else setStatus("idle");
      } catch (err) {
        setStatus("idle");
        // eslint-disable-next-line no-console
        console.warn("Auto-resolving destination failed:", err);
      }
    },
    [geocodeToLocation]
  );

  return {
    origin,
    destination,
    route,
    status,
    errorMessage,
    setOrigin,
    setDestination,
    setOriginFromSearchResult,
    setDestinationFromSearchResult,
    autoResolveOrigin,
    autoResolveDestination,
  };
}
