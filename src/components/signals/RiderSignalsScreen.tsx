import { useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { X, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import SignalIllustration from "@/components/signals/SignalIllustration";
import { RIDER_SIGNALS, SIGNAL_CATEGORIES, type SignalCategoryId } from "@/data/riderSignals";

interface RiderSignalsScreenProps {
  onClose: () => void;
}

/**
 * Full-screen "Common Rider Signals" guide — same card-by-card pattern as the pre-ride warm-up.
 * Study it before you ride, not while riding.
 */
export default function RiderSignalsScreen({ onClose }: RiderSignalsScreenProps) {
  const [category, setCategory] = useState<SignalCategoryId | "all">("all");
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const signals = useMemo(() => (category === "all" ? RIDER_SIGNALS : RIDER_SIGNALS.filter((s) => s.category === category)), [category]);
  const signal = signals[Math.min(index, signals.length - 1)];
  const categoryLabel = SIGNAL_CATEGORIES.find((c) => c.id === signal.category)?.label ?? "";
  const atStart = index === 0;
  const atEnd = index >= signals.length - 1;

  const go = (delta: number) => setIndex((i) => Math.min(signals.length - 1, Math.max(0, i + delta)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(signals.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, signals.length]);

  function onTouchStart(e: ReactTouchEvent<HTMLElement>) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: ReactTouchEvent<HTMLElement>) {
    const start = touchStartX.current;
    touchStartX.current = null;
    const end = e.changedTouches[0]?.clientX;
    if (start === null || end === undefined) return;
    const dx = end - start;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  }

  return (
    <div className="signals-screen" role="dialog" aria-modal="true" aria-label="Common rider signals">
      <header className="signals-screen__header">
        <div>
          <h2>Rider signals</h2>
          <span className="signals-screen__sub">Common Rider Signals</span>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close rider signals">
          <X size={20} />
        </button>
      </header>

      <div className="signals-screen__cats" role="tablist" aria-label="Signal categories">
        {[{ id: "all" as const, label: "All" }, ...SIGNAL_CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            className={`signals-screen__cat ${category === c.id ? "signals-screen__cat--active" : ""}`}
            onClick={() => {
              setCategory(c.id);
              setIndex(0);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="signals-screen__progress">
        <span className="mono">
          SIGNAL {index + 1} / {signals.length}
        </span>
        <div className="signals-screen__bar" role="progressbar" aria-valuemin={1} aria-valuemax={signals.length} aria-valuenow={index + 1}>
          <div style={{ width: `${((index + 1) / signals.length) * 100}%` }} />
        </div>
      </div>

      <article className="signals-screen__card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="signals-screen__art">
          <SignalIllustration pose={signal.pose} label={`Illustration: ${signal.name}`} />
        </div>
        <span className="signals-screen__category">{categoryLabel}</span>
        <h3>{signal.name}</h3>
        {signal.groupSignal && <span className="signals-screen__tag">Common group-riding signal</span>}
        {signal.noStandard && <span className="signals-screen__tag signals-screen__tag--warn">No standard signal</span>}

        <dl>
          <dt>Meaning</dt>
          <dd>{signal.meaning}</dd>
          <dt>How it's commonly made</dt>
          <dd>{signal.commonForm}</dd>
          <dt>When to use</dt>
          <dd>{signal.whenToUse}</dd>
          <dt>Safety</dt>
          <dd>{signal.safety}</dd>
        </dl>
      </article>

      <div className="signals-screen__nav">
        <button type="button" className="btn btn--secondary btn--lg" onClick={() => go(-1)} disabled={atStart}>
          <ChevronLeft size={18} /> Previous
        </button>
        <button type="button" className="btn btn--primary btn--lg" onClick={() => go(1)} disabled={atEnd}>
          Next <ChevronRight size={18} />
        </button>
      </div>

      <p className="signals-screen__disclaimer">
        <AlertTriangle size={14} /> Hand signals are supplemental communication. Always follow local traffic laws and ride safely. Meanings vary by country, riding school and group — agree yours before you ride, and learn them off the bike.
      </p>
    </div>
  );
}
