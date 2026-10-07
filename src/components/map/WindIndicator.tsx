import { Wind } from "lucide-react";
import { useWind } from "@/hooks/useWind";
import { toCompassLabel, classifyRelativeWind, type WindRelative } from "@/services/windService";
import type { Coordinates } from "@/types";

interface WindIndicatorProps {
  coords: Coordinates | null;
  heading?: number | null;
}

const RELATIVE_LABEL: Record<WindRelative, string> = {
  tailwind: "Tailwind",
  crosswind: "Crosswind",
  headwind: "Headwind",
};
const RELATIVE_CLASS: Record<WindRelative, string> = {
  tailwind: "wind-indicator__relative--tailwind",
  crosswind: "wind-indicator__relative--crosswind",
  headwind: "wind-indicator__relative--headwind",
};

/**
 * Compact, always-visible wind readout fixed to the top of the map (real
 * Open-Meteo data for the rider's actual GPS position — see useWind).
 * Never a large permanent card: one line, glanceable while riding.
 */
export default function WindIndicator({ coords, heading }: WindIndicatorProps) {
  const { wind, status } = useWind(coords);

  if (!coords || (status !== "ready" && status !== "loading")) return null;

  const relative = wind && typeof heading === "number" ? classifyRelativeWind(wind.directionDeg, heading) : null;

  return (
    <div className="wind-indicator">
      <Wind size={14} />
      {wind ? (
        <>
          <span className="wind-indicator__main">
            {toCompassLabel(wind.directionDeg)} {wind.speedKph} km/h
          </span>
          <span className="wind-indicator__gust">Gust {wind.gustKph}</span>
          {relative && <span className={`wind-indicator__relative ${RELATIVE_CLASS[relative]}`}>{RELATIVE_LABEL[relative]}</span>}
        </>
      ) : (
        <span className="wind-indicator__main">Loading wind…</span>
      )}
    </div>
  );
}
