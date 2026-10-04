import { GEOAPIFY_BASE_URL, GEOAPIFY_API_KEY, hasGeoapifyKey } from "@/config/env";
import type { SearchResult } from "@/types";

// ============================================================
// Geocoding + place search via Geoapify's Autocomplete API. Search
// is explicitly caller-triggered (button press / Enter / debounced
// typing in the search field) — this module does nothing on its
// own timer, so callers stay in control of request volume.
// ============================================================

interface GeoapifyFeature {
  properties: {
    place_id: string;
    formatted: string;
    address_line1?: string;
    address_line2?: string;
    lat: number;
    lon: number;
  };
}

interface GeoapifyResponse {
  features: GeoapifyFeature[];
}

const MISSING_KEY_MESSAGE = "Search isn't configured yet — a Geoapify API key is required (VITE_GEOAPIFY_API_KEY).";

/**
 * Looks up places/addresses matching free text (e.g. "Ooty", "SRM Ramapuram",
 * "Chennai Airport") — not restricted to any fixed list. Returns an empty
 * array for "no results" (never throws for that case) so callers can show a
 * plain "No results" message instead of an error state.
 */
export async function searchPlaces(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (!hasGeoapifyKey) throw new Error(MISSING_KEY_MESSAGE);

  const url = new URL("/v1/geocode/autocomplete", GEOAPIFY_BASE_URL);
  url.searchParams.set("text", trimmed);
  url.searchParams.set("limit", "6");
  url.searchParams.set("apiKey", GEOAPIFY_API_KEY);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    throw new Error("Network error while searching. Check your connection and try again.");
  }

  if (!response.ok) {
    throw new Error("The location search service is temporarily unavailable.");
  }

  const data = (await response.json()) as GeoapifyResponse;

  return data.features.map((feature) => ({
    id: feature.properties.place_id,
    label: feature.properties.address_line1 || feature.properties.formatted,
    address: feature.properties.formatted,
    coords: { lat: feature.properties.lat, lng: feature.properties.lon },
  }));
}
