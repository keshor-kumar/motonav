import ManeuverIcon, { MANEUVER_LABEL } from "@/components/navigation/guidance/maneuverIcons";
import type { RouteStep } from "@/types";

/** Small "then…" preview of the maneuver after the next one. */
export default function NextTurn({ step }: { step: RouteStep }) {
  return (
    <div className="gd-then">
      <span className="gd-then__label">Then</span>
      <ManeuverIcon type={step.maneuver} size={18} />
      <span className="gd-then__text">{step.roadName ? `${MANEUVER_LABEL[step.maneuver]} · ${step.roadName}` : MANEUVER_LABEL[step.maneuver]}</span>
    </div>
  );
}
