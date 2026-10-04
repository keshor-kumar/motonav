import { useCallback, useEffect, useState } from "react";
import type { MusicState, Track } from "@/types";
import { mockMusicState } from "@/data/music";

// Stage 1: local UI-only playback state — no audio is actually decoded or
// streamed anywhere. The progress bar just ticks forward on a timer for a
// believable mock; Stage 2+ will replace this with a real synced player.
export function useMusicPlayer(initial: MusicState = mockMusicState) {
  const [state, setState] = useState<MusicState>(initial);

  const togglePlay = useCallback(() => {
    setState((s) => ({ ...s, isPlaying: !s.isPlaying }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState((s) => ({ ...s, volume }));
  }, []);

  const seek = useCallback((progressSec: number) => {
    setState((s) => ({ ...s, progressSec }));
  }, []);

  const skipNext = useCallback(() => {
    setState((s) => {
      if (s.queue.length === 0) return s;
      const [next, ...rest] = s.queue;
      const nextTrack: Track = next;
      return { ...s, currentTrack: nextTrack, queue: [...rest, s.currentTrack], progressSec: 0 };
    });
  }, []);

  const skipPrevious = useCallback(() => {
    // Mirrors skipNext: rotates the mock queue backwards so Previous always
    // moves to a different track rather than just resetting progress.
    setState((s) => {
      if (s.queue.length === 0) return s;
      const prevTrack: Track = s.queue[s.queue.length - 1];
      const restOfQueue = s.queue.slice(0, -1);
      return { ...s, currentTrack: prevTrack, queue: [s.currentTrack, ...restOfQueue], progressSec: 0 };
    });
  }, []);

  // Mock playback clock: advances progress once a second while "playing",
  // and auto-advances to the next mock track when the current one "ends".
  useEffect(() => {
    if (!state.isPlaying) return;
    const interval = setInterval(() => {
      setState((s) => {
        if (!s.isPlaying) return s;
        if (s.progressSec + 1 >= s.currentTrack.durationSec) {
          if (s.queue.length === 0) return { ...s, progressSec: s.currentTrack.durationSec, isPlaying: false };
          const [next, ...rest] = s.queue;
          return { ...s, currentTrack: next, queue: [...rest, s.currentTrack], progressSec: 0 };
        }
        return { ...s, progressSec: s.progressSec + 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.isPlaying]);

  return { state, togglePlay, setVolume, seek, skipNext, skipPrevious };
}
