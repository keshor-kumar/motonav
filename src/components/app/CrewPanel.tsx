import { memo, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Flag, LogOut, Users } from "lucide-react";
import MotorcycleIcon from "@/components/common/MotorcycleIcon";
import ShareRideCard from "@/components/ride/ShareRideCard";
import CommsBadge from "@/components/comms/CommsBadge";
import { useRideComms } from "@/context/RideCommsContext";
import { useGroupRide } from "@/context/GroupRideContext";
import { haversineMeters } from "@/utils/geo";
import { derivePresence } from "@/utils/presence";
import { formatDistanceMeters } from "@/utils/format";
import type { RiderPresence } from "@/types";
import type { CommsStatus } from "@/types/comms";

const PRESENCE_LABEL: Record<RiderPresence, string> = { riding: "Riding", stopped: "Stopped", offline: "Offline" };

interface RiderRowProps {
  id: string;
  name: string;
  isMe: boolean;
  isCreator: boolean;
  presence: RiderPresence;
  comms: CommsStatus | null;
  distanceLabel: string | null;
  selected: boolean;
  onSelect: (id: string) => void;
}

// memo: a location tick for one rider shouldn't re-render every other row.
const RiderRow = memo(function RiderRow({ id, name, isMe, isCreator, presence, comms, distanceLabel, selected, onSelect }: RiderRowProps) {
  return (
    <li>
      <button
        type="button"
        className={`crew-rider ${selected ? "crew-rider--selected" : ""} ${isMe ? "crew-rider--me" : ""}`}
        onClick={() => !isMe && onSelect(id)}
        disabled={isMe}
      >
        <span className={`crew-rider__icon crew-rider__icon--${presence}`}>
          <MotorcycleIcon size={22} />
        </span>
        <span className="crew-rider__main">
          <span className="crew-rider__name">
            {name}
            {isCreator && <span className="crew-rider__tag">Leader</span>}
          </span>
          <span className={`crew-rider__status crew-rider__status--${presence}`}>{isMe ? "You" : PRESENCE_LABEL[presence]}</span>
          {comms && <CommsBadge status={comms} />}
        </span>
        <span className="crew-rider__dist">{isMe ? "" : distanceLabel ?? ""}</span>
      </button>
    </li>
  );
});

interface CrewPanelProps {
  selectedRiderId: string | null;
  onSelectRider: (id: string) => void;
}

export default function CrewPanel({ selectedRiderId, onSelectRider }: CrewPanelProps) {
  const { session, ride, members, myCoords, leaveRide, endRide, isBusy } = useGroupRide();
  const { commsStatusFor } = useRideComms();
  const [confirmEnd, setConfirmEnd] = useState(false);

  const rows = useMemo(
    () =>
      members.map((m) => {
        const isMe = m.riderId === session?.riderId;
        const distance =
          !isMe && myCoords && m.latitude !== null && m.longitude !== null
            ? haversineMeters(myCoords, { lat: m.latitude, lng: m.longitude })
            : null;
        return {
          id: m.riderId,
          name: m.name,
          isMe,
          isCreator: m.isCreator,
          presence: derivePresence(m),
          comms: commsStatusFor(m.riderId),
          distanceLabel: distance !== null ? `${formatDistanceMeters(distance)} away` : null,
        };
      }),
    [members, myCoords, session, commsStatusFor]
  );

  if (!session || !ride) {
    return (
      <div className="panel-stack crew-empty">
        <Users size={28} />
        <h3>Ride with your crew</h3>
        <p>Create a ride, share the link, and see everyone live on the map — or join a crew with a ride code.</p>
        <Link to="/create-ride" className="btn btn--primary btn--lg btn--full">
          Start a ride
        </Link>
        <Link to="/join-ride" className="btn btn--secondary btn--lg btn--full">
          Join a ride
        </Link>
      </div>
    );
  }

  const isCreator = rows.find((r) => r.isMe)?.isCreator ?? false;

  return (
    <div className="panel-stack">
      <div className="crew-head">
        <span className="crew-head__eyebrow">Group ride</span>
        <h2 className="crew-head__title">{ride.rideName}</h2>
        <span className="crew-head__meta">
          <Flag size={14} /> {ride.destination} · {rows.length} rider{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="crew-code">
        <span>Ride code</span>
        <strong className="mono">{ride.rideCode}</strong>
      </div>
      <ShareRideCard rideCode={ride.rideCode} rideName={ride.rideName} />

      <ul className="crew-list">
        {rows.map((r) => (
          <RiderRow key={r.id} {...r} selected={r.id === selectedRiderId} onSelect={onSelectRider} />
        ))}
      </ul>

      <div className="crew-actions">
        <button type="button" className="btn btn--ghost btn--md" onClick={() => void leaveRide()} disabled={isBusy}>
          <LogOut size={15} /> Leave ride
        </button>
        {isCreator && ride.status === "active" &&
          (confirmEnd ? (
            <button type="button" className="btn btn--danger btn--md" onClick={() => void endRide()} disabled={isBusy}>
              Confirm end ride
            </button>
          ) : (
            <button type="button" className="btn btn--danger btn--md" onClick={() => setConfirmEnd(true)} disabled={isBusy}>
              End ride
            </button>
          ))}
      </div>
    </div>
  );
}
