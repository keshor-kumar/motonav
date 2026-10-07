// Stage 1: mock, in-memory "service" functions.
// Stage 2+ will replace these bodies with real API/WebSocket
// calls while keeping the same function signatures, so pages
// and hooks that depend on this file will not need to change.

import { mockRide } from "@/data/ride";
import type { RideInfo } from "@/types";

export interface CreateRidePayload {
  name: string;
  leaderName: string;
  startLocation: string;
  destination: string;
  date: string;
}

function randomRideId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "MN-";
  for (let i = 0; i < 7; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function createRide(payload: CreateRidePayload): Promise<RideInfo> {
  const id = randomRideId();
  return {
    id,
    name: payload.name || "Untitled Ride",
    leaderName: payload.leaderName || "You",
    startLocation: payload.startLocation || "Current location",
    destination: payload.destination || "Destination",
    date: payload.date || new Date().toISOString().slice(0, 10),
    memberCount: 1,
    inviteLink: `https://motonav.app/join/${id}`,
    status: "not-started",
  };
}

export async function joinRide(rideId: string): Promise<RideInfo | null> {
  const cleaned = rideId.trim().toUpperCase();
  if (cleaned.length < 4) return null;
  // Mock: any reasonably-formed code "succeeds" and returns the demo ride.
  return { ...mockRide, id: cleaned };
}

export async function getActiveRide(): Promise<RideInfo> {
  return mockRide;
}
