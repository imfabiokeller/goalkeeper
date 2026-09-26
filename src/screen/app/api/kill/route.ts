// The kill switch: the only write the screen makes. POST { n } upserts
// controls/kill with `remaining: n`; workers each take one on their next
// heartbeat and die mid-task, the reaper requeues, nothing is lost. GET
// returns the current doc so the stage can show what is left.

import { screenDb } from "../../../lib/db.ts";

export const dynamic = "force-dynamic";

const MIN_N = 1;
const MAX_N = 20;

export async function GET(): Promise<Response> {
  const c = await screenDb();
  const doc = await c.controls.findOne({ _id: "kill" });
  return Response.json(doc ? { remaining: doc.remaining, at: doc.at.toISOString() } : { remaining: 0, at: null }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request): Promise<Response> {
  let n: unknown;
  try {
    n = ((await req.json()) as { n?: unknown }).n;
  } catch {
    return Response.json({ error: "body must be JSON { n }" }, { status: 400 });
  }
  if (typeof n !== "number" || !Number.isInteger(n) || n < MIN_N || n > MAX_N) {
    return Response.json({ error: `n must be an integer from ${MIN_N} to ${MAX_N}` }, { status: 400 });
  }
  const c = await screenDb();
  const at = new Date();
  const doc = await c.controls.findOneAndUpdate({ _id: "kill" }, { $set: { remaining: n, at } }, { upsert: true, returnDocument: "after" });
  return Response.json({ remaining: doc?.remaining ?? n, at: at.toISOString() }, { headers: { "cache-control": "no-store" } });
}
