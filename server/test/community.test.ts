import { test } from "node:test";
import assert from "node:assert/strict";
import { CommunityService, generateCommunityCode } from "../src/community/service.js";
import { MemoryCommunityStore } from "../src/community/memoryStore.js";
import { MemoryAudioStorage, SupabaseAudioStorage } from "../src/community/storage.js";
import { AppError } from "../src/types.js";
import type { CommunityAuth, CommunityClaims, PublicMessage } from "../src/community/types.js";
import { baseAudioMime, cleanMessageText, looksLikeAudio } from "../src/community/validation.js";

const auth: CommunityAuth = {
  sign: (c: CommunityClaims) => Buffer.from(JSON.stringify(c)).toString("base64"),
  verify: (t: string) => {
    try { const o = JSON.parse(Buffer.from(t, "base64").toString()); return o.memberId && o.communityId ? o : null; } catch { return null; }
  },
};

function setup(now = () => Date.now()) {
  const store = new MemoryCommunityStore();
  const storage = new MemoryAudioStorage();
  const svc = new CommunityService(store, auth, storage, now);
  const events: PublicMessage[] = [];
  const joins: Array<{ name: string; memberCount: number }> = [];
  svc.hub = { message: (_c, m) => void events.push(m), memberJoined: (_c, i) => void joins.push(i) };
  return { store, storage, svc, events, joins };
}
const rejects = (p: Promise<unknown>, code: string) =>
  assert.rejects(p, (e: unknown) => e instanceof AppError && e.code === code, `expected ${code}`);

const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(2000, 7)]);
const ctxOf = (s: { community: { id: string }; me: { id: string } }) => ({ communityId: s.community.id, memberId: s.me.id });

test("community codes look like MN<name><digits>", () => {
  for (let i = 0; i < 100; i++) assert.match(generateCommunityCode("Chennai Riders"), /^MNCHENNAIR\d{2}$/);
  assert.match(generateCommunityCode("!!"), /^MN[A-Z0-9]{6}$/);
  assert.match(generateCommunityCode("x y", 4), /^MN[A-Z0-9]{6}$/);
});

test("create returns a unique code, token, creator and member count 1", async () => {
  const { svc } = setup();
  const s = await svc.create({ name: "Chennai Riders", description: "Weekend runs", riderName: "Sath" });
  assert.match(s.community.code, /^MN[A-Z0-9]{3,14}$/);
  assert.equal(s.community.memberCount, 1);
  assert.equal(s.me.isCreator, true);
  const info = await svc.getPublicInfo(s.community.code.toLowerCase());
  assert.equal(info.name, "Chennai Riders");
  assert.equal(info.memberCount, 1);
  assert.equal("id" in info, false); // public info does not leak internal ids
});

test("create validates name / description / rider name", async () => {
  const { svc } = setup();
  await rejects(svc.create({ name: "x", riderName: "A" }), "invalid_input");
  await rejects(svc.create({ name: "OK name", riderName: "" }), "invalid_input");
  await rejects(svc.create({ name: "OK name", riderName: "A", description: "d".repeat(201) }), "invalid_input");
  await rejects(svc.create(null), "invalid_input");
});

test("two communities with the same name get different codes", async () => {
  const { svc } = setup();
  const codes = new Set<string>();
  for (let i = 0; i < 30; i++) codes.add((await svc.create({ name: "Riders", riderName: "A" })).community.code);
  assert.equal(codes.size, 30);
});

test("join: validates code, rejects unknown, normalises, blocks duplicate names, counts members", async () => {
  const { svc, joins } = setup();
  const c = await svc.create({ name: "Goa Gang", riderName: "Owner" });
  await rejects(svc.join("nope", { riderName: "B" }), "invalid_input");
  await rejects(svc.join("MNZZZZ99", { riderName: "B" }), "not_found");
  const j = await svc.join(` ${c.community.code.toLowerCase()} `, { riderName: "Bhavna" });
  assert.equal(j.community.memberCount, 2);
  assert.deepEqual(joins, [{ name: "Bhavna", memberCount: 2 }]);
  await rejects(svc.join(c.community.code, { riderName: "bhavna" }), "name_taken");
  await rejects(svc.join(c.community.code, {}), "invalid_input");
});

test("rejoining with an existing token resumes the same member (no duplicate)", async () => {
  const { svc } = setup();
  const c = await svc.create({ name: "Goa Gang", riderName: "Owner" });
  const j = await svc.join(c.community.code, { riderName: "Bhavna" });
  const again = await svc.join(c.community.code, { riderName: "Whatever" }, j.token);
  assert.equal(again.me.id, j.me.id);
  assert.equal(again.community.memberCount, 2);
});

