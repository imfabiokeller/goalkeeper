// Emit: one task per scheduled input that has no state at the current
// goal version and no task in flight. Pure query, no model. The insert
// itself is guarded: an upsert keyed on "this key has no open, claimed or
// blocked task" so two planners can never queue the same key twice.

import type { ObjectId } from "mongodb";
import type { Collections } from "../shared/db.ts";
import type { Goal, Task } from "../shared/types.ts";

export const BUSY: Task["status"][] = ["open", "claimed", "blocked"];

export type NewTask = {
  key: string;
  goal: Goal;
  priority: 0 | 1;
  createdBy: string;
  hint?: string | null;
};

// Insert a task for the key unless one is already in flight. Returns the
// new task id, or null when the key was busy.
export async function insertTaskIfIdle(c: Collections, t: NewTask): Promise<ObjectId | null> {
  const now = new Date();
  const r = await c.tasks.updateOne(
    { key: t.key, status: { $in: BUSY } },
    {
      $setOnInsert: {
        criteria: t.goal.criteria.map((cr) => cr.id),
        version: t.goal.version,
        status: "open",
        priority: t.priority,
        attempt: 1,
        worker: null,
        heartbeat: null,
        proposal: null,
        gate: null,
        blockReason: null,
        hint: t.hint ?? null,
        createdBy: t.createdBy,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
  return (r.upsertedId as ObjectId | null) ?? null;
}

export async function emit(c: Collections, goal: Goal, workersTarget: number): Promise<number> {
  const cap = 3 * Math.max(1, workersTarget);
  const open = await c.tasks.countDocuments({ status: "open" });
  let room = cap - open;
  if (room <= 0) return 0;

  const busy = new Set(await c.tasks.distinct("key", { status: { $in: BUSY } }));
  const done = new Set(await c.state.distinct("key", { version: goal.version }));

  let emitted = 0;
  const cursor = c.inputs.find({ scheduled: true }, { projection: { key: 1 }, sort: { key: 1 } });
  for await (const input of cursor) {
    if (room <= 0) break;
    if (busy.has(input.key) || done.has(input.key)) continue;
    const id = await insertTaskIfIdle(c, { key: input.key, goal, priority: 0, createdBy: "planner" });
    if (id) {
      emitted += 1;
      room -= 1;
    }
  }
  return emitted;
}
