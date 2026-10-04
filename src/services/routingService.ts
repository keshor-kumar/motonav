import { GEOAPIFY_BASE_URL, GEOAPIFY_API_KEY, hasGeoapifyKey } from "@/config/env";
import type { Coordinates, RouteResult } from "@/types";

// ============================================================
// Routing via the Geoapify Routing API. All distance/duration
// numbers come straight from this response — nothing here
// estimates, guesses, or invents a value.
//
// Kept deliberately lightweight: just distance + duration + the
// route line. No turn-by-turn instruction parsing, no per-step
// maneuver data — that request payload and the UI/logic built on
// top of it were removed to keep the app fast and simple for now.
//
// Geoapify's routing "mode" doesn't currently expose a dedicated
// motorcycle profile — the closest road-vehicle profile is "drive".
// This is isolated to the one constant below so it's a one-line
// change if/when a motorcycle-specific mode becomes available.
// ============================================================

const ROUTE_MODE = "drive"; // TODO: swap to a motorcycle profile if/when Geoapify adds one

interface GeoapifyRouteFeature {
  properties: {
    distance: number; // meters
    time: number; // seconds
  };
  geometry: {
    type: "LineString" | "MultiLineString";
    coordinates: [number, number][] | [number, number][][];
  };
}

interface GeoapifyRoutingResponse {
  features: GeoapifyRouteFeature[];
}

function flattenGeometry(geometry: GeoapifyRouteFeature["geometry"]): [number, number][] {
  const raw =
    geometry.type === "MultiLineString"
      ? (geometry.coordinates as [number, number][][]).flat()
      : (geometry.coordinates as [number, number][]);
  // Geoapify returns [lng, lat] (GeoJSON order) — flip to [lat, lng] for the rest of the app.
  return raw.map(([lng, lat]) => [lat, lng]);
}

/**
 * Fetches a real route between two coordinates from Geoapify Routing.
 * Throws a user-safe Error on failure — callers should catch and show a
 * friendly message rather than the raw error.
 */
export async function getRoute(start: Coordinates, end: Coordinates): Promise<RouteResult> {
  if (!hasGeoapifyKey) {
    throw new Error("Routing isn't configured yet — a Geoapify API key is required (VITE_GEOAPIFY_API_KEY).");
  }

  const waypoints = `${start.lat},${start.lng}|${end.lat},${end.lng}`;
  const url = new URL("/v1/routing", GEOAPIFY_BASE_URL);
  url.searchParams.set("waypoints", waypoints);
  url.searchParams.set("mode", ROUTE_MODE);
  url.searchParams.set("apiKey", GEOAPIFY_API_KEY);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    throw new Error("Network error while calculating the route. Check your connection and try again.");
  }

  if (!response.ok) {
    throw new Error("The routing service is temporarily unavailable.");
  }

  const data = (await response.json()) as GeoapifyRoutingResponse;

  if (!data.features || data.features.length === 0) {
    throw new Error("Couldn't find a route between those two locations.");
  }

  const best = data.features[0];

  return {
    distanceMeters: best.properties.distance,
    durationSeconds: best.properties.time,
    geometry: flattenGeometry(best.geometry),
  };
}
