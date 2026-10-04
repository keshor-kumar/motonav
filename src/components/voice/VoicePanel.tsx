import { Mic, MicOff, Radio } from "lucide-react";
import { useVoiceChannel } from "@/hooks/useVoiceChannel";
import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";

// Stage 1: UI-only mock. No audio is captured or transmitted to anyone —
// this only toggles local visual state. Copy is deliberately explicit about
// that so the mock never reads as a live voice channel.
export default function VoicePanel() {
  const { isMuted, isTransmitting, startTalking, stopTalking, toggleMute } = useVoiceChannel();

  return (
    <Card className="voice-panel">
      <div className="panel-header">
        <div className="panel-header__title">
          <Radio size={18} />
          <h3>Group voice</h3>
        </div>
        <Badge tone="muted">UI preview — Stage 1</Badge>
      </div>

      <div className="voice-panel__speaker">
        {isMuted
          ? "Microphone muted"
          : isTransmitting
          ? "Talking (preview only — not sent to other riders)"
          : "Microphone ready"}
      </div>

      <div className="voice-panel__controls">
        <button
          className={`ptt-button ${isTransmitting ? "ptt-button--active" : ""}`}
          onMouseDown={startTalking}
          onMouseUp={stopTalking}
          onMouseLeave={stopTalking}
          onTouchStart={startTalking}
          onTouchEnd={stopTalking}
          disabled={isMuted}
          aria-pressed={isTransmitting}
          aria-label="Hold to talk (mock — Stage 1 preview only)"
        >
          <Mic size={30} strokeWidth={2.2} />
          <span>{isMuted ? "Muted" : "Push to talk"}</span>
        </button>

        <button
          className={`icon-btn icon-btn--lg ${isMuted ? "icon-btn--muted" : ""}`}
          onClick={toggleMute}
          aria-pressed={isMuted}
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
      </div>
    </Card>
  );
}
