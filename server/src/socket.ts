import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import type { Config } from "./config.js";
import type { Hub } from "./hub.js";
import type { RideService } from "./service.js";
import { AppError } from "./types.js";
import { CommsController, type CommsContext } from "./comms.js";
import type { CommsAck } from "./commsTypes.js";
import { attachCommunity } from "./community/socket.js";
import type { CommunityService } from "./community/service.js";

interface SocketData {
  rideId: string;
  riderId: string;
  name: string;
}

const room = (rideId: string) => `ride:${rideId}`;
const key = (rideId: string, riderId: string) => `${rideId}:${riderId}`;

function errorPayload(err: unknown) {
  if (err instanceof AppError) return { code: err.code, message: err.message };
  return { code: "internal", message: "Something went wrong." };
}

/**
 * Realtime layer. A socket only joins a ride's room after its JWT verifies
 * AND the DB confirms active membership; every rider in a ride joins the
 * SAME room ("ride:<rideId>"), so location broadcasts reach everyone in
 * that ride and nobody else. One live socket per rider — a newer
 * connection replaces the older one, so reconnects never create a
 * duplicate rider session.
 */
export function attachRealtime(
  httpServer: HttpServer,
  service: RideService,
  config: Config,
  community?: CommunityService
): { hub: Hub; close: () => Promise<void> } {
  const io = new Server(httpServer, {
    cors: { origin: config.clientOrigins },
    pingInterval: 10_000, // heartbeat: detects dead connections within ~18s
    pingTimeout: 8_000,
    maxHttpBufferSize: 64_000, // WebRTC session descriptions are a few KB; still tightly bounded
  });

  // Moto Community uses its own namespace ("/community"); the ride namespace below is untouched.
  if (community) community.hub = attachCommunity(io, community);

  const live = new Map<string, Socket>();

  // Rider communications (voice signalling + PTT + quick messages) ride on this same
  // server, socket connection and ride room — no second realtime system.
  const comms = new CommsController(
    {
      toRide: (rideId, event, payload) => void io.to(room(rideId)).emit(event, payload),
      toRider: (rideId, riderId, event, payload) => {
        const target = live.get(key(rideId, riderId));
        if (!target) return false;
        target.emit(event, payload);
        return true;
      },
    },
    {
      getLocation: async (rideId, riderId) => {
        const m = await service.getPublicMember(rideId, riderId);
        return m && m.latitude !== null && m.longitude !== null ? { latitude: m.latitude, longitude: m.longitude } : null;
      },
    }
  );
  const reply = (ack: unknown, result: CommsAck) => {
    if (typeof ack === "function") ack(result);
  };

  io.use(async (socket, next) => {
    try {
      const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : undefined;
      const { ride, claims, member } = await service.authorize(token);
      if (ride.status !== "active") throw new AppError("ride_ended", 410, "This ride has ended.");
      (socket.data as SocketData) = { rideId: ride.id, riderId: claims.riderId, name: member.name };
      next();
    } catch (err) {
      const e = new Error(errorPayload(err).message) as Error & { data?: unknown };
      e.data = errorPayload(err);
      next(e);
    }
  });

  io.on("connection", async (socket) => {
    const { rideId, riderId, name } = socket.data as SocketData;
    const k = key(rideId, riderId);
    const commsCtx: CommsContext = { rideId, riderId, name };

    const previous = live.get(k);
    if (previous && previous.id !== socket.id) {
      previous.emit("session:replaced");
      previous.disconnect(true);
    }
    live.set(k, socket);
    await socket.join(room(rideId));

    try {
      const me = await service.setConnected(rideId, riderId);
      if (me) io.to(room(rideId)).emit("member:update", me);
      const state = await service.getState(socket.handshake.auth.token as string);
      socket.emit("ride:state", state);
    } catch (err) {
      socket.emit("server:error", errorPayload(err));
    }

    socket.on("location:update", async (payload: unknown, ack?: (r: unknown) => void) => {
      try {
        const member = await service.applyLocation(rideId, riderId, payload);
        io.to(room(rideId)).emit("member:update", member);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, ...errorPayload(err) });
      }
    });

    // ---- rider communications: ride/rider come from the verified socket, never the payload ----
    // Handlers of a socket that has been replaced by a newer connection are ignored.
    const current = () => live.get(k) === socket;
    socket.emit("voice:roster", { peers: comms.roster(rideId) });
    socket.on("voice:join", (ack?: unknown) => {
      if (current()) reply(ack, comms.joinVoice(commsCtx));
    });
    socket.on("voice:leave", () => {
      if (current()) comms.leaveVoice(commsCtx);
    });
    const surface = (res: CommsAck) => {
      if (!res.ok) socket.emit("comms:error", { code: res.code, message: res.message });
    };
    socket.on("voice:state", (payload: unknown) => {
      if (current()) surface(comms.setMuted(commsCtx, payload));
    });
    socket.on("ptt:start", () => {
      if (current()) surface(comms.startSpeaking(commsCtx));
    });
    socket.on("ptt:stop", () => {
      if (current()) surface(comms.stopSpeaking(commsCtx));
    });
    socket.on("rtc:offer", (payload: unknown, ack?: unknown) => {
      if (current()) reply(ack, comms.relay(commsCtx, "rtc:offer", payload));
    });
    socket.on("rtc:answer", (payload: unknown, ack?: unknown) => {
      if (current()) reply(ack, comms.relay(commsCtx, "rtc:answer", payload));
    });
    socket.on("rtc:ice", (payload: unknown) => {
      if (current()) comms.relay(commsCtx, "rtc:ice", payload);
    });
    socket.on("comms:message", async (payload: unknown, ack?: unknown) => {
      if (current()) reply(ack, await comms.sendQuickMessage(commsCtx, payload));
    });

    socket.on("disconnect", async () => {
      if (live.get(k) !== socket) return; // replaced by a newer socket — not a real disconnect
      live.delete(k);
      comms.onDisconnect(commsCtx);
      try {
        const m = await service.setDisconnected(rideId, riderId);
        if (m) io.to(room(rideId)).emit("member:update", m);
      } catch (err) {
        console.error("[socket] failed to mark disconnected:", err);
      }
    });
  });

  const hub: Hub = {
    memberUpdated: (rideId, member) => void io.to(room(rideId)).emit("member:update", member),
    memberLeft: (rideId, riderId) => {
      comms.removeRider(rideId, riderId);
      io.to(room(rideId)).emit("member:left", { riderId });
      const s = live.get(key(rideId, riderId));
      if (s) {
        live.delete(key(rideId, riderId));
        s.emit("session:left");
        s.disconnect(true);
      }
    },
    rideEnded: (rideId, endedAt) => {
      comms.removeRide(rideId);
      io.to(room(rideId)).emit("ride:ended", { endedAt });
      for (const [k, s] of live) {
        if (k.startsWith(`${rideId}:`)) {
          live.delete(k);
          s.disconnect(true);
        }
      }
    },
  };

  return { hub, close: () => new Promise((resolve) => void io.close(() => resolve())) };
}
