import { createServer } from "node:http";
import { JwtAuth } from "./auth.js";
import { loadConfig } from "./config.js";
import { createApp } from "./http.js";
import { MemoryStore } from "./memoryStore.js";
import { createPool, PgStore } from "./pgStore.js";
import { attachRealtime } from "./socket.js";
import { RideService } from "./service.js";
import { noopHub, type Hub } from "./hub.js";
import type { Store } from "./store.js";
import { JwtCommunityAuth } from "./community/auth.js";
import { MemoryCommunityStore } from "./community/memoryStore.js";
import { PgCommunityStore } from "./community/pgStore.js";
import { CommunityService } from "./community/service.js";
import { MemoryAudioStorage, SupabaseAudioStorage, type AudioStorage } from "./community/storage.js";
import type { CommunityStore } from "./community/store.js";
import { NewsService } from "./news.js";

const config = loadConfig();

let store: Store;
let communityStore: CommunityStore;
let closeDb = async () => {};
if (config.databaseUrl) {
  const pool = createPool(config.databaseUrl, config.isProduction);
  store = new PgStore(pool);
  communityStore = new PgCommunityStore(pool);
  closeDb = () => pool.end();
} else {
  console.warn("[server] DATABASE_URL not set — using an IN-MEMORY store (dev only; data is lost on restart).");
  store = new MemoryStore();
  communityStore = new MemoryCommunityStore();
}

const service = new RideService(store, new JwtAuth(config.jwtSecret));

let realHub: Hub = noopHub;
const hubProxy: Hub = {
  memberUpdated: (...a) => realHub.memberUpdated(...a),
  memberLeft: (...a) => realHub.memberLeft(...a),
  rideEnded: (...a) => realHub.rideEnded(...a),
};

// ---- Moto Community (voice messages in a private Supabase Storage bucket) ----
let memoryAudio: MemoryAudioStorage | null = null;
let audioStorage: AudioStorage;
if (config.supabase) {
  audioStorage = new SupabaseAudioStorage({ url: config.supabase.url, serviceRoleKey: config.supabase.serviceRoleKey, bucket: config.supabase.audioBucket });
} else {
  console.warn("[server] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — community voice messages use IN-MEMORY storage (dev only).");
  memoryAudio = new MemoryAudioStorage();
  audioStorage = memoryAudio;
}
const community = new CommunityService(communityStore, new JwtCommunityAuth(config.jwtSecret), audioStorage);
setInterval(() => community.sweep(), 5 * 60_000).unref();

const news = new NewsService({ apiKey: config.newsApiKey, baseUrl: config.newsApiBaseUrl });
if (!news.configured) console.warn("[server] NEWS_API_KEY not set — /api/news/motorcycle will report 'not configured'.");

const app = createApp(service, hubProxy, config, { community, memoryAudio, news });
const httpServer = createServer(app);
const realtime = attachRealtime(httpServer, service, config, community);
realHub = realtime.hub;

httpServer.listen(config.port, () => {
  console.log(`[server] MotoNav backend listening on :${config.port} (${config.isProduction ? "production" : "development"})`);
});

async function shutdown() {
  console.log("[server] shutting down…");
  await realtime.close();
  httpServer.close();
  await closeDb();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
