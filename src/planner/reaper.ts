// Kill-and-resume: a claimed task whose worker stopped heartbeating goes
// back to the queue with attempt + 1. One updateMany, no other code.

import type { Collections } from "../shared/db.ts";

export const STALE_MS = 30_000;

export async function reap(c: Collections, staleMs = STALE_MS): Promise<number> {
  const now = new Date();
  const r = await c.tasks.updateMany(
    { status: "claimed", heartbeat: { $lt: new Date(now.getTime() - staleMs) } },
    { $set: { status: "open", worker: null, heartbeat: null, updatedAt: now }, $inc: { attempt: 1 } },
  );
  return r.modifiedCount;
}