test("a token from one community can't be used in another", async () => {
  const { svc } = setup();
  const a = await svc.create({ name: "Alpha", riderName: "A" });
  const b = await svc.create({ name: "Bravo", riderName: "B" });
  await rejects(svc.getSession(a.token, b.community.code), "forbidden");
  await rejects(svc.listMessages(a.token, b.community.code, undefined, undefined), "forbidden");
  await rejects(svc.getSession(undefined), "unauthorized");
  await rejects(svc.getSession("garbage"), "unauthorized");
  // joining B with A's token must create a NEW member in B, not reuse A's identity
  const j = await svc.join(b.community.code, { riderName: "A-in-B" }, a.token);
  assert.notEqual(j.me.id, a.me.id);
});

test("a deleted/unknown member can't act even with a well-formed token", async () => {
  const { svc } = setup();
  const a = await svc.create({ name: "Alpha", riderName: "A" });
  const ghost = auth.sign({ memberId: "11111111-1111-1111-1111-111111111111", communityId: a.community.id });
  await rejects(svc.getSession(ghost), "not_member");
  await rejects(svc.sendText({ communityId: a.community.id, memberId: "nope" }, "hi"), "not_member");
});

test("text: stored, broadcast once, sender fields come from the verified member", async () => {
  const { svc, events } = setup();
  const s = await svc.create({ name: "Alpha", riderName: "Asha" });
  const m = await svc.sendText(ctxOf(s), "  Ride at 6am  ");
  assert.equal(m.text, "Ride at 6am");
  assert.equal(m.senderName, "Asha");
  assert.equal(m.senderId, s.me.id);
  assert.equal(m.type, "text");
  assert.equal(m.audioUrl, null);
  assert.equal(events.length, 1);
  assert.equal(events[0].id, m.id);
});

test("text validation: empty, whitespace, too long, control chars", async () => {
  const { svc, events } = setup();
  const s = await svc.create({ name: "Alpha", riderName: "Asha" });
  await rejects(svc.sendText(ctxOf(s), ""), "invalid_input");
  await rejects(svc.sendText(ctxOf(s), "   \n\t "), "invalid_input");
  await rejects(svc.sendText(ctxOf(s), "x".repeat(1001)), "invalid_input");
  await rejects(svc.sendText(ctxOf(s), 42), "invalid_input");
  await rejects(svc.sendText(ctxOf(s), "\u0000\u0007"), "invalid_input");
  assert.equal(events.length, 0);
  assert.equal(cleanMessageText("a\n\n\n\n\nb"), "a\n\nb");
  assert.equal((await svc.sendText(ctxOf(s), "x".repeat(1000))).text?.length, 1000);
});

test("markup is stored verbatim (escaping is the renderer's job) — never executed server side", async () => {
  const { svc } = setup();
  const s = await svc.create({ name: "Alpha", riderName: "Asha" });
  const m = await svc.sendText(ctxOf(s), "<img src=x onerror=alert(1)>");
  assert.equal(m.text, "<img src=x onerror=alert(1)>");
});

test("text rate limit: burst is throttled, then recovers", async () => {
  let t = 1_000_000;
  const { svc } = setup(() => t);
  const s = await svc.create({ name: "Alpha", riderName: "Asha" });
  for (let i = 0; i < 12; i++) await svc.sendText(ctxOf(s), `m${i}`);
  await rejects(svc.sendText(ctxOf(s), "one too many"), "rate_limited");
  t += 11_000;
  await svc.sendText(ctxOf(s), "fine again");
});

test("history: oldest->newest page, cursor paging, no cross-community leakage, members only", async () => {
  const { svc, store } = setup();
  const a = await svc.create({ name: "Alpha", riderName: "Asha" });
  const b = await svc.create({ name: "Bravo", riderName: "Bo" });
  // insert directly with controlled timestamps
  for (let i = 0; i < 7; i++) {
    store.messages.push({
      id: `m${i}`, communityId: a.community.id, memberId: a.me.id, senderName: "Asha", type: "text", text: `msg ${i}`,
      audioPath: null, audioDurationMs: null, audioMime: null, audioSizeBytes: null, createdAt: new Date(1_700_000_000_000 + i * 1000).toISOString(),
    });
  }
  await svc.sendText(ctxOf(b), "secret of bravo");
  const p1 = await svc.listMessages(a.token, a.community.code, undefined, 3);
  assert.deepEqual(p1.messages.map((m) => m.text), ["msg 4", "msg 5", "msg 6"]);
  assert.equal(p1.hasMore, true);
  const p2 = await svc.listMessages(a.token, a.community.code, p1.messages[0].createdAt, 3);
  assert.deepEqual(p2.messages.map((m) => m.text), ["msg 1", "msg 2", "msg 3"]);
  const p3 = await svc.listMessages(a.token, a.community.code, p2.messages[0].createdAt, 3);
  assert.deepEqual(p3.messages.map((m) => m.text), ["msg 0"]);
  assert.equal(p3.hasMore, false);
  assert.ok(![...p1.messages, ...p2.messages, ...p3.messages].some((m) => m.text === "secret of bravo"));
  await rejects(svc.listMessages(a.token, a.community.code, "not-a-date", 3), "invalid_input");
  await rejects(svc.listMessages(undefined, a.community.code, undefined, 3), "unauthorized");
});

