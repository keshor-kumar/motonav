import { AppError, type LocationUpdate } from "./types.js";

// Small hand-rolled validators — every value from the network passes through
// here before touching business logic or the database.

const invalid = (msg: string) => new AppError("invalid_input", 400, msg);

function cleanText(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string") throw invalid(`${field} is required.`);
  const text = value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
  if (text.length < min || text.length > max) {
    throw invalid(`${field} must be between ${min} and ${max} characters.`);
  }
  return text;
}

function finiteNumber(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw invalid(`${field} is invalid.`);
  }
  return value;
}

export const cleanRiderName = (v: unknown) => cleanText(v, "Name", 1, 40);

export function parseCreateRide(body: unknown) {
  if (typeof body !== "object" || body === null) throw invalid("Request body is required.");
  const b = body as Record<string, unknown>;
  return {
    rideName: cleanText(b.rideName, "Ride name", 1, 80),
    riderName: cleanRiderName(b.riderName),
    destination: cleanText(b.destination, "Destination", 1, 200),
    destinationLatitude: finiteNumber(b.destinationLatitude, "Destination latitude", -90, 90),
    destinationLongitude: finiteNumber(b.destinationLongitude, "Destination longitude", -180, 180),
  };
}

export function parseJoin(body: unknown) {
  if (typeof body !== "object" || body === null) throw invalid("Request body is required.");
  return { riderName: cleanRiderName((body as Record<string, unknown>).riderName) };
}

export function parseLocationUpdate(payload: unknown): LocationUpdate {
  if (typeof payload !== "object" || payload === null) throw invalid("Location payload is required.");
  const p = payload as Record<string, unknown>;
  const heading = p.heading == null ? null : finiteNumber(p.heading, "Heading", 0, 360);
  const speed = p.speed == null ? null : finiteNumber(p.speed, "Speed", 0, 200);
  return {
    latitude: finiteNumber(p.latitude, "Latitude", -90, 90),
    longitude: finiteNumber(p.longitude, "Longitude", -180, 180),
    heading: heading === null ? null : heading % 360,
    speed,
  };
}

const CODE_RE = /^[A-Z0-9]{6}$/;
export function parseRideCode(raw: unknown): string {
  const code = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!CODE_RE.test(code)) throw new AppError("invalid_input", 400, "That ride code doesn't look valid.");
  return code;
}
