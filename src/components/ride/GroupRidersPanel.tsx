import { useState } from "react";
import { Users, Navigation2, LogOut, Flag } from "lucide-react";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import { useGroupRide } from "@/context/GroupRideContext";
import { haversineMeters } from "@/utils/geo";
import { derivePresence, formatRelativeTime } from "@/utils/presence";
import { formatDistanceMeters } from "@/utils/format";
import type { GroupMember, RiderPresence } from "@/types";

const PRESENCE_LABEL: Record<RiderPresence, string> = { riding: "Riding", stopped: "Stopped", offline: "Offline" };
const PRESENCE_DOT = "status-dot--" as const;

interface GroupRidersPanelProps {
  onNavigateToRider: (member: GroupMember) => void;
}

/**
 * Real group member list — live from the backend/Socket.IO (GroupRideContext),
 * never mock riders. Shows each rider's presence, distance from the current
 * rider's real GPS, and a "Navigate to Rider" action; the creator additionally
 * gets "End ride", everyone gets "Leave ride".
 */
export default function GroupRidersPanel({ onNavigateToRider }: GroupRidersPanelProps) {
  const { session, ride, members, myCoords, isConnected, leaveRide, endRide, isBusy } = useGroupRide();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const isCreator = members.find((m) => m.riderId === session?.riderId)?.isCreator ?? false;

  return (
    <Card className="group-riders">
      <div className="panel-header">
        <div className="panel-header__title">
          <Users size={18} />
          <h3>Group riders</h3>
        </div>
        <span className="panel-header__count">
          {isConnected ? `${members.length} in ride` : "Reconnecting…"}
        </span>
      </div>

      <div className="group-riders__list">
        {members.map((member) => {
          const isMe = member.riderId === session?.riderId;
          const presence = derivePresence(member);
          const distance =
            !isMe && myCoords && member.latitude !== null && member.longitude !== null
              ? haversineMeters(myCoords, { lat: member.latitude, lng: member.longitude })
              : null;
          const selected = selectedId === member.riderId;

          return (
            <div key={member.riderId} className={`group-rider ${selected ? "group-rider--selected" : ""}`}>
              <button
                type="button"
                className="group-rider__row"
                onClick={() => setSelectedId(selected ? null : member.riderId)}
              >
                <span className={`status-dot ${PRESENCE_DOT}${presence === "riding" ? "connected" : presence === "stopped" ? "connecting" : "offline"}`} />
                <span className="group-rider__name">
                  {member.name}
                  {isMe && " (You)"}
                  {member.isCreator && <span className="rider-card__leader-tag">Leader</span>}
                </span>
                <span className="group-rider__meta">
                  {isMe ? "" : distance !== null ? formatDistanceMeters(distance) : PRESENCE_LABEL[presence]}
                </span>
              </button>

              {selected && !isMe && (
                <div className="group-rider__details">
                  <span className="group-rider__detail-line">Status: {PRESENCE_LABEL[presence]}</span>
                  <span className="group-rider__detail-line">Last updated: {formatRelativeTime(member.lastUpdated)}</span>
                  {member.latitude !== null && member.longitude !== null && (
                    <Button
                      variant="secondary"
                      size="md"
                      icon={<Navigation2 size={15} />}
                      onClick={() => onNavigateToRider(member)}
                    >
                      Navigate to {member.name}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="group-riders__actions">
        <Button variant="ghost" size="md" icon={<LogOut size={15} />} onClick={() => void leaveRide()} disabled={isBusy}>
          Leave ride
        </Button>
        {isCreator && ride?.status === "active" && (
          <>
            {!confirmingEnd ? (
              <Button variant="danger" size="md" icon={<Flag size={15} />} onClick={() => setConfirmingEnd(true)} disabled={isBusy}>
                End ride
              </Button>
            ) : (
              <Button variant="danger" size="md" onClick={() => void endRide()} disabled={isBusy}>
                Confirm end ride?
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