test("audio: happy path stores bytes, DB row has a path (not bytes), broadcast has URL + metadata only", async () => {
  const { svc, storage, events, store } = setup();
  const s = await svc.create({ name: "Alpha", riderName: "Asha" });
  const m = await svc.sendAudio(ctxOf(s), { data: WEBM, contentType: "audio/webm;codecs=opus", durationMs: "4200" });
  assert.equal(m.type, "audio");
  assert.equal(m.audioDurationMs, 4200);
  assert.equal(m.text, null);
  assert.match(m.audioUrl ?? "", /^\/api\/community\/audio\/.+\.webm$/);
  assert.equal(storage.files.size, 1);
  const row = store.messages[0];
  assert.equal(row.audioMime, "audio/webm");
  assert.equal(row.audioSizeBytes, WEBM.length);
  assert.ok(row.audioPath && row.audioPath.startsWith(s.community.id + "/"));
  assert.equal(events.length, 1);
  assert.ok(!JSON.stringify(events[0]).includes("\u001a")); // no bytes in the broadcast
  const hist = await svc.listMessages(s.token, s.community.code, undefined, 10);
  assert.equal(hist.messages[0].audioUrl, m.audioUrl);
});

test("audio rejects: bad type, not-audio bytes, empty, too big, too short, too long, non-member", async () => {
  const { svc, storage, events } = setup();
  const s = await svc.create({ name: "Alpha", riderName: "Asha" });
  const c = ctxOf(s);
  await rejects(svc.sendAudio(c, { data: WEBM, contentType: "application/pdf", durationMs: 3000 }), "unsupported_media");
  await rejects(svc.sendAudio(c, { data: WEBM, contentType: undefined, durationMs: 3000 }), "unsupported_media");
  await rejects(svc.sendAudio(c, { data: Buffer.from("<html>not audio at all</html>"), contentType: "audio/webm", durationMs: 3000 }), "unsupported_media");
  await rejects(svc.sendAudio(c, { data: Buffer.alloc(0), contentType: "audio/webm", durationMs: 3000 }), "invalid_input");
  await rejects(svc.sendAudio(c, { data: Buffer.concat([WEBM, Buffer.alloc(2_000_001)]), contentType: "audio/webm", durationMs: 3000 }), "payload_too_large");
  await rejects(svc.sendAudio(c, { data: WEBM, contentType: "audio/webm", durationMs: 100 }), "invalid_input");
  await rejects(svc.sendAudio(c, { data: WEBM, contentType: "audio/webm", durationMs: 90_000 }), "invalid_input");
  await rejects(svc.sendAudio(c, { data: WEBM, contentType: "audio/webm", durationMs: "abc" }), "invalid_input");
  await rejects(svc.sendAudio({ communityId: s.community.id, memberId: "x" }, { data: WEBM, contentType: "audio/webm", durationMs: 3000 }), "not_member");
  assert.equal(storage.files.size, 0);
  assert.equal(events.length, 0);
});

test("audio: storage failure stores nothing and broadcasts nothing", async () => {
  const { events, store } = setup();
  const failing = new CommunityService(store, auth, { put: async () => { throw new AppError("storage_unavailable", 503, "down"); }, signedUrl: async () => "" });
  failing.hub = { message: (_c, m) => void events.push(m), memberJoined() {} };
  const s = await failing.create({ name: "Alpha", riderName: "Asha" });
  await rejects(failing.sendAudio(ctxOf(s), { data: WEBM, contentType: "audio/webm", durationMs: 3000 }), "storage_unavailable");
  assert.equal(store.messages.length, 0);
  assert.equal(events.length, 0);
});

test("audio rate limit", async () => {
  let t = 5_000_000;
  const { svc } = setup(() => t);
  const s = await svc.create({ name: "Alpha", riderName: "Asha" });
  for (let i = 0; i < 6; i++) await svc.sendAudio(ctxOf(s), { data: WEBM, contentType: "audio/webm", durationMs: 2000 });
  await rejects(svc.sendAudio(ctxOf(s), { data: WEBM, contentType: "audio/webm", durationMs: 2000 }), "rate_limited");
  t += 61_000;
  await svc.sendAudio(ctxOf(s), { data: WEBM, contentType: "audio/webm", durationMs: 2000 });
});

