import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createPool } from "./pgStore.js";

const config = loadConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required to run migrations.");

const dir = new URL("../migrations/", import.meta.url);
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
const pool = createPool(config.databaseUrl, config.isProduction);
try {
  for (const f of files) {
    const sql = await readFile(fileURLToPath(new URL(f, dir)), "utf8");
    await pool.query(sql);
    console.log(`[migrate] applied ${f}`);
  }
} finally {
  await pool.end();
}
