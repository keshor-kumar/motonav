import { GEOAPIFY_BASE_URL, GEOAPIFY_API_KEY, hasGeoapifyKey } from "@/config/env";
import { haversineMeters } from "@/utils/geo";
import type { Coordinates, NearbyPlace, PlaceCategory } from "@/types";

// ============================================================
// Real nearby places via the Geoapify Places API, searched around
// the rider's actual current coordinates — never static/sample data.
//
// NOTE on category IDs: these map MotoNav's categories to Geoapify's
// public category taxonomy as documented at the time of writing. If
// Geoapify renames/restructures a category, that request will come
// back with zero results rather than crash (see the empty-array
// "no results" contract below) — worth spot-checking against
// https://apidocs.geoapify.com/docs/places/#categories if a specific
// category consistently returns nothing.
// ============================================================

const CATEGORY_MAP: Record<PlaceCategory, string> = {
  fuel: "service.vehicle.fuel",
  food: "catering.restaurant,catering.fast_food",
  hotel: "accommodation.hotel",
  restroom: "toilet",
  coffee: "catering.cafe",
  mechanic: "service.vehicle.repair",
  hospital: "healthcare.hospital",
  parking: "parking",
  shop: "commercial.supermarket,commercial.convenience",
};

const DEFAULT_RADIUS_METERS = 5000;

interface GeoapifyPlaceFeature {
  properties: {
    place_id: string;
    name?: string;
    formatted: string;
    distance?: number;
    lat: number;
    lon: number;
  };
}

interface GeoapifyPlacesResponse {
  features: GeoapifyPlaceFeature[];
}

/**
 * Searches for real nearby places in one category around `origin` (the
 * rider's actual GPS position). Returns an empty array for "no results
 * found" (never throws for that) so the UI can show a plain message
 * instead of an error state.
 */
export async function searchNearbyPlaces(
  category: PlaceCategory,
  origin: Coordinates,
  radiusMeters: number = DEFAULT_RADIUS_METERS
): Promise<NearbyPlace[]> {
  if (!hasGeoapifyKey) {
    throw new Error("Nearby places aren't configured yet — a Geoapify API key is required (VITE_GEOAPIFY_API_KEY).");
  }

  const url = new URL("/v2/places", GEOAPIFY_BASE_URL);
  url.searchParams.set("categories", CATEGORY_MAP[category]);
  url.searchParams.set("filter", `circle:${origin.lng},${origin.lat},${radiusMeters}`);
  url.searchParams.set("bias", `proximity:${origin.lng},${origin.lat}`);
  url.searchParams.set("limit", "20");
  url.searchParams.set("apiKey", GEOAPIFY_API_KEY);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    throw new Error("Network error while finding nearby places. Check your connection and try again.");
  }

  if (!response.ok) {
    throw new Error("The nearby places service is temporarily unavailable.");
  }

  const data = (await response.json()) as GeoapifyPlacesResponse;

  const places = data.features.map((feature) => {
    const coords: Coordinates = { lat: feature.properties.lat, lng: feature.properties.lon };
    return {
      id: feature.properties.place_id,
      name: feature.properties.name || feature.properties.formatted.split(",")[0],
      category,
      address: feature.properties.formatted,
      distanceMeters: feature.properties.distance ?? haversineMeters(origin, coords),
      coords,
    };
  });

  // Geoapify generally returns proximity-biased results already, but sort
  // explicitly so the UI is guaranteed nearest-first regardless of API order.
  return places.sort((a, b) => a.distanceMeters - b.distanceMeters);
}
