import { useCallback, useState } from "react";

export type VoiceStatus = "connected" | "connecting" | "offline";

// Stage 1: UI-only mock of a push-to-talk voice channel.
// Stage 2+ will connect this to a real WebRTC/voice backend.
export function useVoiceChannel() {
  const [status] = useState<VoiceStatus>("connected");
  const [isMuted, setIsMuted] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);

  const startTalking = useCallback(() => setIsTransmitting(true), []);
  const stopTalking = useCallback(() => setIsTransmitting(false), []);
  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

  return { status, isMuted, isTransmitting, startTalking, stopTalking, toggleMute };
}
