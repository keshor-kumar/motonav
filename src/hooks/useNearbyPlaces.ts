import { useCallback, useEffect, useRef, useState } from "react";
import { searchNearbyPlaces } from "@/services/placesService";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { Coordinates, NearbyPlace, PlaceCategory } from "@/types";

export type NearbySearchStatus = "idle" | "locating" | "searching" | "done" | "error";

const INITIAL_RADIUS_M = 5000;
const EXPANDED_RADIUS_M = 15000; // tried once if the initial radius comes back empty

/**
 * Drives the real Nearby Places flow: gets the rider's actual GPS position
 * (via useGeolocation — never simulated), then queries Geoapify Places for
 * the selected category around that position. Never searches on its own —
 * only in response to a category click — so it doesn't spam the API.
 */
export function useNearbyPlaces() {
  const geo = useGeolocation();
  const [activeCategory, setActiveCategory] = useState<PlaceCategory | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<NearbySearchStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guards against a slow, stale request overwriting a newer one.
  const requestIdRef = useRef(0);

  const runSearch = useCallback(async (category: PlaceCategory, coords: Coordinates) => {
    const thisRequestId = ++requestIdRef.current;
    setStatus("searching");
    setErrorMessage(null);
    try {
      let results = await searchNearbyPlaces(category, coords, INITIAL_RADIUS_M);
      // Few/no results within the initial radius — try once more, wider,
      // rather than leaving the rider with an empty list nearby areas often produce.
      if (requestIdRef.current === thisRequestId && results.length === 0) {
        results = await searchNearbyPlaces(category, coords, EXPANDED_RADIUS_M);
      }
      if (requestIdRef.current !== thisRequestId) return; // superseded
      setPlaces(results);
      setStatus("done");
    } catch (err) {
      if (requestIdRef.current !== thisRequestId) return;
      setPlaces([]);
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong finding nearby places.");
    }
  }, []);

  const selectCategory = useCallback(
    (category: PlaceCategory) => {
      setActiveCategory(category);
      setSelectedId(null);
      if (geo.coords) {
        void runSearch(category, geo.coords);
      } else {
        setStatus("locating");
        geo.requestLocation(); // the effect below continues once permission resolves
      }
    },
    [geo, runSearch]
  );

  // Once GPS becomes available after a category was already requested
  // (i.e. we were waiting on "locating"), run the search automatically.
  useEffect(() => {
    if (activeCategory && status === "locating") {
      if (geo.status === "granted" && geo.coords) {
        void runSearch(activeCategory, geo.coords);
      } else if (geo.status === "denied" || geo.status === "unavailable") {
        setStatus("error");
        setErrorMessage(geo.error?.message ?? "Location is required to find nearby places.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.coords]);

  return {
    geo,
    activeCategory,
    places,
    selectedId,
    setSelectedId,
    status,
    errorMessage,
    selectCategory,
  };
}