test("history survives a storage signing failure (audioUrl null, page still loads)", async () => {
  const { store } = setup();
  let failSign = false;
  const svc = new CommunityService(store, auth, { put: async () => {}, signedUrl: async () => { if (failSign) throw new Error("boom"); return "https://x/y"; } });
  const s = await svc.create({ name: "Alpha", riderName: "Asha" });
  await svc.sendText(ctxOf(s), "hello");
  await svc.sendAudio(ctxOf(s), { data: WEBM, contentType: "audio/webm", durationMs: 2000 });
  failSign = true;
  const h = await svc.listMessages(s.token, s.community.code, undefined, 10);
  assert.equal(h.messages.length, 2);
  assert.equal(h.messages[1].audioUrl, null);
});

test("audio mime/magic helpers", () => {
  assert.equal(baseAudioMime("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(baseAudioMime("AUDIO/MP4"), "audio/mp4");
  assert.equal(baseAudioMime("video/webm"), null);
  assert.equal(baseAudioMime("text/html"), null);
  assert.equal(looksLikeAudio(Buffer.concat([Buffer.from("OggS"), Buffer.alloc(20)])), true);
  assert.equal(looksLikeAudio(Buffer.concat([Buffer.alloc(4), Buffer.from("ftypM4A "), Buffer.alloc(20)])), true);
  assert.equal(looksLikeAudio(Buffer.concat([Buffer.from("RIFF0000WAVE"), Buffer.alloc(20)])), true);
  assert.equal(looksLikeAudio(Buffer.from("#!/bin/sh\nrm -rf /\n....")), false);
  assert.equal(looksLikeAudio(Buffer.from("%PDF-1.7 some pdf bytes")), false);
});

test("Supabase storage: uploads with service key server-side, signs URLs, maps failures", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const f = (async (url: string | URL, init: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/object/sign/")) return new Response(JSON.stringify({ signedURL: "/object/sign/community-audio/c1/a%20b.webm?token=T" }), { status: 200 });
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  const st = new SupabaseAudioStorage({ url: "https://proj.supabase.co/", serviceRoleKey: "SRK", bucket: "community-audio", fetchImpl: f });
  await st.put("c1/a b.webm", Buffer.from("x"), "audio/webm");
  assert.equal(calls[0].url, "https://proj.supabase.co/storage/v1/object/community-audio/c1/a%20b.webm");
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer SRK");
  assert.equal((calls[0].init.headers as Record<string, string>)["x-upsert"], "false");
  const url = await st.signedUrl("c1/a b.webm");
  assert.equal(url, "https://proj.supabase.co/storage/v1/object/sign/community-audio/c1/a%20b.webm?token=T");
  assert.ok(!url.includes("SRK")); // the service key is never part of a URL handed to browsers

  const bad = new SupabaseAudioStorage({ url: "https://p.supabase.co", serviceRoleKey: "K", bucket: "b", fetchImpl: (async () => new Response("Bucket not found", { status: 404 })) as unknown as typeof fetch });
  await rejects(bad.put("a/b.webm", Buffer.from("x"), "audio/webm"), "storage_unavailable");
  const down = new SupabaseAudioStorage({ url: "https://p.supabase.co", serviceRoleKey: "K", bucket: "b", fetchImpl: (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch });
  await rejects(down.put("a/b.webm", Buffer.from("x"), "audio/webm"), "storage_unavailable");
});

test("audio URL: DB keeps only the path; a fresh URL is minted on demand, member-only, community-scoped", async () => {
  let n = 0;
  const store = new MemoryCommunityStore();
  const svc = new CommunityService(store, auth, { put: async () => {}, signedUrl: async (p: string) => `https://signed.example/${p}?t=${++n}` });
  const a = await svc.create({ name: "Alpha", riderName: "Asha" });
  const b = await svc.create({ name: "Bravo", riderName: "Bo" });
  const m = await svc.sendAudio(ctxOf(a), { data: WEBM, contentType: "audio/webm", durationMs: 3000 });
  const stored = (await store.listMessages(a.community.id, null, 5))[0];
  assert.ok(stored.audioPath && !/^https?:/.test(stored.audioPath), "stores a path, not a URL");
  const u1 = await svc.getAudioUrl(a.token, a.community.code, m.id);
  const u2 = await svc.getAudioUrl(a.token, a.community.code, m.id);
  assert.notEqual(u1.url, u2.url, "each call mints a fresh URL");
  await rejects(svc.getAudioUrl(b.token, b.community.code, m.id), "not_found"); // message ids are community-scoped
  await rejects(svc.getAudioUrl(b.token, a.community.code, m.id), "forbidden"); // token for another community
  await rejects(svc.getAudioUrl(undefined, a.community.code, m.id), "unauthorized");
  await rejects(svc.getAudioUrl(a.token, a.community.code, "nope"), "not_found");
});
