import { Mic, MicOff, Radio, Loader2, WifiOff } from "lucide-react";
import type { CommsStatus } from "@/types/comms";

const META: Record<CommsStatus, { label: string; icon: typeof Mic }> = {
  speaking: { label: "Speaking", icon: Mic },
  muted: { label: "Muted", icon: MicOff },
  connected: { label: "Connected", icon: Radio },
  connecting: { label: "Connecting", icon: Loader2 },
  reconnecting: { label: "Reconnecting", icon: WifiOff },
};

/** Compact voice-state chip shown next to a rider's name. */
export default function CommsBadge({ status }: { status: CommsStatus }) {
  const { label, icon: Icon } = META[status];
  return (
    <span className={`comms-badge comms-badge--${status}`}>
      <Icon size={12} className={status === "connecting" ? "spin" : undefined} /> {label}
    </span>
  );
}
