import { useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Mic, MicOff, Radio, Volume2, Loader2, WifiOff } from "lucide-react";
import { useRideComms } from "@/context/RideCommsContext";
import type { VoiceUiState } from "@/utils/voiceState";

interface Described {
  title: string;
  sub: string;
  icon: typeof Mic;
}

function describe(state: VoiceUiState, speakers: string[], peerCount: number): Described {
  switch (state) {
    case "no-ride":
      return { title: "Join a ride", sub: "to use voice", icon: MicOff };
    case "off":
      return { title: "Enable voice", sub: "Tap to allow the microphone", icon: Mic };
    case "requesting":
      return { title: "Allow microphone", sub: "Check your browser prompt", icon: Loader2 };
    case "denied":
      return { title: "Mic blocked", sub: "Tap to try again", icon: MicOff };
    case "unavailable":
      return { title: "No microphone", sub: "Tap to try again", icon: MicOff };
    case "error":
      return { title: "Voice error", sub: "Tap to try again", icon: MicOff };
    case "disconnected":
      return { title: "Reconnecting", sub: "Waiting for the ride server", icon: WifiOff };
    case "connecting":
      return { title: "Hold to talk", sub: "Connecting to riders…", icon: Mic };
    case "connected":
      return { title: "Hold to talk", sub: peerCount > 0 ? `${peerCount} rider${peerCount === 1 ? "" : "s"} in voice` : "Waiting for riders", icon: Mic };
    case "transmitting":
      return { title: "Transmitting", sub: "Release to stop", icon: Radio };
    case "speaking":
      return { title: `${speakers[0] ?? "Rider"}${speakers.length > 1 ? ` +${speakers.length - 1}` : ""} is speaking`, sub: "Hold to talk over", icon: Volume2 };
    case "muted":
      return { title: "Mic muted", sub: "Unmute to talk", icon: MicOff };
  }
}

const HOLDABLE: VoiceUiState[] = ["connected", "connecting", "speaking", "transmitting"];

/**
 * The push-to-talk control. PRESS AND HOLD to transmit, release to stop. The first
 * press (voice not enabled yet) asks for microphone permission instead of talking.
 * Pointer capture keeps the hold alive if the finger drifts off the button.
 */
export default function PttButton({ variant }: { variant: "panel" | "fab" }) {
  const { voice } = useRideComms();
  const holding = useRef(false);
  const state = voice.uiState;
  const { title, sub, icon: Icon } = describe(state, voice.speakerNames, voice.peers.length);

  const release = () => {
    if (holding.current) {
      holding.current = false;
      voice.stopTalking();
    }
  };

  function press(captureTarget?: { el: HTMLButtonElement; pointerId: number }) {
    if (state === "off") {
      void voice.enableVoice();
      return;
    }
    if (state === "denied" || state === "unavailable" || state === "error") {
      voice.retry();
      return;
    }
    if (!HOLDABLE.includes(state)) return;
    voice.resumeAudio(); // a press is a user gesture: lets the browser start any blocked playback
    captureTarget?.el.setPointerCapture(captureTarget.pointerId);
    holding.current = true;
    voice.startTalking();
  }

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    press({ el: e.currentTarget, pointerId: e.pointerId });
  }
  function onKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      press();
    }
  }

  const label = `${title}. ${sub}`;
  return (
    <button
      type="button"
      className={`ptt ptt--${variant} ptt--${state}`}
      onPointerDown={onPointerDown}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={onKeyDown}
      onKeyUp={release}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={label}
      aria-pressed={state === "transmitting"}
    >
      <span className="ptt__ring" />
      <Icon size={variant === "fab" ? 28 : 44} className={state === "requesting" ? "spin" : undefined} />
      {variant === "panel" && (
        <span className="ptt__text">
          <span className="ptt__title">{title}</span>
          <span className="ptt__sub">{sub}</span>
        </span>
      )}
    </button>
  );
}
