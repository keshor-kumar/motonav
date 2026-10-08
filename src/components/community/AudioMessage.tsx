import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Pause, Play } from "lucide-react";
import { resolveAudioUrl } from "@/services/communityService";
import { formatClockMs } from "@/utils/format";

// Only one voice message plays at a time.
let current: HTMLAudioElement | null = null;

interface AudioMessageProps {
  url: string | null;
  durationMs: number;
  /** Called once if the file can't be loaded (e.g. an expired signed URL) so the parent can refresh. */
  onUnavailable?: () => void;
  /** Fetches a fresh URL from the backend (the DB stores only the object path; URLs are short-lived). */
  fetchFresh?: () => Promise<string>;
}

export default function AudioMessage({ url, durationMs, onUnavailable, fetchFresh }: AudioMessageProps) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [failed, setFailed] = useState(false);
  const reportedRef = useRef(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const mountedAt = useRef(Date.now());
  const src = resolveAudioUrl(fresh ?? url);

  useEffect(() => {
    setFailed(false);
    reportedRef.current = false;
  }, [src]);
  useEffect(() => {
    healedRef.current = false;
  }, [url]);

  useEffect(
    () => () => {
      const a = ref.current;
      if (a) {
        a.pause();
        if (current === a) current = null;
      }
    },
    []
  );

  const healedRef = useRef(false);
  const fail = useCallback(() => {
    // First failure (typically an expired signed URL): quietly ask the backend for a fresh one.
    if (fetchFresh && !healedRef.current) {
      healedRef.current = true;
      fetchFresh()
        .then((u) => {
          mountedAt.current = Date.now();
          setFresh(u);
        })
        .catch(() => {
          setFailed(true);
          setPlaying(false);
          if (!reportedRef.current) {
            reportedRef.current = true;
            onUnavailable?.();
          }
        });
      return;
    }
    setFailed(true);
    setPlaying(false);
    if (!reportedRef.current) {
      reportedRef.current = true;
      onUnavailable?.();
    }
  }, [onUnavailable, fetchFresh]);

  async function toggle() {
    const a = ref.current;
    if (!a || !src) return;
    if (!a.paused) {
      a.pause();
      return;
    }
    if (current && current !== a) current.pause();
    current = a;
    // A URL older than ~40 min is close to expiry (they last 60 min): renew before playing.
    if (fetchFresh && Date.now() - mountedAt.current > 40 * 60_000) {
      try {
        const u = await fetchFresh();
        mountedAt.current = Date.now();
        a.src = resolveAudioUrl(u) ?? u;
        setFresh(u);
        await a.play();
        return;
      } catch {
        /* fall through and try the URL we have */
      }
    }
    try {
      await a.play();
    } catch {
      // Expired or rejected URL → ask the backend for a fresh one and retry once.
      if (fetchFresh) {
        try {
          const u = await fetchFresh();
          mountedAt.current = Date.now();
          a.src = resolveAudioUrl(u) ?? u;
          setFresh(u);
          await a.play();
          return;
        } catch {
          /* fall through */
        }
      }
      fail();
    }
  }

  const total = durationMs > 0 ? durationMs : 1;
  const pct = Math.min(100, (position / total) * 100);

  if (!src || failed) {
    return (
      <div className="audio audio--bad" role="status">
        <AlertCircle size={18} aria-hidden="true" />
        <span>Voice message unavailable</span>
        {src && (
          <button type="button" className="audio__retry" onClick={() => setFailed(false)}>
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="audio">
      <button type="button" className="audio__btn" onClick={() => void toggle()} aria-label={playing ? "Pause voice message" : "Play voice message"}>
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div className="audio__track" aria-hidden="true">
        <div className="audio__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="audio__time mono">{formatClockMs(playing || position > 0 ? position : durationMs)}</span>
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPosition(0);
        }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime * 1000)}
        onError={fail}
      />
    </div>
  );
}
