import PttButton from "@/components/comms/PttButton";
import { useRideComms } from "@/context/RideCommsContext";

/** Compact push-to-talk on the map, so a rider can talk without opening any panel. */
export default function PttFab() {
  const { inRide, voice } = useRideComms();
  if (!inRide) return null;
  const speaker = voice.uiState === "speaking" ? voice.speakerNames[0] : null;
  return (
    <div className="ptt-fab-wrap">
      {speaker && <span className="ptt-fab__pill">{speaker} speaking</span>}
      {voice.uiState === "transmitting" && <span className="ptt-fab__pill ptt-fab__pill--tx">Transmitting</span>}
      <PttButton variant="fab" />
    </div>
  );
}
