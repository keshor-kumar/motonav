import { useMemo } from "react";
import { buildCumulativeDistances, nearestGeometryIndex } from "@/utils/geo";
import type { Coordinates, RouteResult, RouteStep } from "@/types";

// ============================================================
// Turns the active route + the rider's live GPS into what the
// navigation screen shows: next maneuver, distance to it, remaining
// distance/time, progress and ETA. Distances follow the route's own
// geometry (not straight lines). When the routing response has no
// steps, `hasSteps` is false and the UI shows "Navigation ready".
// No automatic rerouting happens here.
// ============================================================

export interface GuidanceState {
  hasSteps: boolean;
  /** Upcoming maneuver (null without step data, or when only the destination remains). */
  nextStep: RouteStep | null;
  /** The maneuver after that, for a "then…" preview. */
  thenStep: RouteStep | null;
  distanceToManeuverMeters: number | null;
  currentRoad: string | null;
  remainingMeters: number;
  remainingSeconds: number;
  totalMeters: number;
  /** 0–1 */
  progress: number;
  etaDate: Date;
  speedKph: number | null;
  /** How far the rider is from the route line; large values mean they left the route. */
  offRouteMeters: number | null;
}

export function useGuidance(route: RouteResult | null, coords: Coordinates | null, speedMps: number | null): GuidanceState | null {
  const cumulative = useMemo(() => (route ? buildCumulativeDistances(route.geometry) : []), [route]);

  return useMemo(() => {
    if (!route || route.geometry.length < 2) return null;

    const geometryTotal = cumulative[cumulative.length - 1] || route.distanceMeters;
    let index = 0;
    let offRoute: number | null = null;
    if (coords) {
      const nearest = nearestGeometryIndex(coords, route.geometry);
      index = nearest.index;
      offRoute = nearest.distanceMeters;
    }

    const fractionDone = geometryTotal > 0 ? Math.min(1, Math.max(0, cumulative[index] / geometryTotal)) : 0;
    const remainingMeters = route.distanceMeters * (1 - fractionDone);
    const remainingSeconds = route.durationSeconds * (1 - fractionDone);

    const steps = route.steps ?? [];
    let currentIndex = -1;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].geometryStartIndex <= index) currentIndex = i;
    }
    const nextStep = steps[currentIndex + 1] ?? null;
    const thenStep = steps[currentIndex + 2] ?? null;

    let distanceToManeuver: number | null = null;
    if (steps.length > 0) {
      if (nextStep) {
        const at = Math.min(nextStep.geometryStartIndex, cumulative.length - 1);
        distanceToManeuver = Math.max(0, cumulative[at] - cumulative[index]);
      } else {
        distanceToManeuver = remainingMeters;
      }
    }

    return {
      hasSteps: steps.length > 0,
      nextStep,
      thenStep,
      distanceToManeuverMeters: distanceToManeuver,
      currentRoad: (currentIndex >= 0 ? steps[currentIndex].roadName : steps[0]?.roadName) ?? null,
      remainingMeters,
      remainingSeconds,
      totalMeters: route.distanceMeters,
      progress: fractionDone,
      etaDate: new Date(Date.now() + remainingSeconds * 1000),
      speedKph: speedMps !== null ? Math.round(speedMps * 3.6) : null,
      offRouteMeters: offRoute,
    };
  }, [route, cumulative, coords, speedMps]);
}
