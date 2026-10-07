import { Signpost, TrafficCone } from "lucide-react";
import type { RouteInfo } from "@/types";
import { formatDistanceKm, formatDuration } from "@/utils/format";
import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";

const TRAFFIC_TONE = { light: "teal", moderate: "amber", heavy: "red" } as const;

export default function RouteInfoPanel({ route }: { route: RouteInfo }) {
  return (
    <Card className="route-panel">
      <div className="route-panel__top">
        <div>
          <span className="route-panel__label">To {route.destinationName}</span>
          <div className="route-panel__stats">
            <span className="route-panel__stat-value">{formatDistanceKm(route.distanceKm)}</span>
            <span className="route-panel__stat-sep">·</span>
            <span className="route-panel__stat-value">{formatDuration(route.durationMin)}</span>
          </div>
        </div>
        <Badge tone={TRAFFIC_TONE[route.trafficLevel]}>
          <TrafficCone size={12} /> {route.trafficLevel} traffic
        </Badge>
      </div>

      <div className="route-panel__next">
        <Signpost size={18} />
        <div>
          <span className="route-panel__next-label">{route.nextTurn}</span>
          <span className="route-panel__next-distance">in {route.nextTurnDistanceM} m</span>
        </div>
      </div>

      <div className="route-panel__eta">
        Arriving <strong>{route.etaLabel}</strong>
      </div>
    </Card>
  );
}
