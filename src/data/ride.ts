import type { RideInfo, RouteInfo } from "@/types";

// Mock "active ride" and route data for the Stage 1 dashboard.
export const mockRide: RideInfo = {
  id: "MN-7X2K9Q",
  name: "Coastal Highway Run",
  leaderName: "Aarav Shetty",
  startLocation: "Bengaluru, Karnataka",
  destination: "Gokarna, Karnataka",
  date: "2026-09-06",
  memberCount: 4,
  inviteLink: "https://motonav.app/join/MN-7X2K9Q",
  status: "active",
};

export const mockRoute: RouteInfo = {
  originName: "Bengaluru",
  destinationName: "Gokarna",
  distanceKm: 483,
  durationMin: 552,
  etaLabel: "6:42 PM",
  trafficLevel: "moderate",
  nextTurn: "Keep right toward NH 48",
  nextTurnDistanceM: 800,
};
