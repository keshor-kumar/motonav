import { test } from "node:test";
import assert from "node:assert/strict";
import { RideService } from "../src/service.js";
import { MemoryStore } from "../src/memoryStore.js";
import { AppError, type Auth, type SessionClaims } from "../src/types.js";
import { generateRideCode } from "../src/rideCode.js";

const auth: Auth = {
  sign: (c: SessionClaims) => Buffer.from(JSON.stringify(c)).toString("base64"),
  verify: (t: string) => {
    try { return JSON.parse(Buffer.from(t, "base64").toString()) as SessionClaims; } catch { return null; }
  },
};

const rideBody = {
  rideName: "Chennai to Ooty Ride",
  riderName: "Sathagan",
  destination: "Ooty",
  destinationLatitude: 11.41,
  destinationLongitude: 76.69,
};

function setup(now = () => Date.now()) {
  const store = new MemoryStore();
  return { store, svc: new RideService(store, auth, now) };
}

async function rejects(p: Promise<unknown>, code: string) {
  await assert.rejects(p, (e: unknown) => e instanceof AppError && e.code === code, `expected ${code}`);
}

test("ride codes are 6 unambiguous chars", () => {
  for (let i = 0; i < 200; i++) assert.match(generateRideCode(), /^[A-HJKMNP-Z2-9]{6}$/);
});

test("create ride returns code, token, creator as member and stored destination", async () => {
  const { svc } = setup();
  const r = await svc.createRide(rideBody);
  assert.match(r.ride.rideCode, /^[A-Z0-9]{6}$/);
  assert.ok(r.token);
  assert.equal(r.me.isCreator, true);
  assert.equal(r.ride.destinationLatitude, 11.41);
});

test("create ride rejects bad input", async () => {
  const { svc } = setup();
  await rejects(svc.createRide({ ...rideBody, destinationLatitude: 999 }), "invalid_input");
  await rejects(svc.createRide({ ...rideBody, riderName: "   " }), "invalid_input");
  await rejects(svc.createRide(null), "invalid_input");
});

test("public info exposes no rider coordinates", async () => {
  const { svc } = setup();
  const r = await svc.createRide(rideBody);
  const info = await svc.getPublicInfo(r.ride.rideCode.toLowerCase());
  assert.deepEqual(Object.keys(info).sort(), ["destination", "memberCount", "rideCode", "rideName", "status"]);
});

test("join: normalizes case/whitespace, rejects duplicate names, unknown/malformed codes", async () => {
  const { svc } = setup();
  const r = await svc.createRide(rideBody);
  const j = await svc.join(` ${r.ride.rideCode.toLowerCase()} `, { riderName: "Rahul" });
  assert.equal(j.members.length, 2);
  await rejects(svc.join(r.ride.rideCode, { riderName: "rahul" }), "duplicate_name");
  await rejects(svc.join("ZZZZZZ", { riderName: "X" }), "ride_not_found");
  await rejects(svc.join("../etc", { riderName: "X" }), "invalid_input");
});

test("re-joining with a valid token does not create a duplicate rider", async () => {
  const { svc } = setup();
  const r = await svc.createRide(rideBody);
  const a = await svc.join(r.ride.rideCode, { riderName: "Rahul" });
  const b = await svc.join(r.ride.rideCode, { riderName: "Rahul" }, a.token);
  assert.equal(b.me.riderId, a.me.riderId);
  assert.equal(b.members.length, 2);
});

test("a token for ride A cannot act in ride B", async () => {
  const { svc } = setup();
  const a = await svc.createRide(rideBody);
  const b = await svc.createRide({ ...rideBody, rideName: "Other" });
  const forged: SessionClaims = { riderId: a.me.riderId, rideId: b.ride.id, rideCode: b.ride.rideCode };
  await rejects(svc.getState(auth.sign(forged)), "not_member");
  await rejects(svc.getState("garbage"), "unauthorized");
  await rejects(svc.getState(undefined), "unauthorized");
});

test("location: validated, stored as latest only, throttled, speed carried through", async () => {
  let t = 1_000_000;
  const { svc, store } = setup(() => t);
  const r = await svc.createRide(rideBody);
  const fix = { latitude: 13.08, longitude: 80.27, heading: 90, speed: 12 };
  const m = await svc.applyLocation(r.ride.id, r.me.riderId, fix);
  assert.equal(m.latitude, 13.08);
  assert.equal(m.speed, 12);
  assert.equal(m.connectionStatus, "connected");
  await rejects(svc.applyLocation(r.ride.id, r.me.riderId, fix), "throttled");
  t += 1500;
  await svc.applyLocation(r.ride.id, r.me.riderId, { ...fix, latitude: 13.09 });
  await rejects(svc.applyLocation(r.ride.id, r.me.riderId, { ...fix, latitude: 200 }), "invalid_input");
  assert.equal([...store.members.values()].length, 1);
  assert.equal([...store.members.values()][0].latitude, 13.09);
});

test("only the creator can end the ride; ending wipes positions and blocks joins", async () => {
  let t = 5_000_000;
  const { svc, store } = setup(() => t);
  const r = await svc.createRide(rideBody);
  const j = await svc.join(r.ride.rideCode, { riderName: "Rahul" });
  await svc.applyLocation(r.ride.id, j.me.riderId, { latitude: 1, longitude: 2, heading: null, speed: null });
  await rejects(svc.end(j.token), "forbidden");
  const ended = await svc.end(r.token);
  t += 2000;
  assert.equal(ended.status, "ended");
  assert.ok([...store.members.values()].every((m) => m.latitude === null && m.longitude === null));
  await rejects(svc.join(r.ride.rideCode, { riderName: "Arun" }), "ride_ended");
  await rejects(svc.applyLocation(r.ride.id, j.me.riderId, { latitude: 1, longitude: 2, heading: null, speed: null }), "forbidden");
});

test("leaving wipes location, removes from active list, ride stays active, name freed", async () => {
  const { svc, store } = setup();
  const r = await svc.createRide(rideBody);
  const j = await svc.join(r.ride.rideCode, { riderName: "Rahul" });
  await svc.applyLocation(r.ride.id, j.me.riderId, { latitude: 1, longitude: 2, heading: null, speed: null });
  const out = await svc.leave(j.token);
  assert.equal(out.rideEnded, false);
  const left = await store.getMember(r.ride.id, j.me.riderId);
  assert.equal(left?.latitude, null);
  const state = await svc.getState(r.token);
  assert.equal(state.members.length, 1);
  await rejects(svc.getState(j.token), "not_member");
  await rejects(svc.applyLocation(r.ride.id, j.me.riderId, { latitude: 1, longitude: 2, heading: null, speed: null }), "forbidden");
  await svc.join(r.ride.rideCode, { riderName: "Rahul" });
});

test("last rider leaving ends the ride", async () => {
  const { svc } = setup();
  const r = await svc.createRide(rideBody);
  const out = await svc.leave(r.token);
  assert.equal(out.rideEnded, true);
});

test("connection status transitions", async () => {
  const { svc } = setup();
  const r = await svc.createRide(rideBody);
  assert.equal((await svc.setConnected(r.ride.id, r.me.riderId))?.connectionStatus, "connected");
  assert.equal((await svc.setDisconnected(r.ride.id, r.me.riderId))?.connectionStatus, "disconnected");
});
