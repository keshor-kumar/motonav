import { LocateFixed, RefreshCw, X } from "lucide-react";
import SpeedDisplay from "@/components/navigation/guidance/SpeedDisplay";
import CurrentRoad from "@/components/navigation/guidance/CurrentRoad";
import RouteProgress from "@/components/navigation/guidance/RouteProgress";
import ETA from "@/components/navigation/guidance/ETA";
import type { GuidanceState } from "@/hooks/useGuidance";

const OFF_ROUTE_THRESHOLD_M = 80;

interface NavigationBottomSheetProps {
  guidance: GuidanceState | null;
  following: boolean;
  onRecenter: () => void;
  onEnd: () => void;
  onRecalculate: () => void;
}

export default function NavigationBottomSheet({ guidance, following, onRecenter, onEnd, onRecalculate }: NavigationBottomSheetProps) {
  const offRoute = guidance?.offRouteMeters !== null && guidance !== null && (guidance.offRouteMeters ?? 0) > OFF_ROUTE_THRESHOLD_M;

  return (
    <section className="gd-sheet" aria-label="Navigation information">
      {offRoute && (
        <div className="gd-offroute" role="alert">
          <span>You're off the planned route.</span>
          <button type="button" onClick={onRecalculate}>
            <RefreshCw size={14} /> Recalculate
          </button>
        </div>
      )}
      <div className="gd-sheet__top">
        <SpeedDisplay speedKph={guidance?.speedKph ?? null} />
        <CurrentRoad name={guidance?.currentRoad ?? null} />
      </div>
      {guidance && (
        <>
          <ETA etaDate={guidance.etaDate} remainingMeters={guidance.remainingMeters} remainingSeconds={guidance.remainingSeconds} />
          <RouteProgress progress={guidance.progress} />
        </>
      )}
      <div className="gd-sheet__actions">
        {!following && (
          <button type="button" className="btn btn--secondary btn--lg" onClick={onRecenter}>
            <LocateFixed size={18} /> Recenter
          </button>
        )}
        <button type="button" className="btn btn--danger btn--lg gd-sheet__end" onClick={onEnd}>
          <X size={18} /> End navigation
        </button>
      </div>
    </section>
  );
}
