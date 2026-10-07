import { Clock, Ruler, Flag } from "lucide-react";
import { formatDistanceMeters, formatDurationSeconds } from "@/utils/format";

interface ETAProps {
  etaDate: Date;
  remainingMeters: number;
  remainingSeconds: number;
}

export default function ETA({ etaDate, remainingMeters, remainingSeconds }: ETAProps) {
  return (
    <dl className="gd-stats">
      <div>
        <dt>
          <Ruler size={13} /> Remaining
        </dt>
        <dd>{formatDistanceMeters(remainingMeters)}</dd>
      </div>
      <div>
        <dt>
          <Clock size={13} /> Time
        </dt>
        <dd>{formatDurationSeconds(remainingSeconds)}</dd>
      </div>
      <div>
        <dt>
          <Flag size={13} /> ETA
        </dt>
        <dd>{etaDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</dd>
      </div>
    </dl>
  );
}
