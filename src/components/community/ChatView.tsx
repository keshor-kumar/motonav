import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ChevronLeft, Loader2, MessageSquareText, RefreshCw, Share2, Users, WifiOff, X } from "lucide-react";
import Composer from "@/components/community/Composer";
import MessageBubble from "@/components/community/MessageBubble";
import ShareCommunityCard from "@/components/community/ShareCommunityCard";
import { getCommunityAudioUrl } from "@/services/communityService";
import { useCommunityChat } from "@/hooks/useCommunityChat";
import { useViewportBox } from "@/hooks/useViewportBox";
import { formatDayLabel } from "@/utils/format";

interface ChatViewProps {
  code: string;
  name: string;
  token: string;
  myId: string;
  initialMemberCount: number;
  openShareInitially?: boolean;
  onAccessLost: () => void;
}

const NEAR_BOTTOM_PX = 140;

export default function ChatView({ code, name, token, myId, initialMemberCount, openShareInitially = false, onAccessLost }: ChatViewProps) {
  const fetchAudioUrl = useCallback((id: string) => getCommunityAudioUrl(code, token, id), [code, token]);
  const chat = useCommunityChat({ code, token, myId, initialMemberCount, onAccessLost });
  const viewport = useViewportBox();
  const [shareOpen, setShareOpen] = useState(openShareInitially);
  const [unseen, setUnseen] = useState(0);

  const listRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  const prevLastIdRef = useRef<string | null>(null);
  const prevFirstIdRef = useRef<string | null>(null);
  const prevHeightRef = useRef(0);
  const didInitialScroll = useRef(false);

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    nearBottomRef.current = true;
    setUnseen(0);
  }, []);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    nearBottomRef.current = near;
    if (near) setUnseen(0);
  }, []);

  // Keep the right scroll position when messages change:
  //  - first load                    -> jump to the newest message
  //  - older page prepended          -> keep the reader where they were
  //  - my message / near the bottom  -> follow to the newest
  //  - someone else's, reading above -> don't yank the view; show the "new messages" pill instead
  useLayoutEffect(() => {
    const el = listRef.current;
    const msgs = chat.messages;
    if (!el || msgs.length === 0) return;
    const lastId = msgs[msgs.length - 1].id;
    const firstId = msgs[0].id;

    if (!didInitialScroll.current) {
      didInitialScroll.current = true;
      scrollToBottom(false);
    } else if (firstId !== prevFirstIdRef.current && lastId === prevLastIdRef.current) {
      el.scrollTop += el.scrollHeight - prevHeightRef.current; // prepended history
    } else if (lastId !== prevLastIdRef.current) {
      const last = msgs[msgs.length - 1];
      if (last.senderId === myId || nearBottomRef.current) scrollToBottom(true);
      else setUnseen((n) => n + 1);
    }
    prevLastIdRef.current = lastId;
    prevFirstIdRef.current = firstId;
    prevHeightRef.current = el.scrollHeight;
  }, [chat.messages, myId, scrollToBottom]);

  // If the visible area changes (keyboard opens) while the reader is at the bottom, stay at the bottom.
  useEffect(() => {
    if (nearBottomRef.current) scrollToBottom(false);
  }, [viewport.height, scrollToBottom]);

  const rows = useMemo(() => {
    const out: Array<{ key: string; day?: string; msgIndex?: number }> = [];
    let lastDay = "";
    chat.messages.forEach((m, i) => {
      const day = formatDayLabel(m.createdAt);
      if (day !== lastDay) {
        out.push({ key: `day-${m.id}`, day });
        lastDay = day;
      }
      out.push({ key: m.id, msgIndex: i });
    });
    return out;
  }, [chat.messages]);

  const style = {
    "--chat-h": viewport.height ? `${viewport.height}px` : undefined,
    "--chat-top": `${viewport.top}px`,
  } as CSSProperties;

  const typing =
    chat.typingNames.length === 0
      ? null
      : chat.typingNames.length === 1
        ? `${chat.typingNames[0]} is typing…`
        : `${chat.typingNames.slice(0, 2).join(" and ")} are typing…`;

  return (
    <div className={`chat ${viewport.keyboardOpen ? "chat--kb" : ""}`} style={style}>
      <div className="chat__panel">
        <header className="chat__head">
          <Link to="/community" className="chat__back" aria-label="Back to communities">
            <ChevronLeft size={22} />
          </Link>
          <div className="chat__title">
            <h1>{name}</h1>
            <p>
              <Users size={13} aria-hidden="true" /> {chat.memberCount} {chat.memberCount === 1 ? "rider" : "riders"}
              <span className={`chat__dot chat__dot--${chat.connection}`} aria-hidden="true" />
              <span className="chat__status">{chat.connection === "connected" ? "Live" : chat.connection === "connecting" ? "Connecting…" : "Offline"}</span>
            </p>
          </div>
          <button type="button" className="btn btn--secondary btn--md chat__share" onClick={() => setShareOpen((v) => !v)} aria-expanded={shareOpen}>
            <Share2 size={16} aria-hidden="true" /> Share
          </button>
        </header>

        {shareOpen && (
          <div className="chat__share-panel">
            <button type="button" className="icon-btn chat__share-close" onClick={() => setShareOpen(false)} aria-label="Close share panel">
              <X size={16} />
            </button>
            <ShareCommunityCard code={code} name={name} />
          </div>
        )}

        {chat.connection === "disconnected" && (
          <div className="chat__banner" role="status">
            <WifiOff size={15} aria-hidden="true" /> Reconnecting… messages will still send.
            <button type="button" onClick={chat.reconnect}>Retry now</button>
          </div>
        )}

        <div className="chat__list" ref={listRef} onScroll={onScroll} role="log" aria-live="polite" aria-label="Messages">
          {chat.hasMore && (
            <button type="button" className="chat__older" onClick={() => void chat.loadOlder()} disabled={chat.loadingOlder}>
              {chat.loadingOlder ? <Loader2 size={14} className="spin" aria-hidden="true" /> : null} Load earlier messages
            </button>
          )}

          {chat.loading && chat.messages.length === 0 && (
            <div className="chat__empty" aria-busy="true">
              <Loader2 size={22} className="spin" aria-hidden="true" />
              <p>Loading messages…</p>
            </div>
          )}

          {!chat.loading && chat.loadError && chat.messages.length === 0 && (
            <div className="chat__empty" role="alert">
              <p>{chat.loadError}</p>
              <button type="button" className="btn btn--secondary btn--md" onClick={() => void chat.refresh()}>
                <RefreshCw size={15} aria-hidden="true" /> Try again
              </button>
            </div>
          )}

          {!chat.loading && !chat.loadError && chat.messages.length === 0 && (
            <div className="chat__empty">
              <MessageSquareText size={30} aria-hidden="true" />
              <h2>No messages yet</h2>
              <p>Say hello, or hold the mic to send a voice message. Share the community link to bring riders in.</p>
            </div>
          )}

          {rows.map((r) => {
            if (r.day !== undefined) {
              return (
                <div key={r.key} className="chat__day">
                  <span>{r.day}</span>
                </div>
              );
            }
            const i = r.msgIndex as number;
            const m = chat.messages[i];
            const prev = chat.messages[i - 1];
            const showName = !prev || prev.senderId !== m.senderId || formatDayLabel(prev.createdAt) !== formatDayLabel(m.createdAt);
            return (
              <Fragment key={r.key}>
                <MessageBubble message={m} mine={m.senderId === myId} showName={showName} onAudioUnavailable={() => void chat.refresh()} fetchAudioUrl={fetchAudioUrl} />
              </Fragment>
            );
          })}

          {unseen > 0 && (
            <button type="button" className="chat__new" onClick={() => scrollToBottom(true)}>
              <ArrowDown size={15} aria-hidden="true" /> {unseen} new {unseen === 1 ? "message" : "messages"}
            </button>
          )}
        </div>

        <div className="chat__foot">
          <p className={`chat__typing ${typing ? "chat__typing--on" : ""}`} aria-live="polite">
            {typing ?? " "}
          </p>
          <Composer onSendText={chat.sendText} onSendAudio={chat.sendAudio} onTyping={chat.notifyTyping} onShare={() => setShareOpen(true)} />
        </div>
      </div>
    </div>
  );
}
