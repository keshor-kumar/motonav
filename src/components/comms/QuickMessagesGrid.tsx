import { Check } from "lucide-react";
import { QUICK_MESSAGE_META, QUICK_MESSAGE_ORDER } from "@/components/comms/quickMessageMeta";
import { useRideComms } from "@/context/RideCommsContext";
import { formatRelativeTime } from "@/utils/presence";

/** One-tap messages — no typing while riding. Sent to the current ride room over Socket.IO. */
export default function QuickMessagesGrid() {
  const { quick } = useRideComms();
  return (
    <div className="quick">
      <div className="quick__grid">
        {QUICK_MESSAGE_ORDER.map((kind) => {
          const { label, icon: Icon, priority } = QUICK_MESSAGE_META[kind];
          const sent = quick.lastSent === kind;
          return (
            <button key={kind} type="button" className={`quick__btn quick__btn--${priority}`} onClick={() => quick.send(kind)} disabled={quick.cooling}>
              {sent ? <Check size={26} /> : <Icon size={26} />}
              <span>{sent ? "Sent" : label}</span>
            </button>
          );
        })}
      </div>
      {quick.sendError && <p className="error-msg">{quick.sendError}</p>}

      {quick.recent.length > 0 && (
        <section className="quick__recent" aria-label="Recent ride messages">
          <h4>Recent</h4>
          <ul>
            {quick.recent.slice(0, 6).map((m) => {
              const { short, icon: Icon, priority } = QUICK_MESSAGE_META[m.kind];
              return (
                <li key={m.id} className={`quick__item quick__item--${priority}`}>
                  <Icon size={16} />
                  <span>
                    <strong>{m.name}</strong> — {short}
                  </span>
                  <time dateTime={m.at}>{formatRelativeTime(m.at)}</time>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
