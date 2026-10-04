import { Ruler, Clock, Navigation } from "lucide-react";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import { formatDistanceMeters, formatDurationSeconds } from "@/utils/format";
import type { NavLocation, RouteResult } from "@/types";

interface RouteSummaryCardProps {
  origin: NavLocation;
  destination: NavLocation;
  route: RouteResult;
  onStartNavigation: () => void;
}

/** Real distance/duration only — both numbers come straight from the routing service response. */
export default function RouteSummaryCard({ origin, destination, route, onStartNavigation }: RouteSummaryCardProps) {
  return (
    <Card className="route-summary-card" elevated>
      <div className="panel-header">
        <div className="panel-header__title">
          <Navigation size={18} />
          <h3>Route</h3>
        </div>
      </div>

      <p className="route-summary-card__path">
        <span>{origin.label}</span>
        <span className="route-summary-card__arrow">→</span>
        <span>{destination.label}</span>
      </p>

      <div className="route-summary-card__stats">
        <span>
          <Ruler size={15} /> {formatDistanceMeters(route.distanceMeters)}
        </span>
        <span>
          <Clock size={15} /> {formatDurationSeconds(route.durationSeconds)}
        </span>
      </div>

      <Button fullWidth size="lg" onClick={onStartNavigation}>
        Start navigation
      </Button>
    </Card>
  );
}
