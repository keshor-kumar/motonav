import { API_BASE_URL, hasApiBaseUrl } from "@/config/env";
import { authHeader, request } from "@/services/groupRideService";

// ============================================================
// REST boundary for Moto Community. The backend is the source of truth;
// membership is verified server-side from the community token on every call.
// ============================================================

export interface CommunityInfo {
  code: string;
  name: string;
  description: string;
  memberCount: number;
}

export interface CommunitySessionData {
  community: CommunityInfo & { id: string };
  me: { id: string; name: string; isCreator: boolean };
  token: string;
}

export interface CommunityMessage {
  id: string;
  communityId: string;
  senderId: string;
  senderName: string;
  type: "text" | "audio";
  text: string | null;
  audioUrl: string | null;
  audioDurationMs: number | null;
  createdAt: string;
}

export const COMMUNITY_LIMITS = {
  textMax: 1000,
  audioMinMs: 700,
  audioMaxMs: 60_000,
} as const;

export function createCommunity(input: { name: string; description: string; riderName: string }): Promise<CommunitySessionData> {
  return request("/api/community", { method: "POST", body: JSON.stringify(input) });
}

export function getCommunityInfo(code: string): Promise<CommunityInfo> {
  return request(`/api/community/${encodeURIComponent(code.trim())}`);
}

export function joinCommunity(code: string, riderName: string, existingToken?: string): Promise<CommunitySessionData> {
  return request(`/api/community/${encodeURIComponent(code.trim())}/join`, {
    method: "POST",
    headers: authHeader(existingToken),
    body: JSON.stringify({ riderName }),
  });
}

export function getCommunitySession(code: string, token: string): Promise<CommunitySessionData> {
  return request(`/api/community/${encodeURIComponent(code)}/session`, { headers: authHeader(token) });
}

export function listCommunityMessages(
  code: string,
  token: string,
  opts: { before?: string; limit?: number } = {}
): Promise<{ messages: CommunityMessage[]; hasMore: boolean }> {
  const q = new URLSearchParams();
  if (opts.before) q.set("before", opts.before);
  if (opts.limit) q.set("limit", String(opts.limit));
  const qs = q.toString();
  return request(`/api/community/${encodeURIComponent(code)}/messages${qs ? `?${qs}` : ""}`, { headers: authHeader(token) });
}

/** Ask the backend for a fresh playable URL (the stored object path never expires; URLs do). */
export async function getCommunityAudioUrl(code: string, token: string, messageId: string): Promise<string> {
  const r = await request<{ url: string }>(`/api/community/${encodeURIComponent(code)}/messages/${encodeURIComponent(messageId)}/audio-url`, { headers: authHeader(token) });
  return r.url;
}

/** HTTP fallback used only when the socket is down. */
export function sendCommunityTextHttp(code: string, token: string, text: string): Promise<{ message: CommunityMessage }> {
  return request(`/api/community/${encodeURIComponent(code)}/messages`, { method: "POST", headers: authHeader(token), body: JSON.stringify({ text }) });
}

/**
 * Uploads one voice message: raw audio bytes -> backend -> Supabase Storage -> DB -> Socket.IO broadcast
 * (metadata + URL only). The audio never travels over the socket.
 */
export async function uploadCommunityAudio(code: string, token: string, blob: Blob, durationMs: number): Promise<CommunityMessage> {
  if (!hasApiBaseUrl) throw new Error("Voice messages aren't configured — the backend URL is missing (VITE_API_BASE_URL).");
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/community/${encodeURIComponent(code)}/audio`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": blob.type || "audio/webm",
        "X-Audio-Duration-Ms": String(Math.round(durationMs)),
      },
      body: blob,
    });
  } catch {
    throw new Error("Couldn't upload the voice message. Check the connection and try again.");
  }
  if (!res.ok) {
    let message = "Couldn't send the voice message.";
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      /* keep generic message */
    }
    throw new Error(message);
  }
  return ((await res.json()) as { message: CommunityMessage }).message;
}

/** The backend returns an API-relative path in the no-Supabase dev fallback; make it absolute. */
export function resolveAudioUrl(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("/") ? `${API_BASE_URL}${url}` : url;
}
