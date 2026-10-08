import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CommsController,
  MAX_PTT_MS,
  parseIceCandidate,
  parseQuickMessage,
  parseSessionDescription,
  type CommsContext,
  type CommsTransport,
} from "../src/comms.js";

interface Sent {
  scope: "ride" | "rider";
  rideId: string;
  riderId?: string;
  event: string;
  payload: any;
}

const A1 = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const A2 = "aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa";
const A3 = "aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa";
const B1 = "bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb";

const ctx = (rideId: string, riderId: string, name: string): CommsContext => ({ rideId, riderId, name });
const SDP = "v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\n";

function setup(opts: { max?: number; offline?: string[] } = {}) {
  const sent: Sent[] = [];
  const timers: { fn: () => void; ms: number; cancelled: boolean }[] = [];
  let t = 1_000_000;
  const transport: CommsTransport = {
    toRide: (rideId, event, payload) => void sent.push({ scope: "ride", rideId, event, payload }),
    toRider: (rideId, riderId, event, payload) => {
      if (opts.offline?.includes(riderId)) return false;
      sent.push({ scope: "rider", rideId, riderId, event, payload });
      return true;
    },
  };
  const comms = new CommsController(transport, {
    now: () => t,
    schedule: (fn, ms) => {
      const entry = { fn, ms, cancelled: false };
      timers.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    getLocation: async (_r, riderId) => (riderId === A1 ? { latitude: 13.08, longitude: 80.27 } : null),
    maxVoiceParticipants: opts.max,
  });
  return { comms, sent, timers, advance: (ms: number) => (t += ms) };
}

const lastRoster = (sent: Sent[], rideId: string) => [...sent].reverse().find((s) => s.event === "voice:roster" && s.rideId === rideId)?.payload.peers;

test("joining voice broadcasts the roster to the ride and acks with current peers", () => {
  const { comms, sent } = setup();
  assert.equal(comms.joinVoice(ctx("R1", A1, "Arun")).ok, true);
  const ack = comms.joinVoice(ctx("R1", A2, "Rahul"));
  assert.equal(ack.ok, true);
  assert.deepEqual(ack.peers?.map((p) => p.name).sort(), ["Arun", "Rahul"]);
  assert.equal(lastRoster(sent, "R1").length, 2);
});

test("voice rosters are isolated per ride", () => {
  const { comms, sent } = setup();
  comms.joinVoice(ctx("R1", A1, "Arun"));
  comms.joinVoice(ctx("R2", B1, "Zed"));
  assert.deepEqual(lastRoster(sent, "R1").map((p: any) => p.name), ["Arun"]);
  assert.deepEqual(lastRoster(sent, "R2").map((p: any) => p.name), ["Zed"]);
  assert.ok(sent.filter((s) => s.rideId === "R1").every((s) => JSON.stringify(s.payload).includes("Zed") === false));
});

test("voice participant cap is enforced (and re-joining doesn't count twice)", () => {
  const { comms } = setup({ max: 2 });
  comms.joinVoice(ctx("R1", A1, "A"));
  comms.joinVoice(ctx("R1", A2, "B"));
  const full = comms.joinVoice(ctx("R1", A3, "C"));
  assert.equal(full.ok, false);
  assert.equal(full.code, "voice_full");
  assert.equal(comms.joinVoice(ctx("R1", A1, "A")).ok, true);
});

test("re-joining announces a peer reset so others rebuild their connection", () => {
  const { comms, sent } = setup();
  comms.joinVoice(ctx("R1", A1, "Arun"));
  comms.joinVoice(ctx("R1", A1, "Arun"));
  assert.ok(sent.some((s) => s.event === "voice:peer-reset" && s.payload.riderId === A1));
});

test("signalling is relayed only to the addressed rider with a server-set sender", () => {
  const { comms, sent } = setup();
  comms.joinVoice(ctx("R1", A1, "Arun"));
  comms.joinVoice(ctx("R1", A2, "Rahul"));
  const ack = comms.relay(ctx("R1", A1, "Arun"), "rtc:offer", { to: A2, sdp: SDP });
  assert.equal(ack.ok, true);
  const relayed = sent.filter((s) => s.event === "rtc:offer");
  assert.equal(relayed.length, 1);
  assert.equal(relayed[0].riderId, A2);
  assert.equal(relayed[0].payload.from, A1); // not client-supplied
});

test("a rider cannot signal a rider in a DIFFERENT ride", () => {
  const { comms, sent } = setup();
  comms.joinVoice(ctx("R1", A1, "Arun"));
  comms.joinVoice(ctx("R2", B1, "Zed"));
  const ack = comms.relay(ctx("R1", A1, "Arun"), "rtc:offer", { to: B1, sdp: SDP });
  assert.equal(ack.ok, false);
  assert.equal(ack.code, "peer_unavailable");
  assert.equal(sent.filter((s) => s.event === "rtc:offer").length, 0);
});

test("signalling requires the sender AND the target to be in voice", () => {
  const { comms } = setup();
  comms.joinVoice(ctx("R1", A2, "Rahul"));
  assert.equal(comms.relay(ctx("R1", A1, "Arun"), "rtc:offer", { to: A2, sdp: SDP }).code, "not_in_voice");
  comms.joinVoice(ctx("R1", A1, "Arun"));
  assert.equal(comms.relay(ctx("R1", A1, "Arun"), "rtc:offer", { to: A3, sdp: SDP }).code, "peer_unavailable");
  assert.equal(comms.relay(ctx("R1", A1, "Arun"), "rtc:offer", { to: A1, sdp: SDP }).ok, false); // self
});

test("relay reports an offline target instead of failing silently", () => {
  const { comms } = setup({ offline: [A2] });
  comms.joinVoice(ctx("R1", A1, "Arun"));
  comms.joinVoice(ctx("R1", A2, "Rahul"));
  assert.equal(comms.relay(ctx("R1", A1, "Arun"), "rtc:answer", { to: A2, sdp: SDP }).code, "peer_unavailable");
});

test("malformed signalling payloads are rejected", () => {
  assert.throws(() => parseSessionDescription(null));
  assert.throws(() => parseSessionDescription({ to: A2, sdp: "not sdp" }));
  assert.throws(() => parseSessionDescription({ to: A2, sdp: "v=0" + "x".repeat(20_000) }));
  assert.throws(() => parseSessionDescription({ to: "../etc", sdp: SDP }));
  assert.throws(() => parseIceCandidate({ to: A2, candidate: { candidate: "x".repeat(3000) } }));
  assert.throws(() => parseIceCandidate({ to: A2, candidate: { candidate: "c", sdpMLineIndex: -1 } }));
  assert.throws(() => parseIceCandidate({ to: A2, candidate: { candidate: "c", sdpMid: 5 } }));
  assert.equal(parseIceCandidate({ to: A2, candidate: { candidate: "", sdpMid: "0", sdpMLineIndex: 0 } }).candidate.usernameFragment, null);
});

test("push-to-talk: requires voice, sets speaking, clears on stop, blocked while muted", () => {
  const { comms, sent } = setup();
  assert.equal(comms.startSpeaking(ctx("R1", A1, "Arun")).code, "not_in_voice");
  comms.joinVoice(ctx("R1", A1, "Arun"));
  comms.startSpeaking(ctx("R1", A1, "Arun"));
  assert.equal(lastRoster(sent, "R1")[0].speaking, true);
  comms.stopSpeaking(ctx("R1", A1, "Arun"));
  assert.equal(lastRoster(sent, "R1")[0].speaking, false);
  comms.setMuted(ctx("R1", A1, "Arun"), { muted: true });
  assert.equal(comms.startSpeaking(ctx("R1", A1, "Arun")).ok, false);
  assert.equal(comms.setMuted(ctx("R1", A1, "Arun"), { muted: "yes" }).ok, false);
});

test("muting while transmitting stops transmission", () => {
  const { comms, sent } = setup();
  comms.joinVoice(ctx("R1", A1, "Arun"));
  comms.startSpeaking(ctx("R1", A1, "Arun"));
  comms.setMuted(ctx("R1", A1, "Arun"), { muted: true });
  const p = lastRoster(sent, "R1")[0];
  assert.equal(p.speaking, false);
  assert.equal(p.muted, true);
});

test("a stuck push-to-talk is auto-released by the watchdog and the rider is told", () => {
  const { comms, sent, timers } = setup();
  comms.joinVoice(ctx("R1", A1, "Arun"));
  comms.startSpeaking(ctx("R1", A1, "Arun"));
  const watchdog = timers.find((t) => !t.cancelled)!;
  assert.equal(watchdog.ms, MAX_PTT_MS);
  watchdog.fn();
  assert.equal(lastRoster(sent, "R1")[0].speaking, false);
  assert.ok(sent.some((s) => s.event === "ptt:timeout" && s.riderId === A1));
});

test("disconnect clears voice presence and speaking state for everyone", () => {
  const { comms, sent } = setup();
  comms.joinVoice(ctx("R1", A1, "Arun"));
  comms.joinVoice(ctx("R1", A2, "Rahul"));
  comms.startSpeaking(ctx("R1", A1, "Arun"));
  comms.onDisconnect(ctx("R1", A1, "Arun"));
  assert.deepEqual(lastRoster(sent, "R1").map((p: any) => p.riderId), [A2]);
  comms.onDisconnect(ctx("R1", A1, "Arun")); // idempotent
});

test("ending a ride forgets its voice state", () => {
  const { comms } = setup();
  comms.joinVoice(ctx("R1", A1, "Arun"));
  comms.removeRide("R1");
  assert.deepEqual(comms.roster("R1"), []);
});

test("quick messages: only whitelisted kinds, sender name + location come from the server", async () => {
  const { comms, sent } = setup();
  assert.throws(() => parseQuickMessage({ kind: "rm -rf" }));
  assert.equal((await comms.sendQuickMessage(ctx("R1", A1, "Arun"), { kind: "bogus" })).ok, false);
  const ack = await comms.sendQuickMessage(ctx("R1", A1, "Arun"), { kind: "hazard", name: "Spoofed", riderId: "x", rideId: "R2" });
  assert.equal(ack.ok, true);
  const msg = sent.find((s) => s.event === "comms:message")!;
  assert.equal(msg.rideId, "R1"); // client-supplied rideId ignored
  assert.equal(msg.payload.name, "Arun"); // client-supplied name ignored
  assert.equal(msg.payload.riderId, A1);
  assert.equal(msg.payload.kind, "hazard");
  assert.deepEqual(msg.payload.location, { latitude: 13.08, longitude: 80.27 });
  assert.match(msg.payload.id, /^[0-9a-f-]{36}$/);
});

test("quick messages are rate-limited per rider but not across riders", async () => {
  const { comms, advance } = setup();
  assert.equal((await comms.sendQuickMessage(ctx("R1", A1, "Arun"), { kind: "fuel" })).ok, true);
  const again = await comms.sendQuickMessage(ctx("R1", A1, "Arun"), { kind: "break" });
  assert.equal(again.code, "throttled");
  assert.equal((await comms.sendQuickMessage(ctx("R1", A2, "Rahul"), { kind: "break" })).ok, true);
  advance(1100);
  assert.equal((await comms.sendQuickMessage(ctx("R1", A1, "Arun"), { kind: "break" })).ok, true);
});

test("a failing location lookup never blocks a message", async () => {
  const sent: Sent[] = [];
  const comms = new CommsController(
    { toRide: (rideId, event, payload) => void sent.push({ scope: "ride", rideId, event, payload }), toRider: () => true },
    { getLocation: async () => { throw new Error("db down"); } }
  );
  assert.equal((await comms.sendQuickMessage(ctx("R1", A1, "Arun"), { kind: "emergency" })).ok, true);
  assert.equal(sent[0].payload.location, null);
});
