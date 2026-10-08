import { createContext, useContext, useMemo, type ReactNode } from "react";
import RemoteAudio from "@/components/comms/RemoteAudio";
import { useGroupRide } from "@/context/GroupRideContext";
import { useQuickMessages } from "@/hooks/useQuickMessages";
import { useVoiceComms } from "@/hooks/useVoiceComms";
import type { CommsStatus } from "@/types/comms";
import {
  deriveVoiceUiState,
  peerCommsStatus,
  voiceQuality,
  type VoiceQuality,
  type VoiceUiState,
} from "@/utils/voiceState";

type Voice = ReturnType<typeof useVoiceComms>;
type Quick = ReturnType<typeof useQuickMessages>;

export interface CommsPeer {
  riderId: string;
  name: string;
  status: CommsStatus;
}

interface RideCommsValue {
  inRide: boolean;
  voice: Voice & {
    uiState: VoiceUiState;
    /** Names of riders currently transmitting (excluding me). */
    speakerNames: string[];
    peers: CommsPeer[];
    quality: VoiceQuality;
  };
  quick: Quick;
  /** How a rider should appear in the rider list; null = not in voice. */
  commsStatusFor: (riderId: string) => CommsStatus | null;
}

const RideCommsContext = createContext<RideCommsValue | undefined>(undefined);

/**
 * Rider Comms for the active ride: push-to-talk voice + quick messages, both on
 * the existing ride socket. Mounted at app level so voice keeps working while
 * riders move between pages; everything is released when the ride session ends.
 */
export function RideCommsProvider({ children }: { children: ReactNode }) {
  const { socket, session, isConnected } = useGroupRide();
  const selfId = session?.riderId ?? null;
  const voice = useVoiceComms({ socket, session });
  const quick = useQuickMessages({ socket, selfId });
  const inRide = Boolean(session && socket);

  const value = useMemo<RideCommsValue>(() => {
    const others = voice.roster.filter((p) => p.riderId !== selfId);
    const connectedPeerCount = others.filter((p) => voice.links[p.riderId] === "connected").length;
    const speakers = others.filter((p) => p.speaking);
    const peers: CommsPeer[] = others.map((p) => ({
      riderId: p.riderId,
      name: p.name,
      status: peerCommsStatus(p, voice.links[p.riderId], voice.enabled),
    }));
    const uiState = deriveVoiceUiState({
      inRide,
      enabled: voice.enabled,
      micState: voice.micState,
      socketUp: voice.socketUp && isConnected,
      micMuted: voice.micMuted,
      transmitting: voice.transmitting,
      remoteSpeakerCount: speakers.length,
      peerCount: others.length,
      connectedPeerCount,
    });
    const commsStatusFor = (riderId: string): CommsStatus | null => {
      if (riderId === selfId) {
        if (!voice.enabled) return null;
        if (!voice.socketUp) return "reconnecting";
        if (voice.transmitting) return "speaking";
        return voice.micMuted ? "muted" : "connected";
      }
      return peers.find((p) => p.riderId === riderId)?.status ?? null;
    };
    return {
      inRide,
      voice: {
        ...voice,
        uiState,
        speakerNames: speakers.map((p) => p.name),
        peers,
        quality: voiceQuality(voice.rttMs, others.length, connectedPeerCount),
      },
      quick,
      commsStatusFor,
    };
  }, [voice, quick, selfId, inRide, isConnected]);

  return (
    <RideCommsContext.Provider value={value}>
      {children}
      {Object.entries(voice.streams).map(([id, stream]) => (
        <RemoteAudio
          key={id}
          id={id}
          stream={stream}
          muted={voice.speakerMuted}
          register={voice.registerAudio}
          onBlocked={voice.reportAudioBlocked}
          onPlaying={voice.reportAudioPlaying}
        />
      ))}
    </RideCommsContext.Provider>
  );
}

export function useRideComms(): RideCommsValue {
  const ctx = useContext(RideCommsContext);
  if (!ctx) throw new Error("useRideComms must be used within a RideCommsProvider");
  return ctx;
}
