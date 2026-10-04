import { API_BASE_URL, hasApiBaseUrl } from "@/config/env";
import type { GroupMember, GroupRide, GroupSession, PublicRideInfo } from "@/types";

// ============================================================
// REST calls to the MotoNav backend for real group rides. No
// mock/local-only state here — the backend is the source of
// truth; this module is just the typed HTTP boundary to it.
// ============================================================

const NOT_CONFIGURED_MESSAGE =
  "Group rides aren't configured yet — the backend URL is missing (VITE_API_BASE_URL).";

export interface SessionResult {
  ride: GroupRide;
  me: GroupMember;
  members: GroupMember[];
  token: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!hasApiBaseUrl) throw new Error(NOT_CONFIGURED_MESSAGE);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    // Deliberately does NOT say "check your Wi-Fi" — the far more likely
    // cause is that VITE_API_BASE_URL is wrong or the backend isn't running,
    // not the rider's own network. See GroupRideContext's connection status
    // UI for a "Retry connection" affordance tied to this exact failure.
    throw new Error("Unable to connect to the MotoNav server. The server may be offline or misconfigured.");
  }

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface CreateRidePayload {
  rideName: string;
  riderName: string;
  destination: string;
  destinationLatitude: number;
  destinationLongitude: number;
}

export function createGroupRide(payload: CreateRidePayload): Promise<SessionResult> {
  return request<SessionResult>("/api/rides", { method: "POST", body: JSON.stringify(payload) });
}

/** Ride summary shown on the join page, before joining — never includes any rider's coordinates. */
export function getPublicRideInfo(rideCode: string): Promise<PublicRideInfo> {
  return request<PublicRideInfo>(`/api/rides/${encodeURIComponent(rideCode.trim())}`);
}

/** Joins by code. Pass an existing session token to safely re-join the same ride without creating a duplicate rider. */
export function joinGroupRide(rideCode: string, riderName: string, existingToken?: string): Promise<SessionResult> {
  return request<SessionResult>(`/api/rides/${encodeURIComponent(rideCode.trim())}/join`, {
    method: "POST",
    headers: authHeader(existingToken),
    body: JSON.stringify({ riderName }),
  });
}

export function getGroupRideState(
  session: GroupSession
): Promise<{ ride: GroupRide; me: GroupMember; members: GroupMember[] }> {
  return request("/api/session", { headers: authHeader(session.token) });
}

export function leaveGroupRide(session: GroupSession): Promise<{ ok: true }> {
  return request("/api/session/leave", { method: "POST", headers: authHeader(session.token) });
}

export function endGroupRide(session: GroupSession): Promise<{ ride: GroupRide }> {
  return request("/api/session/end", { method: "POST", headers: authHeader(session.token) });
}
