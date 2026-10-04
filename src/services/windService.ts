import type { Coordinates } from "@/types";

// ============================================================
// Wind data via Open-Meteo — free, no API key required. Real
// current conditions at the rider's actual GPS position; nothing
// here is invented or estimated.
// ============================================================

export interface WindData {
  speedKph: number;
  gustKph: number;
  /** Direction the wind is blowing FROM, in degrees (0 = N, 90 = E, meteorological convention). */
  directionDeg: number;
}

export interface WeatherData {
  temperatureC: number;
  description: string;
}

interface OpenMeteoResponse {
  current?: {
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
    wind_direction_10m?: number;
    temperature_2m?: number;
    weather_code?: number;
  };
}

// WMO weather codes (Open-Meteo's scheme) → short rider-facing description.
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

async function fetchCurrent(coords: Coordinates): Promise<NonNullable<OpenMeteoResponse["current"]>> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", coords.lat.toFixed(4));
  url.searchParams.set("longitude", coords.lng.toFixed(4));
  url.searchParams.set("current", "wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,weather_code");
  url.searchParams.set("wind_speed_unit", "kmh");

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    throw new Error("Network error while fetching weather data.");
  }
  if (!response.ok) throw new Error("Weather data is temporarily unavailable.");

  const data = (await response.json()) as OpenMeteoResponse;
  if (!data.current) throw new Error("Weather data is unavailable for this location right now.");
  return data.current;
}

export async function getWind(coords: Coordinates): Promise<WindData> {
  const c = await fetchCurrent(coords);
  if (c.wind_speed_10m === undefined || c.wind_direction_10m === undefined) {
    throw new Error("Wind data is unavailable for this location right now.");
  }
  return {
    speedKph: Math.round(c.wind_speed_10m),
    gustKph: Math.round(c.wind_gusts_10m ?? c.wind_speed_10m),
    directionDeg: c.wind_direction_10m,
  };
}

export async function getWeather(coords: Coordinates): Promise<WeatherData> {
  const c = await fetchCurrent(coords);
  if (c.temperature_2m === undefined) throw new Error("Weather data is unavailable for this location right now.");
  return {
    temperatureC: Math.round(c.temperature_2m),
    description: c.weather_code !== undefined ? WEATHER_CODE_LABELS[c.weather_code] ?? "Conditions unavailable" : "Conditions unavailable",
  };
}

const COMPASS_POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

/** 0–360 degrees → compass abbreviation (e.g. "WSW"). */
export function toCompassLabel(deg: number): string {
  const index = Math.round(((deg % 360) / 360) * 16) % 16;
  return COMPASS_POINTS[index];
}

export type WindRelative = "tailwind" | "crosswind" | "headwind";

/**
 * Classifies wind relative to the rider's direction of travel. `directionDeg`
 * is where the wind blows FROM; a headwind blows from roughly the same
 * direction the rider is heading toward (opposing them), a tailwind from
 * roughly behind.
 */
export function classifyRelativeWind(windFromDeg: number, headingDeg: number): WindRelative {
  const diff = Math.abs(((windFromDeg - headingDeg + 540) % 360) - 180); // 0 = headwind, 180 = tailwind
  if (diff <= 45) return "headwind";
  if (diff >= 135) return "tailwind";
  return "crosswind";
}
