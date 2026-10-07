import { CornerUpLeft, CornerUpRight, ArrowUp, ArrowUpLeft, ArrowUpRight, Undo2, RotateCw, Flag } from "lucide-react";
import type { ManeuverType } from "@/types";

const ICONS: Record<ManeuverType, typeof ArrowUp> = {
  straight: ArrowUp,
  left: CornerUpLeft,
  right: CornerUpRight,
  "slight-left": ArrowUpLeft,
  "slight-right": ArrowUpRight,
  "sharp-left": CornerUpLeft,
  "sharp-right": CornerUpRight,
  uturn: Undo2,
  roundabout: RotateCw,
  arrive: Flag,
};

export const MANEUVER_LABEL: Record<ManeuverType, string> = {
  straight: "Continue",
  left: "Turn left",
  right: "Turn right",
  "slight-left": "Bear left",
  "slight-right": "Bear right",
  "sharp-left": "Sharp left",
  "sharp-right": "Sharp right",
  uturn: "U-turn",
  roundabout: "Roundabout",
  arrive: "Arrive",
};

export default function ManeuverIcon({ type, size = 40 }: { type: ManeuverType; size?: number }) {
  const Icon = ICONS[type];
  return <Icon size={size} strokeWidth={2.4} aria-hidden="true" />;
}
