import { useCallback, useRef, useState } from "react";
import { getCurrentLocation, watchLocation, clearLocationWatch } from "@/services/locationService";
import { computeBearing, haversineMeters } from "@/utils/geo";
import type { Coordinates, GeoErrorInfo, GeoPermissionState } from "@/types";

// ============================================================
// Drives the "Enable Location" button + live-tracking UX. Keeps
// permission state explicit so the UI never re-prompts the browser
// permission dialog unnecessarily, and can show clear, specific
// messages for denial/timeout/unavailable.
//
// Also tracks `heading` for the motorcycle marker: uses the device's
// own Geolocation heading when it reports one, and falls back to a
// bearing calculated from the last two GPS fixes when it doesn't
// (many phones only report heading while actively moving, or not at
// all without a compass) — never a fixed/fake value.
// ============================================================

const MIN_MOVEMENT_FOR_BEARING_M = 3; // ignore GPS jitter when deriving a fallback bearing

export function useGeolocation() {
  const [status, setStatus] = useState<GeoPermissionState>("idle");
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [error, setError] = useState<GeoErrorInfo | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<Coordinates | null>(null);

  const applyPosition = useCallback((position: { lat: number; lng: number; heading: number | null; speed?: number | null }) => {
    const point: Coordinates = { lat: position.lat, lng: position.lng };
    setSpeed(position.speed ?? null);

    if (position.heading !== null) {
      setHeading(position.heading);
    } else if (lastCoordsRef.current) {
      const moved = haversineMeters(lastCoordsRef.current, point);
      if (moved >= MIN_MOVEMENT_FOR_BEARING_M) {
        setHeading(computeBearing(lastCoordsRef.current, point));
      }
      // else: keep the last known heading rather than jittering while stationary
    }

    lastCoordsRef.current = point;
    setCoords(point);
  }, []);

  const requestLocation = useCallback(async () => {
    if (status === "requesting") return; // avoid duplicate prompts if already in flight
    setStatus("requesting");
    setError(null);
    try {
      const position = await getCurrentLocation();
      applyPosition(position);
      setStatus("granted");
    } catch (err) {
      const info = err as GeoErrorInfo;
      setError(info);
      setStatus(info.kind === "permission-denied" ? "denied" : "unavailable");
    }
  }, [status, applyPosition]);

  const startWatching = useCallback(() => {
    if (watchIdRef.current !== null) return; // already watching
    const id = watchLocation(
      (position) => {
        applyPosition(position);
        setStatus("granted");
        setError(null);
      },
      (info) => setError(info)
    );
    watchIdRef.current = id;
  }, [applyPosition]);

  const stopWatching = useCallback(() => {
    clearLocationWatch(watchIdRef.current);
    watchIdRef.current = null;
  }, []);

  return { status, coords, heading, speed, error, requestLocation, startWatching, stopWatching };
}
