import type { LngLatBoundsLike, LngLatLike } from "maplibre-gl";
import type { Coordinates } from "@/types";

// ============================================================
// Small MapLibre-specific helpers, kept out of MapView.tsx so the
// component stays focused on rendering/lifecycle rather than
// coordinate-format bookkeeping.
// ============================================================

/** MotoNav's {lat,lng} → MapLibre's [lng, lat] tuple. */
export function toLngLat(coords: Coordinates): LngLatLike {
  return [coords.lng, coords.lat];
}

/** Bounding box covering every point in a [lat,lng] path, for map.fitBounds(). */
export function boundsFromGeometry(geometry: [number, number][]): LngLatBoundsLike | null {
  if (geometry.length === 0) return null;
  let minLat = geometry[0][0];
  let maxLat = geometry[0][0];
  let minLng = geometry[0][1];
  let maxLng = geometry[0][1];
  for (const [lat, lng] of geometry) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/** Bounding box covering a set of points (e.g. nearby-place markers), for fitBounds(). */
export function boundsFromPoints(points: Coordinates[]): LngLatBoundsLike | null {
  if (points.length === 0) return null;
  return boundsFromGeometry(points.map((p) => [p.lat, p.lng]));
}
