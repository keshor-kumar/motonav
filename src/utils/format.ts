export function formatDistanceKm(km: number): string {
  const abs = Math.abs(km);
  if (abs < 1) return `${Math.round(abs * 1000)} m`;
  return `${abs.toFixed(1)} km`;
}

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h <= 0) return `${m} min`;
  return `${h} hr ${m} min`;
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatRideDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// ---------- Stage 2: real routing-service output formatters ----------
// These take raw routing-service numbers (meters, seconds) — never mock/km values —
// per the Stage 2 distance/duration formatting spec.

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDurationSeconds(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} min`;
  return `${h} hr ${m} min`;
}
