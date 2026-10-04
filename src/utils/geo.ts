import type { Coordinates } from "@/types";

// ============================================================
// The one reusable distance/bearing calculation used everywhere in
// the app (nearby places, live "distance to destination", heading
// fallback) — pure functions, no API calls, no per-feature copies.
// haversineMeters() is real geographic distance from lat/lng, never
// screen/pixel/map-position math.
// ============================================================

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Compass bearing (0–360, 0 = north, clockwise) from `a` to `b`. Used as a
 *  fallback heading when the device doesn't report one via the Geolocation API. */
export function computeBearing(a: Coordinates, b: Coordinates): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** One detected direction change along a route, from real route geometry. */
export interface DetectedCurve {
  /** Index into the route geometry where the turn occurs. */
  index: number;
  /** How sharp the direction change is, in degrees (0–180). */
  angleDeg: number;
}

const SHARP_CURVE_THRESHOLD_DEG = 30;

/**
 * Counts genuine direction changes along a route's actual geometry (bearing
 * change between consecutive segments) — a real geometric signal from the
 * route the routing service returned, not a guess. Short, noisy segments
 * (<20m) are skipped so GPS/geometry jitter doesn't get counted as a curve.
 */
export function detectCurves(geometry: [number, number][]): DetectedCurve[] {
  const curves: DetectedCurve[] = [];
  const MIN_SEGMENT_M = 20;

  let prevBearing: number | null = null;
  let prevPoint: Coordinates = { lat: geometry[0]?.[0] ?? 0, lng: geometry[0]?.[1] ?? 0 };

  for (let i = 1; i < geometry.length; i++) {
    const point: Coordinates = { lat: geometry[i][0], lng: geometry[i][1] };
    if (haversineMeters(prevPoint, point) < MIN_SEGMENT_M) continue;

    const bearing = computeBearing(prevPoint, point);
    if (prevBearing !== null) {
      const angle = Math.abs(((bearing - prevBearing + 540) % 360) - 180);
      if (angle >= SHARP_CURVE_THRESHOLD_DEG) curves.push({ index: i, angleDeg: angle });
    }
    prevBearing = bearing;
    prevPoint = point;
  }
  return curves;
}
