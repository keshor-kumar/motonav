import { useCallback, useEffect, useRef, useState } from "react";
import { QUICK_MESSAGE_META } from "@/components/comms/quickMessageMeta";
import type { GroupSocket } from "@/services/socketService";
import type { QuickMessageEvent, QuickMessageKind } from "@/types/comms";

const MAX_RECENT = 20;
const MAX_BANNERS = 3;
const SEND_COOLDOWN_MS = 1000; // matches the server's per-rider limit
const SENT_FLASH_MS = 2000;

/** Quick ride messages over the existing ride socket: real-time only, nothing persisted. */
export function useQuickMessages({ socket, selfId }: { socket: GroupSocket | null; selfId: string | null }) {
  const [recent, setRecent] = useState<QuickMessageEvent[]>([]);
  const [banners, setBanners] = useState<QuickMessageEvent[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [cooling, setCooling] = useState(false);
  const [lastSent, setLastSent] = useState<QuickMessageKind | null>(null);
  const bannerTimers = useRef(new Map<string, number>());
  const coolTimer = useRef<number | undefined>(undefined);
  const sentTimer = useRef<number | undefined>(undefined);

  const dismissBanner = useCallback((id: string) => {
    window.clearTimeout(bannerTimers.current.get(id));
    bannerTimers.current.delete(id);
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const timers = bannerTimers.current;
    const onMessage = (m: QuickMessageEvent) => {
      setRecent((prev) => (prev.some((p) => p.id === m.id) ? prev : [m, ...prev].slice(0, MAX_RECENT)));
      if (m.riderId === selfId) return; // no banner for my own message
      setBanners((prev) => [m, ...prev.filter((b) => b.id !== m.id)].slice(0, MAX_BANNERS));
      window.clearTimeout(timers.get(m.id));
      timers.set(
        m.id,
        window.setTimeout(() => dismissBanner(m.id), QUICK_MESSAGE_META[m.kind].bannerMs)
      );
      const priority = QUICK_MESSAGE_META[m.kind].priority;
      if (priority !== "normal") navigator.vibrate?.(priority === "critical" ? [200, 100, 200] : 120);
    };
    socket.on("comms:message", onMessage);
    return () => {
      socket.off("comms:message", onMessage);
      for (const t of timers.values()) window.clearTimeout(t);
      timers.clear();
      setRecent([]);
      setBanners([]);
    };
  }, [socket, selfId, dismissBanner]);

  useEffect(
    () => () => {
      window.clearTimeout(coolTimer.current);
      window.clearTimeout(sentTimer.current);
    },
    []
  );

  const send = useCallback(
    (kind: QuickMessageKind) => {
      if (!socket || cooling) return;
      if (!socket.connected) {
        setSendError("Not connected to the ride server.");
        return;
      }
      setSendError(null);
      setCooling(true);
      window.clearTimeout(coolTimer.current);
      coolTimer.current = window.setTimeout(() => setCooling(false), SEND_COOLDOWN_MS);
      socket.emit("comms:message", { kind }, (ack) => {
        if (!ack.ok) {
          setSendError(ack.message ?? "Message not sent.");
          return;
        }
        setLastSent(kind);
        window.clearTimeout(sentTimer.current);
        sentTimer.current = window.setTimeout(() => setLastSent(null), SENT_FLASH_MS);
      });
    },
    [socket, cooling]
  );

  return { recent, banners, sendError, cooling, lastSent, send, dismissBanner };
}
