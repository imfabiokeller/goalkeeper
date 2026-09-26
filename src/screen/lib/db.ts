// The screen's handle on Atlas: the shared client from src/shared/db.ts,
// read-only by convention (no module under src/screen writes). Route
// handlers call `screenDb()` per request; the client is cached across
// requests inside src/shared/db.ts.

import { connect, type Collections } from "../../shared/db.ts";

export async function screenDb(): Promise<Collections> {
  process.env.ROLE ??= "screen";
  const { c } = await connect();
  return c;
}
