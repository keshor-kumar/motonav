import { test } from "node:test";
import assert from "node:assert/strict";
import { categorize, normalizeArticles, NewsService } from "../src/news.js";
import { AppError } from "../src/types.js";

const raw = {
  articles: [
    { title: "Royal Enfield launches new Himalayan 450 variant", description: "<p>Priced at ₹2.9 lakh</p>", url: "https://a.example/1?utm=x", urlToImage: "https://img.example/1.jpg", publishedAt: "2026-10-05T10:00:00Z", source: { name: "BikeDekho" } },
    { title: "MotoGP: Bagnaia takes pole in Japan", description: "Qualifying report", url: "https://b.example/2", urlToImage: "javascript:alert(1)", publishedAt: "2026-10-06T10:00:00Z", source: { name: "Motorsport" } },
    { title: "[Removed]", description: "[Removed]", url: "https://removed.com", publishedAt: "2026-10-06T10:00:00Z", source: { name: "x" } },
    { title: "Duplicate", description: "d", url: "https://a.example/1", publishedAt: "2026-10-01T10:00:00Z", source: { name: "x" } },
    { title: "No url", description: "d", url: "ftp://nope", publishedAt: "2026-10-01T10:00:00Z", source: { name: "x" } },
    { title: "Helmet law changes aim to improve rider safety", description: "", url: "https://c.example/3", urlToImage: null, publishedAt: "bad-date", source: {} },
    { title: "Zero launches electric motorcycle range update", description: "", url: "https://d.example/4", publishedAt: "2026-10-04T10:00:00Z", source: { name: "EV" } },
    null,
  ],
};

test("categorize", () => {
  assert.equal(categorize("MotoGP qualifying report", ""), "MotoGP/Racing");
  assert.equal(categorize("Helmet safety standards tighten", ""), "Safety");
  assert.equal(categorize("Ather unveils electric scooter", ""), "EV Motorcycles");
  assert.equal(categorize("Africa Twin gets touring update", ""), "Adventure/Touring");
  assert.equal(categorize("Royal Enfield unveils Classic 650", ""), "New Bikes");
  assert.equal(categorize("Traction control and radar explained", ""), "Motorcycle Technology");
  assert.equal(categorize("Hero MotoCorp sales in India rise", "monthly dispatches"), "India/Local");
  assert.equal(categorize("A pleasant Sunday", "nothing"), "Latest");
});

test("normalize: shape, html stripped, unsafe urls dropped, dupes/removed filtered, newest first", () => {
  const out = normalizeArticles(raw);
  assert.deepEqual(out.map((a) => a.title), [
    "MotoGP: Bagnaia takes pole in Japan",
    "Royal Enfield launches new Himalayan 450 variant",
    "Zero launches electric motorcycle range update",
    "Helmet law changes aim to improve rider safety",
  ]);
  const re = out.find((a) => a.url.startsWith("https://a.example/1"))!;
  assert.equal(re.description, "Priced at ₹2.9 lakh");
  assert.equal(re.image, "https://img.example/1.jpg");
  assert.equal(out[0].image, null); // javascript: image rejected
  assert.deepEqual(Object.keys(re).sort(), ["category", "description", "image", "publishedAt", "source", "title", "url"]);
  assert.equal(out.at(-1)!.source, "News");
  assert.equal(normalizeArticles(null).length, 0);
  assert.equal(normalizeArticles({ articles: "x" }).length, 0);
});

function svc(opts: { key?: string; handler: (url: URL, init: RequestInit) => Response | Promise<Response>; now?: () => number }) {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const s = new NewsService({
    apiKey: opts.key ?? "SECRET",
    now: opts.now,
    fetchImpl: (async (u: URL, init: RequestInit) => { calls.push({ url: u, init }); return opts.handler(u, init); }) as unknown as typeof fetch,
  });
  return { s, calls };
}
const ok = () => new Response(JSON.stringify(raw), { status: 200 });

test("news: key stays in a header (never the URL), query has the spec terms", async () => {
  const { s, calls } = svc({ handler: ok });
  await s.get();
  assert.ok(!calls[0].url.toString().includes("SECRET"));
  assert.equal((calls[0].init.headers as Record<string, string>)["X-Api-Key"], "SECRET");
  const q = calls[0].url.searchParams.get("q")!;
  for (const t of ["motorcycle", "motorbike", "bike launch", "motorcycle racing", "MotoGP", "adventure motorcycle", "touring motorcycle", "electric motorcycle", "India motorcycle"]) assert.ok(q.includes(t), t);
});

test("news: no key -> not_configured; response never includes the key", async () => {
  const s = new NewsService({ apiKey: undefined });
  await assert.rejects(s.get(), (e: unknown) => e instanceof AppError && e.code === "not_configured");
});

test("news: cached within TTL, category filter, refresh floor of 60s, then refetch", async () => {
  let t = 0;
  const { s, calls } = svc({ handler: ok, now: () => t });
  const all = await s.get();
  assert.equal(all.articles.length, 4);
  const racing = await s.get({ category: "MotoGP/Racing" });
  assert.deepEqual(racing.articles.map((a) => a.category), ["MotoGP/Racing"]);
  assert.equal((await s.get({ category: "latest" })).articles.length, 4);
  assert.equal((await s.get({ category: "bogus" })).articles.length, 4);
  assert.equal(calls.length, 1);
  t += 30_000;
  await s.get({ force: true });
  assert.equal(calls.length, 1); // refresh spam inside 60 s doesn't hit the provider
  t += 40_000;
  await s.get({ force: true });
  assert.equal(calls.length, 2);
});

test("news: upstream failure -> stale cache served; with no cache -> upstream_unavailable (no body leaked)", async () => {
  let t = 0;
  let fail = false;
  const { s } = svc({ now: () => t, handler: () => (fail ? new Response("secret upstream body", { status: 429 }) : ok()) });
  await s.get();
  t += 20 * 60_000;
  fail = true;
  const stale = await s.get();
  assert.equal(stale.stale, true);
  assert.equal(stale.articles.length, 4);

  const { s: cold } = svc({ handler: () => new Response("secret upstream body", { status: 401 }) });
  await assert.rejects(cold.get(), (e: unknown) => e instanceof AppError && e.code === "upstream_unavailable" && !e.message.includes("secret upstream body"));
  const { s: net } = svc({ handler: () => { throw new TypeError("fetch failed"); } });
  await assert.rejects(net.get(), (e: unknown) => e instanceof AppError && e.code === "upstream_unavailable");
});

test("news: concurrent requests share one upstream call", async () => {
  const { s, calls } = svc({ handler: async () => { await new Promise((r) => setTimeout(r, 20)); return ok(); } });
  await Promise.all([s.get(), s.get(), s.get()]);
  assert.equal(calls.length, 1);
});
