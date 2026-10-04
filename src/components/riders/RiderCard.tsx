import { Crown, Mic, MicOff } from "lucide-react";
import type { Rider } from "@/types";
import StatusDot from "@/components/common/StatusDot";
import { formatDistanceKm } from "@/utils/format";

export default function RiderCard({ rider }: { rider: Rider }) {
  const distanceLabel =
    rider.distanceFromGroupKm === 0
      ? "With group"
      : `${formatDistanceKm(rider.distanceFromGroupKm)} ${rider.distanceFromGroupKm > 0 ? "ahead" : "behind"}`;

  return (
    <div className="rider-card">
      <div className="rider-card__avatar" style={{ background: rider.avatarColor }}>
        {rider.initials}
        {rider.isLeader && (
          <span className="rider-card__crown" aria-label="Ride leader">
            <Crown size={12} strokeWidth={2.6} />
          </span>
        )}
        <StatusDot status={rider.status} />
      </div>
      <div className="rider-card__info">
        <div className="rider-card__name-row">
          <span className="rider-card__name">{rider.name}</span>
          {rider.isLeader && <span className="rider-card__leader-tag">Leader</span>}
        </div>
        <span className="rider-card__meta">
          {distanceLabel} · {rider.speedKph > 0 ? `${rider.speedKph} km/h` : "Stopped"}
        </span>
      </div>
      <div className="rider-card__voice" aria-hidden="true">
        {rider.isMuted ? <MicOff size={16} /> : <Mic size={16} className={rider.isSpeaking ? "rider-card__mic--speaking" : ""} />}
      </div>
    </div>
  );
}
