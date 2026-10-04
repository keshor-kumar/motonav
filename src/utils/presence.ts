import type { GroupMember, RiderPresence } from "@/types";

// Real device ground speed, not an estimate — from the Geolocation API's
// coords.speed (m/s), broadcast as part of each location update.
const STOPPED_SPEED_THRESHOLD_MPS = 1.4; // ~5 km/h — below this reads as "stopped", not "riding"

/** Server only tracks connected/disconnected; riding-vs-stopped is derived client-side from real speed. */
export function derivePresence(member: GroupMember): RiderPresence {
  if (member.connectionStatus === "disconnected") return "offline";
  if (member.speed !== null && member.speed > STOPPED_SPEED_THRESHOLD_MPS) return "riding";
  return "stopped";
}

/** "Just now" / "12s ago" / "4 min ago" — used for offline/stopped riders' last-known update time. */
export function formatRelativeTime(isoTimestamp: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(isoTimestamp).getTime()) / 1000));
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}
