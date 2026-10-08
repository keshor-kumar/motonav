import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  createGroupRide,
  endGroupRide,
  joinGroupRide,
  leaveGroupRide,
  type CreateRidePayload,
} from "@/services/groupRideService";
import { connectRideSocket, sendLocationUpdate, type GroupSocket } from "@/services/socketService";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineMeters } from "@/utils/geo";
import type { Coordinates, GroupMember, GroupRide, GroupSession } from "@/types";

// ============================================================
// Owns the real Stage 3 group-ride session: REST create/join,
// the Socket.IO connection and its events, and throttled live GPS
// broadcasting while a ride is active. The backend is the only
// source of truth for ride/member state — this just mirrors it.
// ============================================================

const SESSION_STORAGE_KEY = "motonav.groupSession";

// GPS broadcast throttling: send when the rider has moved a meaningful
// distance OR enough time has passed (so others still see a fresh
// "last updated" even while stationary at a fuel stop) — never on every
// watchPosition tick.
const BROADCAST_MIN_DISTANCE_M = 15;
const BROADCAST_MIN_INTERVAL_MS = 4000;
const BROADCAST_HEARTBEAT_MS = 15000;

function readStoredSession(): GroupSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GroupSession) : null;
  } catch {
    return null;
  }
}

interface GroupRideContextValue {
  session: GroupSession | null;
  ride: GroupRide | null;
  members: GroupMember[];
  myCoords: Coordinates | null;
  myHeading: number | null;
  isConnected: boolean;
  /** The one ride socket (null when not in a ride). Rider comms attach to this — no second connection. */
  socket: GroupSocket | null;
  isBusy: boolean;
  error: string | null;
  rideEndedNotice: boolean;
  createRide: (payload: CreateRidePayload) => Promise<GroupRide>;
  joinRide: (rideCode: string, riderName: string) => Promise<GroupRide>;
  leaveRide: () => Promise<void>;
  endRide: () => Promise<void>;
  clearError: () => void;
  acknowledgeRideEnded: () => void;
  /** Forces an immediate reconnect attempt (socket.io-client already retries
   *  automatically with backoff — this is for a visible "Retry connection"
   *  button so the rider isn't just waiting on a timer). */
  retryConnection: () => void;
}

const GroupRideContext = createContext<GroupRideContextValue | undefined>(undefined);

export function GroupRideProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<GroupSession | null>(() => readStoredSession());
  const [ride, setRide] = useState<GroupRide | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<GroupSocket | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rideEndedNotice, setRideEndedNotice] = useState(false);

  const geo = useGeolocation();
  const socketRef = useRef<GroupSocket | null>(null);
  const lastSentRef = useRef<{ coords: Coordinates; at: number } | null>(null);

  useEffect(() => {
    try {
      if (session) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* localStorage may be unavailable — non-fatal */
    }
  }, [session]);

  const clearError = useCallback(() => setError(null), []);
  const acknowledgeRideEnded = useCallback(() => setRideEndedNotice(false), []);

  const teardown = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setSocket(null);
    geo.stopWatching();
    lastSentRef.current = null;
    setIsConnected(false);
    setRide(null);
    setMembers([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- socket lifecycle: connect whenever we have a session, tear down when we don't ----
  useEffect(() => {
    if (!session) {
      teardown();
      return;
    }

    const socket = connectRideSocket(session.token);
    socketRef.current = socket;
    setSocket(socket);

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("ride:state", (state) => {
      setRide(state.ride);
      setMembers(state.members);
    });
    socket.on("member:update", (member) => {
      setMembers((prev) => {
        const idx = prev.findIndex((m) => m.riderId === member.riderId);
        if (idx === -1) return [...prev, member];
        const next = [...prev];
        next[idx] = member;
        return next;
      });
    });
    socket.on("member:left", ({ riderId }) => {
      setMembers((prev) => prev.filter((m) => m.riderId !== riderId));
    });
    socket.on("ride:ended", () => {
      setRide((r) => (r ? { ...r, status: "ended" } : r));
      setRideEndedNotice(true);
      setSession(null); // also tears the socket down via the effect re-running
    });
    socket.on("session:left", () => setSession(null));
    socket.on("session:replaced", () => setSession(null));
    socket.on("server:error", (err) => setError(err.message));
    socket.on("connect_error", (err) => setError(err.message || "Couldn't connect to the ride server."));

    geo.startWatching();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
      setSocket((current) => (current === socket ? null : current));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ---- throttled live GPS broadcast while a ride is active ----
  useEffect(() => {
    if (!session || !geo.coords || !socketRef.current?.connected) return;
    const now = Date.now();
    const last = lastSentRef.current;
    const movedEnough = !last || haversineMeters(last.coords, geo.coords) >= BROADCAST_MIN_DISTANCE_M;
    const dueForHeartbeat = !last || now - last.at >= BROADCAST_HEARTBEAT_MS;
    if (!movedEnough && !dueForHeartbeat) return;
    if (last && now - last.at < BROADCAST_MIN_INTERVAL_MS) return;

    lastSentRef.current = { coords: geo.coords, at: now };
    sendLocationUpdate(socketRef.current, {
      latitude: geo.coords.lat,
      longitude: geo.coords.lng,
      heading: geo.heading,
      speed: geo.speed,
    }).catch((err: Error) => setError(err.message));
  }, [session, geo.coords, geo.heading, geo.speed]);

  const createRide = useCallback(async (payload: CreateRidePayload): Promise<GroupRide> => {
    setIsBusy(true);
    setError(null);
    try {
      const result = await createGroupRide(payload);
      setSession({ token: result.token, rideCode: result.ride.rideCode, riderId: result.me.riderId, riderName: result.me.name });
      setRide(result.ride);
      setMembers(result.members);
      return result.ride;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't create the ride.";
      setError(message);
      throw err;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const joinRide = useCallback(async (rideCode: string, riderName: string): Promise<GroupRide> => {
    setIsBusy(true);
    setError(null);
    try {
      const result = await joinGroupRide(rideCode, riderName);
      setSession({ token: result.token, rideCode: result.ride.rideCode, riderId: result.me.riderId, riderName: result.me.name });
      setRide(result.ride);
      setMembers(result.members);
      return result.ride;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't join the ride.";
      setError(message);
      throw err;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const leaveRide = useCallback(async () => {
    if (!session) return;
    setIsBusy(true);
    try {
      await leaveGroupRide(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't leave the ride.");
    } finally {
      setSession(null);
      setIsBusy(false);
    }
  }, [session]);

  const retryConnection = useCallback(() => {
    setError(null);
    socketRef.current?.connect();
  }, []);

  const endRide = useCallback(async () => {
    if (!session) return;
    setIsBusy(true);
    try {
      await endGroupRide(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't end the ride.");
    } finally {
      setSession(null);
      setIsBusy(false);
    }
  }, [session]);

  const value: GroupRideContextValue = {
    session,
    ride,
    members,
    myCoords: geo.coords,
    myHeading: geo.heading,
    isConnected,
    socket,
    isBusy,
    error,
    rideEndedNotice,
    createRide,
    joinRide,
    leaveRide,
    endRide,
    clearError,
    acknowledgeRideEnded,
    retryConnection,
  };

  return <GroupRideContext.Provider value={value}>{children}</GroupRideContext.Provider>;
}

export function useGroupRide() {
  const ctx = useContext(GroupRideContext);
  if (!ctx) throw new Error("useGroupRide must be used within a GroupRideProvider");
  return ctx;
}
