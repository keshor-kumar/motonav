import type { CommsStatus, VoicePeerInfo } from "@/types/comms";

export type MicState = "idle" | "requesting" | "granted" | "denied" | "unavailable" | "error";
export type PeerLinkState = "connecting" | "connected" | "reconnecting" | "failed";

export type VoiceUiState =
  | "no-ride"
  | "off"
  | "requesting"
  | "denied"
  | "unavailable"
  | "error"
  | "disconnected"
  | "connecting"
  | "connected"
  | "transmitting"
  | "speaking"
  | "muted";

export interface VoiceUiInput {
  inRide: boolean;
  enabled: boolean;
  micState: MicState;
  socketUp: boolean;
  micMuted: boolean;
  transmitting: boolean;
  remoteSpeakerCount: number;
  peerCount: number;
  connectedPeerCount: number;
}

/** One place that decides what the push-to-talk control should show. */
export function deriveVoiceUiState(i: VoiceUiInput): VoiceUiState {
  if (!i.inRide) return "no-ride";
  if (i.micState === "requesting") return "requesting";
  if (i.micState === "denied") return "denied";
  if (i.micState === "unavailable") return "unavailable";
  if (!i.enabled) return i.micState === "error" ? "error" : "off";
  if (!i.socketUp) return "disconnected";
  if (i.transmitting) return "transmitting";
  if (i.remoteSpeakerCount > 0) return "speaking";
  if (i.micMuted) return "muted";
  if (i.peerCount > 0 && i.connectedPeerCount === 0) return "connecting";
  return "connected";
}

/** How another rider appears in the rider list (null = not in voice). */
export function peerCommsStatus(peer: VoicePeerInfo, link: PeerLinkState | undefined, iAmInVoice: boolean): CommsStatus {
  if (peer.speaking) return "speaking";
  if (peer.muted) return "muted";
  if (!iAmInVoice) return "connected";
  if (link === "connected") return "connected";
  if (link === "reconnecting" || link === "failed") return "reconnecting";
  return "connecting";
}

export type VoiceQuality = "good" | "fair" | "poor" | "unknown";

export function voiceQuality(rttMs: number | null, peerCount: number, connectedPeerCount: number): VoiceQuality {
  if (peerCount === 0) return "unknown";
  if (connectedPeerCount < peerCount) return connectedPeerCount === 0 ? "poor" : "fair";
  if (rttMs === null) return "good";
  if (rttMs < 150) return "good";
  if (rttMs < 350) return "fair";
  return "poor";
}
