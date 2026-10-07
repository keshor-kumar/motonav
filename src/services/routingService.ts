import { GEOAPIFY_BASE_URL, GEOAPIFY_API_KEY, hasGeoapifyKey } from "@/config/env";
import type { Coordinates, ManeuverType, RouteResult, RouteStep } from "@/types";

// ============================================================
// The ONE routing function used for every route in the app (main
// destination, nearby places, co-riders). Distance/duration/steps all
// come straight from the Geoapify response — nothing is invented.
//
// Turn-by-turn steps are requested with details=instruction_details and
// parsed defensively: if the API rejects that parameter we retry a plain
// route, and if a response has no usable steps `steps` is simply
// undefined, so the guidance UI shows "Navigation ready" instead of
// inventing instructions.
//
// Geoapify has no dedicated motorcycle profile; "drive" is the closest.
// ============================================================

const ROUTE_MODE = "drive"; // swap here if/when a motorcycle profile exists

interface GeoapifyStep {
  from_index: number;
  to_index: number;
  distance: number;
  time: number;
  name?: string;
  instruction?: { text?: string; type?: string };
}

interface GeoapifyFeature {
  properties: {
    distance: number; // meters
    time: number; // seconds
    legs?: { steps?: GeoapifyStep[] }[];
  };
  geometry: {
    type: "LineString" | "MultiLineString";
    coordinates: [number, number][] | [number, number][][];
  };
}

interface GeoapifyRoutingResponse {
  features: GeoapifyFeature[];
}

function flattenGeometry(geometry: GeoapifyFeature["geometry"]): [number, number][] {
  const raw =
    geometry.type === "MultiLineString"
      ? (geometry.coordinates as [number, number][][]).flat()
      : (geometry.coordinates as [number, number][]);
  // Geoapify returns [lng, lat] (GeoJSON order) — flip to [lat, lng] for the rest of the app.
  return raw.map(([lng, lat]) => [lat, lng]);
}

function classifyManeuver(text: string, type?: string): ManeuverType {
  const t = `${type ?? ""} ${text}`.toLowerCase();
  if (/arrive|destination/.test(t)) return "arrive";
  if (/u-?turn/.test(t)) return "uturn";
  if (/roundabout|rotary|traffic circle/.test(t)) return "roundabout";
  if (/sharp.{0,3}left/.test(t)) return "sharp-left";
  if (/sharp.{0,3}right/.test(t)) return "sharp-right";
  if (/slight.{0,3}left|bear.{0,3}left|keep.{0,3}left/.test(t)) return "slight-left";
  if (/slight.{0,3}right|bear.{0,3}right|keep.{0,3}right/.test(t)) return "slight-right";
  if (/\bleft\b/.test(t)) return "left";
  if (/\bright\b/.test(t)) return "right";
  return "straight";
}

function extractRoadName(step: GeoapifyStep, text: string): string | undefined {
  if (typeof step.name === "string" && step.name.trim()) return step.name.trim();
  const match = text.match(/\b(?:onto|on)\s+(.+)$/i);
  return match ? match[1].trim() : undefined;
}

function parseSteps(feature: GeoapifyFeature): RouteStep[] | undefined {
  const legs = feature.properties.legs;
  if (!legs) return undefined;
  const steps: RouteStep[] = [];
  for (const leg of legs) {
    for (const step of leg.steps ?? []) {
      const text = step.instruction?.text?.trim();
      if (!text || !Number.isFinite(step.from_index)) continue;
      steps.push({
        instruction: text,
        roadName: extractRoadName(step, text),
        maneuver: classifyManeuver(text, step.instruction?.type),
        distanceMeters: step.distance,
        durationSeconds: step.time,
        geometryStartIndex: step.from_index,
        geometryEndIndex: step.to_index,
      });
    }
  }
  return steps.length > 0 ? steps : undefined;
}

function buildUrl(start: Coordinates, end: Coordinates, withDetails: boolean): string {
  const url = new URL("/v1/routing", GEOAPIFY_BASE_URL);
  url.searchParams.set("waypoints", `${start.lat},${start.lng}|${end.lat},${end.lng}`);
  url.searchParams.set("mode", ROUTE_MODE);
  if (withDetails) url.searchParams.set("details", "instruction_details");
  url.searchParams.set("apiKey", GEOAPIFY_API_KEY);
  return url.toString();
}

async function fetchRoute(url: string): Promise<Response> {
  try {
    return await fetch(url);
  } catch {
    throw new Error("Network error while calculating the route. Check your connection and try again.");
  }
}

export async function getRoute(start: Coordinates, end: Coordinates): Promise<RouteResult> {
  if (!hasGeoapifyKey) {
    throw new Error("Routing isn't configured yet — a Geoapify API key is required (VITE_GEOAPIFY_API_KEY).");
  }

  let response = await fetchRoute(buildUrl(start, end, true));
  // Some parameter combinations get a 4xx — retry once without turn-by-turn details.
  if (!response.ok && response.status >= 400 && response.status < 500 && response.status !== 401 && response.status !== 403) {
    response = await fetchRoute(buildUrl(start, end, false));
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error("The routing service rejected the API key. Check VITE_GEOAPIFY_API_KEY.");
  }
  if (!response.ok) throw new Error("The routing service is temporarily unavailable.");

  const data = (await response.json()) as GeoapifyRoutingResponse;
  if (!data.features || data.features.length === 0) {
    throw new Error("Couldn't find a route between those two locations.");
  }

  const best = data.features[0];
  return {
    distanceMeters: best.properties.distance,
    durationSeconds: best.properties.time,
    geometry: flattenGeometry(best.geometry),
    steps: parseSteps(best),
  };
}
