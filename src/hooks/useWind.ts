import { useEffect, useRef, useState } from "react";
import { getWind, type WindData } from "@/services/windService";
import { haversineMeters } from "@/utils/geo";
import type { Coordinates } from "@/types";

// Refetch only when the rider has moved meaningfully or enough time has
// passed — wind conditions don't change fast enough to justify polling on
// every GPS tick, and this keeps Open-Meteo usage light.
const REFETCH_MIN_DISTANCE_M = 2000;
const REFETCH_MIN_INTERVAL_MS = 5 * 60 * 1000;

export function useWind(coords: Coordinates | null) {
  const [wind, setWind] = useState<WindData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastFetchRef = useRef<{ coords: Coordinates; at: number } | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!coords) return;
    const last = lastFetchRef.current;
    const dueByDistance = !last || haversineMeters(last.coords, coords) >= REFETCH_MIN_DISTANCE_M;
    const dueByTime = !last || Date.now() - last.at >= REFETCH_MIN_INTERVAL_MS;
    if (!dueByDistance && !dueByTime) return;

    const thisRequestId = ++requestIdRef.current;
    lastFetchRef.current = { coords, at: Date.now() };
    setStatus("loading");
    setErrorMessage(null);

    getWind(coords)
      .then((data) => {
        if (requestIdRef.current !== thisRequestId) return;
        setWind(data);
        setStatus("ready");
      })
      .catch((err: Error) => {
        if (requestIdRef.current !== thisRequestId) return;
        setStatus("error");
        setErrorMessage(err.message);
      });
  }, [coords]);

  return { wind, status, errorMessage };
}
