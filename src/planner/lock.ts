// The planner lock: one document, one holder, a TTL. Acquire is a single
// upsert with a precondition (expired or already ours). When the document
// exists and is held by someone else, the upsert tries to insert a second
// "planner" _id and fails with a duplicate key, which means "not acquired".

import type { Collections } from "../shared/db.ts";

export const LOCK_TTL_MS = 30_000;

function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

export async function acquire(c: Collections, holder: string, ttlMs = LOCK_TTL_MS): Promise<boolean> {
  const now = new Date();
  const until = new Date(now.getTime() + ttlMs);
  try {
    const doc = await c.locks.findOneAndUpdate(
      { _id: "planner", $or: [{ until: { $lt: now } }, { holder }] },
      { $set: { holder, until } },
      { upsert: true, returnDocument: "after" },
    );
    return doc?.holder === holder;
  } catch (err) {
    if (isDuplicateKey(err)) return false;
    throw err;
  }
}

export async function release(c: Collections, holder: string): Promise<boolean> {
  const r = await c.locks.updateOne({ _id: "planner", holder }, { $set: { until: new Date(0) } });
  return r.modifiedCount === 1;
}
