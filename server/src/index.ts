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

const config = loadConfig();

let store: Store;
let closeDb = async () => {};
if (config.databaseUrl) {
  const pool = createPool(config.databaseUrl, config.isProduction);
  store = new PgStore(pool);
  closeDb = () => pool.end();
} else {
  console.warn("[server] DATABASE_URL not set — using an IN-MEMORY store (dev only; data is lost on restart).");
  store = new MemoryStore();
}

const service = new RideService(store, new JwtAuth(config.jwtSecret));

let realHub: Hub = noopHub;
const hubProxy: Hub = {
  memberUpdated: (...a) => realHub.memberUpdated(...a),
  memberLeft: (...a) => realHub.memberLeft(...a),
  rideEnded: (...a) => realHub.rideEnded(...a),
};

const app = createApp(service, hubProxy, config);
const httpServer = createServer(app);
const realtime = attachRealtime(httpServer, service, config);
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
