import type { RouteResult } from "@/types";

// ============================================================
// Road / terrain conditions along a route (road class, surface, narrow
// roads, mountain sections, elevation…). No real data source is wired up
// yet, so this honestly reports "unavailable" instead of guessing. The
// shapes below are where a real provider's data should land later — the
// UI already renders `status: "ready"` results if one is ever returned.
// ============================================================

export interface RoadConditions {
  /** e.g. [{ label: "Highway", km: 120 }, { label: "Narrow road", km: 8 }] */
  roadTypes?: { label: string; km: number }[];
  /** e.g. ["Mountain road ahead — 2.4 km", "Steep section — 800 m"] */
  terrain?: string[];
}

export type RoadInfoResult =
  | { status: "unavailable"; reason: string }
  | { status: "ready"; data: RoadConditions };

export async function getRoadConditions(_route: RouteResult | null): Promise<RoadInfoResult> {
  return {
    status: "unavailable",
    reason: "No road-type or elevation data source is connected yet.",
  };
}
