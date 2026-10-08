import { MapPin, X } from "lucide-react";
import { QUICK_MESSAGE_META, priorityRank } from "@/components/comms/quickMessageMeta";
import { useRideComms } from "@/context/RideCommsContext";

interface CommsBannersProps {
  onShowOnMap: (location: { latitude: number; longitude: number }) => void;
}

/** Compact, auto-dismissing banners for incoming quick messages. Never full-screen; emergencies rank first. */
export default function CommsBanners({ onShowOnMap }: CommsBannersProps) {
  const { quick } = useRideComms();
  if (quick.banners.length === 0) return null;
  const ordered = [...quick.banners].sort((a, b) => priorityRank(a.kind) - priorityRank(b.kind));
  return (
    <>
      {ordered.map((m) => {
        const { short, icon: Icon, priority } = QUICK_MESSAGE_META[m.kind];
        const location = m.location;
        return (
          <div key={m.id} className={`comms-banner comms-banner--${priority}`} role={priority === "critical" ? "alert" : "status"}>
            <Icon size={18} />
            <span>
              <strong>{m.name}</strong> — {short}
            </span>
            {location && (
              <button type="button" onClick={() => onShowOnMap(location)} aria-label={`Show ${m.name} on the map`}>
                <MapPin size={14} /> Show
              </button>
            )}
            <button type="button" onClick={() => quick.dismissBanner(m.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </>
  );
}
