// npm run indexes: create collections and indexes, idempotent.

import { close, connect, ensureIndexes, ensureSearchIndexes } from "./db.ts";

const { c } = await connect();
await ensureIndexes(c);
try {
  await ensureSearchIndexes(c);
  console.log("search indexes ensured (they build in the background on Atlas)");
} catch (err) {
  console.warn("search indexes skipped:", (err as Error).message);
}
console.log("indexes ensured");
await close();
