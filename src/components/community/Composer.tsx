import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { AlertCircle, ArrowUp, Link2, Loader2, Mic, Plus, RotateCcw, Send, Trash2, X } from "lucide-react";
import { useVoiceRecorder, type Recording } from "@/hooks/useVoiceRecorder";
import { COMMUNITY_LIMITS } from "@/services/communityService";
import { formatClockMs } from "@/utils/format";

interface ComposerProps {
  onSendText: (text: string) => Promise<void>;
  onSendAudio: (blob: Blob, durationMs: number) => Promise<void>;
  onTyping: (typing: boolean) => void;
  onShare: () => void;
}

const HOLD_MS = 350; // shorter than this = a tap, which locks recording on (hands-free)
const CANCEL_DRAG_PX = 80;

/**
 * [+] [Type a message…] [mic]. Enter sends (Shift+Enter = new line). Hold the mic to record and release
 * to send, slide left to cancel — or tap it once to record hands-free and use Send / Cancel.
 */
export default function Composer({ onSendText, onSendAudio, onTyping, onShare }: ComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pending, setPending] = useState<(Recording & { status: "sending" | "failed"; error?: string }) | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const pressRef = useRef<{ at: number; x: number } | null>(null);
  const typingRef = useRef(false);

  const submitAudio = useCallback(
    async (rec: Recording) => {
      setPending({ ...rec, status: "sending" });
      try {
        await onSendAudio(rec.blob, rec.durationMs);
        setPending(null);
      } catch (err) {
        setPending({ ...rec, status: "failed", error: err instanceof Error ? err.message : "Couldn't send the voice message." });
      }
    },
    [onSendAudio]
  );

  const recorder = useVoiceRecorder({ onRecorded: (rec) => void submitAudio(rec) });
  const recording = recorder.state === "recording";
  const busyMic = recorder.state !== "idle";

  // Auto-grow up to ~5 lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const setTyping = useCallback(
    (v: boolean) => {
      if (typingRef.current === v) return;
      typingRef.current = v;
      onTyping(v);
    },
    [onTyping]
  );
  useEffect(() => () => onTyping(false), [onTyping]);

  async function send() {
    const value = text.trim();
    if (!value || sending) return;
    if (value.length > COMMUNITY_LIMITS.textMax) {
      setError(`Messages can be up to ${COMMUNITY_LIMITS.textMax} characters.`);
      return;
    }
    setSending(true);
    setError(null);
    setText("");
    setTyping(false);
    try {
      await onSendText(value);
    } catch (err) {
      setText((current) => (current ? current : value)); // give the text back so nothing is lost
      setError(err instanceof Error ? err.message : "Message not sent.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  // ---- mic gestures ----
  function onMicDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (busyMic || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pressRef.current = { at: Date.now(), x: e.clientX };
    setCancelling(false);
    setLocked(false);
    setPlusOpen(false);
    void recorder.start();
  }
  function onMicMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const p = pressRef.current;
    if (!p || locked) return;
    setCancelling(e.clientX - p.x < -CANCEL_DRAG_PX);
  }
  function onMicUp() {
    const p = pressRef.current;
    pressRef.current = null;
    if (!p) return;
    if (cancelling) {
      recorder.cancel();
    } else if (Date.now() - p.at < HOLD_MS && recorder.state !== "idle") {
      setLocked(true); // quick tap -> hands-free mode: keep recording, show Send / Cancel
    } else {
      recorder.stopAndSend();
    }
    setCancelling(false);
  }
  function onMicCancelled() {
    pressRef.current = null;
    setCancelling(false);
    recorder.cancel();
  }
  // Keyboard activation (Enter / Space) arrives as a click with detail === 0.
  function onMicClick(e: ReactMouseEvent<HTMLButtonElement>) {
    if (e.detail !== 0) return;
    if (recorder.state === "idle") {
      setLocked(true);
      void recorder.start();
    } else {
      recorder.stopAndSend();
      setLocked(false);
    }
  }

  const sendLocked = () => {
    setLocked(false);
    recorder.stopAndSend();
  };
  const cancelLocked = () => {
    setLocked(false);
    recorder.cancel();
  };

  const micMessage = recorder.error ?? recorder.notice;
  const nearLimit = recorder.elapsedMs > COMMUNITY_LIMITS.audioMaxMs - 10_000;
  const hasText = text.trim().length > 0;

  // NOTE: the mic <button> keeps the same key/position in the tree while recording, so the element that
  // received the pointerdown (and holds pointer capture) is never unmounted mid-gesture.
  return (
    <div className="composer-wrap">
      {pending && (
        <div className={`composer__banner ${pending.status === "failed" ? "composer__banner--bad" : ""}`} role="status">
          {pending.status === "sending" ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
          <span>{pending.status === "sending" ? `Sending voice message (${formatClockMs(pending.durationMs)})…` : pending.error}</span>
          {pending.status === "failed" && (
            <>
              <button type="button" className="composer__banner-btn" onClick={() => void submitAudio(pending)}>
                <RotateCcw size={14} aria-hidden="true" /> Retry
              </button>
              <button type="button" className="composer__banner-btn" onClick={() => setPending(null)} aria-label="Discard voice message">
                <X size={14} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}
      {(error || micMessage) && !busyMic && (
        <div className="composer__banner composer__banner--bad" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error ?? micMessage}</span>
          <button
            type="button"
            className="composer__banner-btn"
            onClick={() => {
              setError(null);
              recorder.dismissMessages();
            }}
            aria-label="Dismiss"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className={`composer ${busyMic ? "composer--rec" : ""}`}>
        {busyMic ? (
          <div className={`rec ${cancelling ? "rec--cancel" : ""}`} role="group" aria-label="Recording voice message" aria-live="polite">
            <span className="rec__dot" aria-hidden="true" />
            <span className="rec__time mono">{recorder.state === "requesting" ? "…" : formatClockMs(recorder.elapsedMs)}</span>
            <span className={`rec__hint ${nearLimit ? "rec__hint--warn" : ""}`}>
              {recorder.state === "requesting"
                ? "Allow the microphone…"
                : cancelling
                  ? "Release to cancel"
                  : locked
                    ? `Recording… (max ${COMMUNITY_LIMITS.audioMaxMs / 1000}s)`
                    : "← Slide to cancel · release to send"}
            </span>
          </div>
        ) : (
          <>
            <div className="composer__plus">
              <button type="button" className="composer__icon" onClick={() => setPlusOpen((v) => !v)} aria-expanded={plusOpen} aria-label="More actions">
                <Plus size={22} className={plusOpen ? "composer__plus-open" : ""} />
              </button>
              {plusOpen && (
                <div className="composer__menu" role="menu">
                  {recorder.supported && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setPlusOpen(false);
                        setLocked(true);
                        void recorder.start();
                      }}
                    >
                      <Mic size={16} aria-hidden="true" /> Voice message
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPlusOpen(false);
                      onShare();
                    }}
                  >
                    <Link2 size={16} aria-hidden="true" /> Invite riders
                  </button>
                </div>
              )}
            </div>
            <textarea
              ref={inputRef}
              className="composer__input"
              rows={1}
              value={text}
              maxLength={COMMUNITY_LIMITS.textMax + 200}
              placeholder="Type a message…"
              aria-label="Message"
              enterKeyHint="send"
              autoComplete="off"
              onChange={(e) => {
                setText(e.target.value);
                setTyping(e.target.value.length > 0);
              }}
              onBlur={() => setTyping(false)}
              onKeyDown={onKeyDown}
            />
          </>
        )}

        {recording && locked ? (
          <div className="rec__buttons">
            <button type="button" className="composer__icon rec__cancel" onClick={cancelLocked} aria-label="Cancel recording">
              <Trash2 size={20} />
            </button>
            <button type="button" className="composer__send" onClick={sendLocked} aria-label="Send voice message">
              <Send size={20} />
            </button>
          </div>
        ) : hasText && !busyMic ? (
          <button
            key="send"
            type="button"
            className="composer__send"
            onPointerDown={(e) => e.preventDefault() /* keep the keyboard open */}
            onClick={() => void send()}
            disabled={sending}
            aria-label="Send message"
          >
            {sending ? <Loader2 size={20} className="spin" /> : <ArrowUp size={22} />}
          </button>
        ) : (
          <button
            key="mic"
            type="button"
            className={`composer__mic ${busyMic ? "composer__mic--live" : ""}`}
            onPointerDown={onMicDown}
            onPointerMove={onMicMove}
            onPointerUp={onMicUp}
            onPointerCancel={onMicCancelled}
            onClick={onMicClick}
            disabled={!recorder.supported}
            title={recorder.supported ? "Hold to record" : "Voice messages aren't supported in this browser"}
            aria-label={busyMic ? "Release to send voice message" : "Hold to record a voice message"}
          >
            <Mic size={22} />
          </button>
        )}
      </div>
      {text.length > COMMUNITY_LIMITS.textMax - 100 && (
        <p className={`composer__count ${text.length > COMMUNITY_LIMITS.textMax ? "composer__count--over" : ""}`}>
          {text.length}/{COMMUNITY_LIMITS.textMax}
        </p>
      )}
    </div>
  );
}
