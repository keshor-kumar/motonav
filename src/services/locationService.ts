import type { Coordinates, GeoErrorInfo } from "@/types";

// ============================================================
// Thin wrapper around the browser Geolocation API. Real device
// GPS only — nothing here fakes or simulates a position. Kept
// framework-agnostic so it's reusable outside React hooks too.
// ============================================================

/** A GPS fix plus the device-reported heading, when available (degrees,
 *  0 = north, clockwise). `heading` is null when the device doesn't report
 *  one (e.g. stationary, or hardware without a compass) — callers should
 *  fall back to a bearing calculated from consecutive positions. */
export interface GeoPosition extends Coordinates {
  heading: number | null;
  /** Device-reported ground speed in m/s, or null when unavailable. Used to tell
   *  "riding" apart from "stopped" for group-ride presence — never estimated/faked. */
  speed: number | null;
}

// One-shot fix (e.g. "Use my current location"): high accuracy is worth the
// extra GPS-chip power for a single deliberate read.
const ONE_SHOT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 10000,
};

// Continuous tracking (navigation mode): lighter power draw. The app only
// needs an approximate live position for the map + a straight-line distance
// readout now, not survey-grade precision, so this trades a little accuracy
// for meaningfully better battery life on a multi-hour ride.
const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 20000,
  maximumAge: 15000,
};

function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

function toGeoPosition(position: GeolocationPosition): GeoPosition {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    heading: Number.isFinite(position.coords.heading) ? (position.coords.heading as number) : null,
    speed: Number.isFinite(position.coords.speed) && (position.coords.speed as number) >= 0 ? (position.coords.speed as number) : null,
  };
}

function mapGeolocationError(error: GeolocationPositionError): GeoErrorInfo {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        kind: "permission-denied",
        message: "Location permission is required to use live navigation.",
      };
    case error.POSITION_UNAVAILABLE:
      return {
        kind: "unavailable",
        message: "Your location couldn't be determined. You can enter it manually instead.",
      };
    case error.TIMEOUT:
      return {
        kind: "timeout",
        message: "Getting your location took too long. Please try again.",
      };
    default:
      return {
        kind: "unknown",
        message: "Something went wrong getting your location.",
      };
  }
}

/** One-shot location fetch (navigator.geolocation.getCurrentPosition). */
export function getCurrentLocation(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject({ kind: "unavailable", message: "Location services aren't supported on this device/browser." } satisfies GeoErrorInfo);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toGeoPosition(position)),
      (error) => reject(mapGeolocationError(error)),
      ONE_SHOT_OPTIONS
    );
  });
}

/**
 * Continuous location updates (navigator.geolocation.watchPosition) for
 * active navigation mode. Returns the watch id — the caller is responsible
 * for passing it to clearLocationWatch() on unmount/exit to avoid leaking
 * the GPS subscription and draining the rider's battery.
 */
export function watchLocation(
  onUpdate: (position: GeoPosition) => void,
  onError: (error: GeoErrorInfo) => void
): number | null {
  if (!isGeolocationSupported()) {
    onError({ kind: "unavailable", message: "Location services aren't supported on this device/browser." });
    return null;
  }
  return navigator.geolocation.watchPosition(
    (position) => onUpdate(toGeoPosition(position)),
    (error) => onError(mapGeolocationError(error)),
    WATCH_OPTIONS
  );
}

export function clearLocationWatch(watchId: number | null): void {
  if (watchId !== null && isGeolocationSupported()) {
    navigator.geolocation.clearWatch(watchId);
  }
}
