import { useCallback, useEffect, useRef, useState } from "react";
import { getIceServers } from "@/services/groupRideService";
import type { GroupSocket } from "@/services/socketService";
import { VoiceMesh } from "@/services/voiceMesh";
import type { GroupSession } from "@/types";
import type { VoicePeerInfo } from "@/types/comms";
import type { MicState, PeerLinkState } from "@/utils/voiceState";

const FALLBACK_ICE: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const RTT_POLL_MS = 6000;

interface Args {
  socket: GroupSocket | null;
  session: GroupSession | null;
}

/**
 * Push-to-talk voice over WebRTC, signalled through the EXISTING ride socket.
 * Audio goes peer-to-peer (VoiceMesh); this hook owns the microphone, the
 * mesh lifecycle, push-to-talk state and cleanup. Everything is released when
 * the ride socket goes away (leave / end ride / sign-out).
 */
export function useVoiceComms({ socket, session }: Args) {
  const [enabled, setEnabled] = useState(false);
  const [micState, setMicState] = useState<MicState>("idle");
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [roster, setRoster] = useState<VoicePeerInfo[]>([]);
  const [links, setLinks] = useState<Record<string, PeerLinkState>>({});
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rttMs, setRttMs] = useState<number | null>(null);
  const [socketUp, setSocketUp] = useState(false);

  const meshRef = useRef<VoiceMesh | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wantedRef = useRef(false);
  const enablingRef = useRef(false);
  const transmittingRef = useRef(false);
  const mutedRef = useRef(false);
  const audioEls = useRef(new Map<string, HTMLAudioElement>());

  const socketRef = useRef(socket);
  socketRef.current = socket;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const releaseTransmit = useCallback(
    (notifyServer: boolean) => {
      if (!transmittingRef.current) return;
      transmittingRef.current = false;
      setTransmitting(false);
      meshRef.current?.setTransmitting(false);
      if (notifyServer && socket?.connected) socket.emit("ptt:stop");
    },
    [socket]
  );

  const teardownVoice = useCallback(
    (notifyServer: boolean) => {
      releaseTransmit(false);
      wantedRef.current = false;
      meshRef.current?.close();
      meshRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (notifyServer && socket?.connected) socket.emit("voice:leave");
      mutedRef.current = false;
      setMicMuted(false);
      setEnabled(false);
      setLinks({});
      setStreams({});
      setRttMs(null);
    },
    [socket, releaseTransmit]
  );
  const teardownRef = useRef(teardownVoice);
  teardownRef.current = teardownVoice;

  const emitJoin = useCallback((s: GroupSocket) => {
    s.emit("voice:join", (ack) => {
      if (!ack.ok) {
        setError(ack.message ?? "Couldn't join voice.");
        teardownRef.current(false);
      }
    });
  }, []);

  const enableVoice = useCallback(async () => {
    const s = socket;
    const sess = session;
    if (!s || !sess || wantedRef.current || enablingRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState("unavailable");
      setError("This browser can't use the microphone (voice needs HTTPS and a supported browser).");
      return;
    }
    enablingRef.current = true;
    setMicState("requesting");
    setError(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") setMicState("denied");
        else if (name === "NotFoundError" || name === "OverconstrainedError") setMicState("unavailable");
        else {
          setMicState("error");
          setError("Couldn't start the microphone.");
        }
        return;
      }

      if (socketRef.current !== s) {
        stream.getTracks().forEach((t) => t.stop()); // ride changed while the permission prompt was open
        return;
      }
      for (const track of stream.getAudioTracks()) {
        track.enabled = false; // silent until push-to-talk is held
        track.onended = () => {
          setError("Microphone disconnected.");
          setMicState("error");
          teardownRef.current(true);
        };
      }
      streamRef.current = stream;
      wantedRef.current = true;
      setMicState("granted");

      let iceServers: RTCIceServer[] = FALLBACK_ICE;
      try {
        iceServers = (await getIceServers(sess)).iceServers;
      } catch {
        /* keep the public-STUN fallback */
      }
      if (streamRef.current !== stream || socketRef.current !== s) return;

      meshRef.current = new VoiceMesh({
        socket: s,
        selfId: sess.riderId,
        iceServers,
        localStream: stream,
        onRemoteStream: (id, remote) =>
          setStreams((prev) => {
            const next = { ...prev };
            if (remote) next[id] = remote;
            else delete next[id];
            return next;
          }),
        onLinkState: (id, state) =>
          setLinks((prev) => {
            const next = { ...prev };
            if (state) next[id] = state;
            else delete next[id];
            return next;
          }),
      });
      setEnabled(true);
      emitJoin(s);
    } finally {
      enablingRef.current = false;
    }
  }, [socket, session, emitJoin]);

  const retry = useCallback(() => {
    setMicState("idle");
    setError(null);
    void enableVoice();
  }, [enableVoice]);

  // ---- socket events (registered once per ride socket, removed on cleanup) ----
  useEffect(() => {
    if (!socket) {
      setSocketUp(false);
      return;
    }
    setSocketUp(socket.connected);

    const onConnect = () => {
      setSocketUp(true);
      if (wantedRef.current && streamRef.current) emitJoin(socket); // rejoin voice after a reconnect
    };
    const onDisconnect = () => {
      setSocketUp(false);
      releaseTransmit(false);
      meshRef.current?.closePeers(); // the server dropped our voice presence; rebuild on reconnect
      setRoster([]);
    };
    const onRoster = ({ peers }: { peers: VoicePeerInfo[] }) => {
      setRoster(peers);
      meshRef.current?.syncRoster(peers.map((p) => p.riderId));
    };
    const onReset = ({ riderId }: { riderId: string }) => meshRef.current?.resetPeer(riderId);
    const onOffer = ({ from, sdp }: { from: string; sdp: string }) => void meshRef.current?.handleOffer(from, sdp);
    const onAnswer = ({ from, sdp }: { from: string; sdp: string }) => void meshRef.current?.handleAnswer(from, sdp);
    const onIce = ({ from, candidate }: { from: string; candidate: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null; usernameFragment: string | null } }) =>
      void meshRef.current?.handleIce(from, candidate);
    const onTimeout = () => releaseTransmit(false);
    const onCommsError = (e: { message?: string }) => {
      if (e.message) setError(e.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("voice:roster", onRoster);
    socket.on("voice:peer-reset", onReset);
    socket.on("rtc:offer", onOffer);
    socket.on("rtc:answer", onAnswer);
    socket.on("rtc:ice", onIce);
    socket.on("ptt:timeout", onTimeout);
    socket.on("comms:error", onCommsError);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("voice:roster", onRoster);
      socket.off("voice:peer-reset", onReset);
      socket.off("rtc:offer", onOffer);
      socket.off("rtc:answer", onAnswer);
      socket.off("rtc:ice", onIce);
      socket.off("ptt:timeout", onTimeout);
      socket.off("comms:error", onCommsError);
      teardownRef.current(false); // ride socket gone: release the mic and every peer connection
      setRoster([]);
    };
  }, [socket, emitJoin, releaseTransmit]);

  // Never keep transmitting if the app goes to the background.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) releaseTransmit(true);
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [releaseTransmit]);

  // Light connection-quality sampling, only while voice is on.
  const peerLinkCount = Object.keys(links).length;
  useEffect(() => {
    if (!enabled || peerLinkCount === 0) return;
    const id = window.setInterval(() => {
      void meshRef.current?.getRoundTripMs().then(setRttMs);
    }, RTT_POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, peerLinkCount]);

  // ---- push-to-talk / mutes ----
  const startTalking = useCallback(() => {
    if (!socket || !wantedRef.current || mutedRef.current || transmittingRef.current || !socket.connected) return;
    meshRef.current?.setTransmitting(true);
    transmittingRef.current = true;
    setTransmitting(true);
    socket.emit("ptt:start");
    navigator.vibrate?.(15);
  }, [socket]);

  const stopTalking = useCallback(() => releaseTransmit(true), [releaseTransmit]);

  const toggleMicMute = useCallback(() => {
    if (!wantedRef.current) return;
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMicMuted(next);
    if (next) releaseTransmit(false);
    if (socket?.connected) socket.emit("voice:state", { muted: next });
  }, [socket, releaseTransmit]);

  const toggleSpeakerMute = useCallback(() => setSpeakerMuted((m) => !m), []);

  const disableVoice = useCallback(() => {
    teardownVoice(true);
    setMicState("idle");
  }, [teardownVoice]);

  // ---- remote audio element registry (browsers may block autoplay until a tap) ----
  const registerAudio = useCallback((id: string, el: HTMLAudioElement | null) => {
    if (el) audioEls.current.set(id, el);
    else audioEls.current.delete(id);
  }, []);
  const reportAudioBlocked = useCallback(() => setAudioBlocked(true), []);
  const reportAudioPlaying = useCallback(() => setAudioBlocked(false), []);
  const resumeAudio = useCallback(() => {
    for (const el of audioEls.current.values()) {
      void el.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
    }
  }, []);

  return {
    enabled,
    micState,
    micMuted,
    speakerMuted,
    transmitting,
    roster,
    links,
    streams,
    audioBlocked,
    error,
    rttMs,
    socketUp,
    enableVoice,
    retry,
    disableVoice,
    startTalking,
    stopTalking,
    toggleMicMute,
    toggleSpeakerMute,
    registerAudio,
    reportAudioBlocked,
    reportAudioPlaying,
    resumeAudio,
  };
}
