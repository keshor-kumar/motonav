import type { Namespace, Server, Socket } from "socket.io";
import { AppError } from "../types.js";
import type { CommunityService } from "./service.js";
import type { CommunityHub } from "./types.js";

interface CommunitySocketData {
  communityId: string;
  memberId: string;
  name: string;
}

export const COMMUNITY_NAMESPACE = "/community";
const room = (communityId: string) => `community:${communityId}`;

function errorPayload(err: unknown) {
  if (err instanceof AppError) return { code: err.code, message: err.message };
  return { code: "internal", message: "Something went wrong." };
}

/**
 * Moto Community realtime. Lives in its OWN Socket.IO namespace ("/community") on the same server,
 * so ride rooms ("ride:<id>"), ride auth and ride events are completely unaffected. A socket only joins
 * "community:<communityId>" after its community token verifies AND the DB confirms membership; the
 * community and sender are always taken from that verified identity, never from event payloads.
 */
export function attachCommunity(io: Server, service: CommunityService): CommunityHub {
  const ns: Namespace = io.of(COMMUNITY_NAMESPACE);

  ns.use(async (socket, next) => {
    try {
      const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : undefined;
      const { community, member } = await service.authorize(token);
      (socket.data as CommunitySocketData) = { communityId: community.id, memberId: member.id, name: member.name };
      next();
    } catch (err) {
      const e = new Error(errorPayload(err).message) as Error & { data?: unknown };
      e.data = errorPayload(err);
      next(e);
    }
  });

  ns.on("connection", async (socket: Socket) => {
    const d = socket.data as CommunitySocketData;
    await socket.join(room(d.communityId));
    let lastTypingAt = 0;

    // Explicit (re)join — idempotent. Auto-join on connect already happened; this lets a client confirm after reconnect.
    socket.on("community:join", async (ack?: unknown) => {
      try {
        await service.authorize(socket.handshake.auth.token as string); // re-check membership
        await socket.join(room(d.communityId));
        if (typeof ack === "function") ack({ ok: true, communityId: d.communityId });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, ...errorPayload(err) });
      }
    });

    socket.on("community:leave", () => {
      void socket.leave(room(d.communityId));
      socket.disconnect(true);
    });

    socket.on("community:message", async (payload: unknown, ack?: unknown) => {
      try {
        const text = typeof payload === "object" && payload !== null ? (payload as { text?: unknown }).text : undefined;
        const message = await service.sendText({ communityId: d.communityId, memberId: d.memberId }, text);
        if (typeof ack === "function") ack({ ok: true, message });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, ...errorPayload(err) });
        else socket.emit("community:error", errorPayload(err));
      }
    });

    socket.on("community:typing", (payload: unknown) => {
      const now = Date.now();
      if (now - lastTypingAt < 1500) return; // throttle
      lastTypingAt = now;
      const typing = typeof payload === "object" && payload !== null && (payload as { typing?: unknown }).typing === true;
      socket.to(room(d.communityId)).emit("community:typing", { memberId: d.memberId, name: d.name, typing });
    });
  });

  return {
    // Broadcast carries metadata + a signed URL only — never audio bytes.
    message: (communityId, msg) => void ns.to(room(communityId)).emit(msg.type === "audio" ? "community:audio-message" : "community:message", msg),
    memberJoined: (communityId, info) => void ns.to(room(communityId)).emit("community:member-joined", info),
  };
}
