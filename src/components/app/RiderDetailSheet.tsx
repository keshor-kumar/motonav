import { Navigation2, X } from "lucide-react";
import MotorcycleIcon from "@/components/common/MotorcycleIcon";
import { formatRelativeTime } from "@/utils/presence";
import type { GroupMember, RiderPresence } from "@/types";

const PRESENCE_LABEL: Record<RiderPresence, string> = { riding: "Riding", stopped: "Stopped", offline: "Offline" };

interface RiderDetailSheetProps {
  member: GroupMember;
  presence: RiderPresence;
  distanceLabel: string | null;
  onClose: () => void;
  onNavigate: () => void;
}

export default function RiderDetailSheet({ member, presence, distanceLabel, onClose, onNavigate }: RiderDetailSheetProps) {
  const hasLocation = member.latitude !== null && member.longitude !== null;
  return (
    <aside className="rd-sheet" aria-label={`${member.name} details`}>
      <div className="rd-sheet__head">
        <span className={`crew-rider__icon crew-rider__icon--${presence}`}>
          <MotorcycleIcon size={24} />
        </span>
        <div className="rd-sheet__title">
          <h3>{member.name}</h3>
          <span className={`crew-rider__status crew-rider__status--${presence}`}>{PRESENCE_LABEL[presence]}</span>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close rider details">
          <X size={18} />
        </button>
      </div>
      <dl className="rd-sheet__facts">
        <div>
          <dt>Distance</dt>
          <dd>{distanceLabel ?? "—"}</dd>
        </div>
        <div>
          <dt>Last update</dt>
          <dd>{formatRelativeTime(member.lastUpdated)}</dd>
        </div>
        <div className="rd-sheet__wide">
          <dt>Current location</dt>
          <dd className="mono">{hasLocation ? `${member.latitude!.toFixed(5)}, ${member.longitude!.toFixed(5)}` : "Not shared yet"}</dd>
        </div>
      </dl>
      <button type="button" className="btn btn--primary btn--lg btn--full" onClick={onNavigate} disabled={!hasLocation}>
        <Navigation2 size={18} /> Navigate to rider
      </button>
    </aside>
  );
}
