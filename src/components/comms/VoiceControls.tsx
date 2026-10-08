import { useState } from "react";
import { Mic, MicOff, Volume2, VolumeX, LogOut, Settings } from "lucide-react";
import CommsBadge from "@/components/comms/CommsBadge";
import { useRideComms } from "@/context/RideCommsContext";

const QUALITY_LABEL = { good: "Good", fair: "Fair", poor: "Poor", unknown: "Waiting for riders" } as const;

export default function VoiceControls() {
  const { voice } = useRideComms();
  const [open, setOpen] = useState(false);
  const connected = voice.peers.filter((p) => voice.links[p.riderId] === "connected").length;

  return (
    <div className="voice-controls">
      <div className="voice-controls__row">
        <button type="button" className={`voice-btn ${voice.micMuted ? "voice-btn--off" : ""}`} onClick={voice.toggleMicMute} aria-pressed={voice.micMuted}>
          {voice.micMuted ? <MicOff size={22} /> : <Mic size={22} />}
          <span>{voice.micMuted ? "Unmute mic" : "Mute mic"}</span>
        </button>
        <button type="button" className={`voice-btn ${voice.speakerMuted ? "voice-btn--off" : ""}`} onClick={voice.toggleSpeakerMute} aria-pressed={voice.speakerMuted}>
          {voice.speakerMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          <span>{voice.speakerMuted ? "Unmute audio" : "Mute audio"}</span>
        </button>
        <button type="button" className="voice-btn" onClick={voice.disableVoice}>
          <LogOut size={22} />
          <span>Leave voice</span>
        </button>
      </div>

      {voice.audioBlocked && (
        <button type="button" className="btn btn--primary btn--lg btn--full" onClick={voice.resumeAudio}>
          <Volume2 size={18} /> Tap to hear riders
        </button>
      )}

      <button type="button" className="voice-status" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Settings size={16} />
        <span>
          Audio status · <strong className={`voice-quality voice-quality--${voice.quality}`}>{QUALITY_LABEL[voice.quality]}</strong>
        </span>
      </button>
      {open && (
        <div className="voice-status__panel">
          <p>
            {voice.peers.length === 0 ? "No other riders in voice yet." : `${connected} of ${voice.peers.length} riders connected${voice.rttMs !== null ? ` · ${Math.round(voice.rttMs)} ms` : ""}`}
          </p>
          <ul>
            {voice.peers.map((p) => (
              <li key={p.riderId}>
                <span>{p.name}</span>
                <CommsBadge status={p.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
