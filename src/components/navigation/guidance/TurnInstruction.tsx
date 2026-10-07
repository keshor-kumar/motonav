import { Navigation2 } from "lucide-react";
import ManeuverIcon, { MANEUVER_LABEL } from "@/components/navigation/guidance/maneuverIcons";
import { formatDistanceMeters } from "@/utils/format";
import type { ManeuverType } from "@/types";

interface TurnInstructionProps {
  maneuver: ManeuverType | null;
  distanceMeters: number | null;
  /** Road name or instruction text under the distance. */
  secondary?: string | null;
}

/** The big next-maneuver card. With no maneuver data it shows "Navigation ready" rather than inventing a turn. */
export default function TurnInstruction({ maneuver, distanceMeters, secondary }: TurnInstructionProps) {
  return (
    <div className="gd-turn" role="status" aria-live="polite">
      <div className="gd-turn__icon">{maneuver ? <ManeuverIcon type={maneuver} size={44} /> : <Navigation2 size={40} strokeWidth={2.2} />}</div>
      <div className="gd-turn__text">
        <span className="gd-turn__label">{maneuver ? MANEUVER_LABEL[maneuver] : "Navigation ready"}</span>
        {distanceMeters !== null && <span className="gd-turn__distance">{formatDistanceMeters(distanceMeters)}</span>}
        {secondary && <span className="gd-turn__road">{secondary}</span>}
      </div>
    </div>
  );
}
