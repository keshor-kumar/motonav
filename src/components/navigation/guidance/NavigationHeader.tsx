import TurnInstruction from "@/components/navigation/guidance/TurnInstruction";
import NextTurn from "@/components/navigation/guidance/NextTurn";
import type { GuidanceState } from "@/hooks/useGuidance";

interface NavigationHeaderProps {
  guidance: GuidanceState | null;
  destinationLabel: string;
}

export default function NavigationHeader({ guidance, destinationLabel }: NavigationHeaderProps) {
  const step = guidance?.nextStep ?? null;
  const arriving = Boolean(guidance?.hasSteps && !step);

  return (
    <header className="gd-header">
      <TurnInstruction
        maneuver={step ? step.maneuver : arriving ? "arrive" : null}
        distanceMeters={step || arriving ? guidance?.distanceToManeuverMeters ?? null : null}
        secondary={step ? step.roadName ?? step.instruction : arriving ? destinationLabel : `Follow the route to ${destinationLabel}`}
      />
      {guidance?.thenStep && <NextTurn step={guidance.thenStep} />}
    </header>
  );
}
