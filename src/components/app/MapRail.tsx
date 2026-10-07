import { LocateFixed, CloudSun, Route as RouteIcon, Mountain, Repeat, AlertTriangle, Loader2 } from "lucide-react";

export type ConditionId = "weather" | "roads" | "terrain" | "curves" | "alerts";

const CONDITIONS: { id: ConditionId; label: string; icon: typeof CloudSun }[] = [
  { id: "weather", label: "Weather", icon: CloudSun },
  { id: "roads", label: "Road types", icon: RouteIcon },
  { id: "terrain", label: "Terrain", icon: Mountain },
  { id: "curves", label: "Curves", icon: Repeat },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
];

interface MapRailProps {
  onLocate: () => void;
  locating: boolean;
  onSelectCondition: (id: ConditionId) => void;
  alertCount: number;
  /** Navigation mode: only the locate/recenter control. */
  compact?: boolean;
}

/** Right-hand glass controls: locate me + tap-to-open ride conditions (never permanent text). */
export default function MapRail({ onLocate, locating, onSelectCondition, alertCount, compact = false }: MapRailProps) {
  return (
    <div className={`map-rail ${compact ? "map-rail--compact" : ""}`}>
      <button type="button" className="rail-btn rail-btn--primary" onClick={onLocate} aria-label="Use my location">
        {locating ? <Loader2 size={20} className="spin" /> : <LocateFixed size={20} />}
      </button>
      {!compact &&
        CONDITIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`rail-btn ${id === "alerts" && alertCount > 0 ? "rail-btn--alert" : ""}`}
            onClick={() => onSelectCondition(id)}
            aria-label={label}
            title={label}
          >
            <Icon size={20} />
            {id === "alerts" && alertCount > 0 && <span className="rail-btn__badge">{alertCount}</span>}
          </button>
        ))}
    </div>
  );
}
