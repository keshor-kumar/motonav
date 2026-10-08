import { useCallback, useEffect, useRef, useState } from "react";
import {
  listCommunityMessages,
  sendCommunityTextHttp,
  uploadCommunityAudio,
  type CommunityMessage,
} from "@/services/communityService";
import { connectCommunitySocket, type CommunitySocket } from "@/services/communitySocket";

export type ChatConnection = "connecting" | "connected" | "disconnected";

const PAGE = 40;

export function mergeMessages(existing: CommunityMessage[], incoming: CommunityMessage[]): CommunityMessage[] {
  const byId = new Map<string, CommunityMessage>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m); // newer copy wins (e.g. a re-signed audio URL)
  return [...byId.values()].sort((a, b) => (a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1));
}

interface Options {
  code: string;
  token: string;
  myId: string;
  initialMemberCount: number;
  /** Called when the server says this token is no longer valid for the community. */
  onAccessLost: () => void;
}

/**
 * Live state of one community chat: history over REST, realtime over the "/community" Socket.IO
 * namespace. Reconnects automatically and, on every (re)connect, re-joins the room and catches up on
 * anything missed while offline. Messages are de-duplicated by id (the sender receives both the ack
 * and the room broadcast).
 */
export function useCommunityChat({ code, token, myId, initialMemberCount, onAccessLost }: Options) {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [connection, setConnection] = useState<ChatConnection>("connecting");
  const [memberCount, setMemberCount] = useState(initialMemberCount);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [lastIncomingId, setLastIncomingId] = useState<string | null>(null);

  const socketRef = useRef<CommunitySocket | null>(null);
  const accessLostRef = useRef(onAccessLost);
  accessLostRef.current = onAccessLost;
  const messagesRef = useRef<CommunityMessage[]>([]);
  messagesRef.current = messages;
  const typingTimers = useRef(new Map<string, number>());

  const handleAuthError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : "";
    if (/join the community|not a member|not found/i.test(msg)) accessLostRef.current();
  }, []);

  const loadLatest = useCallback(async () => {
    try {
      const page = await listCommunityMessages(code, token, { limit: PAGE });
      setMessages((prev) => mergeMessages(prev, page.messages));
      // Only the first load decides whether older history exists; later catch-ups must not flip it.
      setHasMore((prev) => (messagesRef.current.length === 0 ? page.hasMore : prev));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load messages.");
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  }, [code, token, handleAuthError]);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setLoading(true);
    void loadLatest();

    const socket = connectCommunitySocket(token);
    socketRef.current = socket;

    const onConnect = () => {
      if (cancelled) return;
      setConnection("connected");
      socket.emit("community:join", () => undefined);
      void loadLatest(); // catch up on whatever arrived while we were offline
    };
    const onDisconnect = () => !cancelled && setConnection("disconnected");
    const onConnectError = (err: Error) => {
      if (cancelled) return;
      setConnection("disconnected");
      // The server's middleware attaches { code, message } as `data` when it rejects the handshake.
      const code = (err as Error & { data?: { code?: string } }).data?.code;
      if (code === "unauthorized" || code === "not_member" || code === "not_found") accessLostRef.current();
    };
    const onIncoming = (m: CommunityMessage) => {
      setMessages((prev) => mergeMessages(prev, [m]));
      if (m.senderId !== myId) setLastIncomingId(m.id);
    };
    const onJoined = (info: { name: string; memberCount: number }) => setMemberCount(info.memberCount);
    const onTyping = (info: { memberId: string; name: string; typing: boolean }) => {
      if (info.memberId === myId) return;
      const timers = typingTimers.current;
      const existing = timers.get(info.name);
      if (existing) window.clearTimeout(existing);
      if (!info.typing) {
        timers.delete(info.name);
        setTypingNames((n) => n.filter((x) => x !== info.name));
        return;
      }
      setTypingNames((n) => (n.includes(info.name) ? n : [...n, info.name]));
      timers.set(
        info.name,
        window.setTimeout(() => {
          timers.delete(info.name);
          setTypingNames((n) => n.filter((x) => x !== info.name));
        }, 4000)
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("community:message", onIncoming);
    socket.on("community:audio-message", onIncoming);
    socket.on("community:member-joined", onJoined);
    socket.on("community:typing", onTyping);

    const timers = typingTimers.current;
    return () => {
      cancelled = true;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("community:message", onIncoming);
      socket.off("community:audio-message", onIncoming);
      socket.off("community:member-joined", onJoined);
      socket.off("community:typing", onTyping);
      socket.disconnect();
      socketRef.current = null;
      for (const t of timers.values()) window.clearTimeout(t);
      timers.clear();
    };
  }, [code, token, myId, loadLatest]);

  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current[0];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await listCommunityMessages(code, token, { before: oldest.createdAt, limit: PAGE });
      setMessages((prev) => mergeMessages(prev, page.messages));
      setHasMore(page.hasMore);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  }, [code, token, loadingOlder]);

  /** Resolves when the server accepted the message; rejects with a readable Error otherwise. */
  const sendText = useCallback(
    async (text: string): Promise<void> => {
      const socket = socketRef.current;
      if (socket && socket.connected) {
        const result = await new Promise<{ ok: boolean; message?: string | CommunityMessage }>((resolve, reject) => {
          socket.timeout(8000).emit("community:message", { text }, (err: Error | null, res: { ok: boolean; message?: string | CommunityMessage }) => {
            if (err) reject(new Error("The server didn't respond. Message not sent."));
            else resolve(res);
          });
        });
        if (!result.ok) throw new Error(typeof result.message === "string" ? result.message : "Message not sent.");
        if (result.message && typeof result.message !== "string") {
          const sent = result.message;
          setMessages((prev) => mergeMessages(prev, [sent]));
        }
        return;
      }
      // Socket is down: fall back to HTTP (the server still broadcasts to everyone online).
      const { message } = await sendCommunityTextHttp(code, token, text);
      setMessages((prev) => mergeMessages(prev, [message]));
    },
    [code, token]
  );

  const sendAudio = useCallback(
    async (blob: Blob, durationMs: number): Promise<void> => {
      const message = await uploadCommunityAudio(code, token, blob, durationMs);
      setMessages((prev) => mergeMessages(prev, [message]));
    },
    [code, token]
  );

  const notifyTyping = useCallback((typing: boolean) => {
    const s = socketRef.current;
    if (s && s.connected) s.emit("community:typing", { typing });
  }, []);

  const reconnect = useCallback(() => {
    const s = socketRef.current;
    if (s && !s.connected) s.connect();
  }, []);

  return {
    messages,
    loading,
    loadError,
    hasMore,
    loadingOlder,
    loadOlder,
    connection,
    reconnect,
    memberCount,
    typingNames,
    lastIncomingId,
    sendText,
    sendAudio,
    notifyTyping,
    refresh: loadLatest,
  };
}
