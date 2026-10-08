import { useState } from "react";
import { Link } from "react-router-dom";
import { Mic, Zap, BookOpen, Radio } from "lucide-react";
import PttButton from "@/components/comms/PttButton";
import VoiceControls from "@/components/comms/VoiceControls";
import QuickMessagesGrid from "@/components/comms/QuickMessagesGrid";
import { useRideComms } from "@/context/RideCommsContext";
import { SIGNAL_CATEGORIES } from "@/data/riderSignals";

type CommsTab = "talk" | "messages" | "signals";

const TABS: { id: CommsTab; label: string; icon: typeof Mic }[] = [
  { id: "talk", label: "Talk", icon: Mic },
  { id: "messages", label: "Messages", icon: Zap },
  { id: "signals", label: "Signals", icon: BookOpen },
];

const HELP: Partial<Record<string, string>> = {
  denied: "Microphone permission is required for Push-to-Talk.",
  unavailable: "No microphone was found on this device.",
  error: "Something went wrong with the microphone.",
};

/** Unified Rider Comms: Push-to-Talk, Quick Messages and the Rider Signals guide. */
export default function RiderCommsPanel({ onOpenSignals }: { onOpenSignals: () => void }) {
  const { inRide, voice } = useRideComms();
  const [tab, setTab] = useState<CommsTab>("talk");
  const blocked = voice.uiState === "denied" || voice.uiState === "unavailable" || voice.uiState === "error";

  return (
    <div className="panel-stack comms-panel">
      <div className="comms-tabs" role="tablist" aria-label="Rider comms">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`comms-tab ${tab === id ? "comms-tab--active" : ""}`} onClick={() => setTab(id)}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>

      {tab !== "signals" && !inRide && (
        <div className="comms-locked">
          <Radio size={26} />
          <h3>Rider Comms needs a ride</h3>
          <p>Voice and quick messages work between riders in the same ride. Start or join one to talk to your crew.</p>
          <Link to="/create-ride" className="btn btn--primary btn--lg btn--full">
            Start a ride
          </Link>
          <Link to="/join-ride" className="btn btn--secondary btn--lg btn--full">
            Join a ride
          </Link>
        </div>
      )}

      {tab === "talk" && inRide && (
        <>
          <PttButton variant="panel" />
          {blocked && (
            <div className="comms-alert" role="alert">
              <p>{HELP[voice.uiState] ?? "Voice is unavailable."}</p>
              <p className="comms-alert__hint">If nothing happens, allow microphone access for this site in your browser settings, then try again.</p>
              <button type="button" className="btn btn--primary btn--lg btn--full" onClick={voice.retry}>
                {voice.uiState === "denied" ? "Allow Microphone" : "Try Again"}
              </button>
            </div>
          )}
          {voice.error && !blocked && <p className="error-msg">{voice.error}</p>}
          {voice.enabled && <VoiceControls />}
          <p className="comms-note">Hold the button to talk and release to stop. Voice goes directly between riders in your ride; nothing is recorded.</p>
        </>
      )}

      {tab === "messages" && inRide && <QuickMessagesGrid />}

      {tab === "signals" && (
        <div className="comms-signals">
          <BookOpen size={26} />
          <h3>Common Rider Signals</h3>
          <p>Learn the hand signals riders commonly use — off the bike, before the ride. Meanings vary by country, riding school and group.</p>
          <ul>
            {SIGNAL_CATEGORIES.map((c) => (
              <li key={c.id}>{c.label}</li>
            ))}
          </ul>
          <button type="button" className="btn btn--primary btn--lg btn--full" onClick={onOpenSignals}>
            Open signal guide
          </button>
        </div>
      )}
    </div>
  );
}
