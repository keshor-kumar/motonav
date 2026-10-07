import { Loader2, Navigation2, Search } from "lucide-react";
import type { useRoutePlanner } from "@/hooks/useRoutePlanner";
import { formatDistanceMeters, formatDurationSeconds } from "@/utils/format";

type Planner = ReturnType<typeof useRoutePlanner>;

/** Collapsed-sheet summary: where you're going and how far — or an invitation to search. */
export default function PeekBar({ planner, onOpen }: { planner: Planner; onOpen: () => void }) {
  const { nav, routeReady } = planner;

  if (routeReady && nav.route && nav.destination) {
    return (
      <div className="peek">
        <div className="peek__info">
          <span className="peek__dest">{nav.destination.label}</span>
          <span className="peek__meta">
            {formatDistanceMeters(nav.route.distanceMeters)} · {formatDurationSeconds(nav.route.durationSeconds)}
          </span>
        </div>
        <button type="button" className="btn btn--primary btn--md" onClick={planner.startNavigation}>
          <Navigation2 size={16} /> Start
        </button>
      </div>
    );
  }

  if (nav.status === "routing" || nav.status === "geocoding-origin" || nav.status === "geocoding-destination") {
    return (
      <div className="peek">
        <span className="peek__loading">
          <Loader2 size={16} className="spin" /> Calculating route…
        </span>
      </div>
    );
  }

  return (
    <button type="button" className="peek peek--search" onClick={onOpen}>
      <Search size={18} />
      <span>Where to?</span>
    </button>
  );
}
