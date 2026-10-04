import type { MusicState, Track } from "@/types";

const queueTracks: Track[] = [
  { id: "t-2", title: "Highway Dust", artist: "The Roadrunners", album: "Open Throttle", durationSec: 214, artColor: "#FFB627" },
  { id: "t-3", title: "Wide Open Sky", artist: "Nomad Radio", album: "Wide Open Sky", durationSec: 198, artColor: "#2DD4BF" },
  { id: "t-4", title: "Chrome & Rust", artist: "Diesel Hearts", album: "Chrome & Rust", durationSec: 241, artColor: "#8A7CFF" },
];

export const mockMusicState: MusicState = {
  currentTrack: { id: "t-1", title: "Ride or Die", artist: "The Roadrunners", album: "Open Throttle", durationSec: 227, artColor: "#FF6A33" },
  queue: queueTracks,
  isPlaying: true,
  progressSec: 74,
  volume: 68,
  isGroupSynced: true,
  syncedListenerCount: 3,
};
