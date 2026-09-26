// The claim is the whole distributed lock: one findOneAndUpdate that moves
// an open task to claimed under this worker. The heartbeat is the same
// shape with a precondition, so a task the reaper has already taken back
// is never touched again by its old worker.

import type { Collections } from "../shared/db.ts";
import { PROGRESS_ENTRIES, type ProgressEntry, type Task } from "../shared/types.ts";
import type { ObjectId } from "mongodb";

export async function claim(c: Collections, workerId: string): Promise<Task | null> {
  const now = new Date();
  return c.tasks.findOneAndUpdate(
    { status: "open" },
    // A new attempt starts with clean live progress; lastWorker and diedAt stay from the reaper.
    { $set: { status: "claimed", worker: workerId, heartbeat: now, updatedAt: now, step: 0, progress: [] } },
    { sort: { priority: -1, createdAt: 1 }, returnDocument: "after" },
  );
}

// One finished tool step: the step count, the progress line (last
// PROGRESS_ENTRIES kept) and a heartbeat, under the same precondition as
// the heartbeat so a reaped task is never written.
export async function stepDone(c: Collections, taskId: ObjectId, workerId: string, entry: ProgressEntry): Promise<boolean> {
  const now = new Date();
  const r = await c.tasks.updateOne(
    { _id: taskId, status: "claimed", worker: workerId },
    { $set: { step: entry.step, heartbeat: now, updatedAt: now }, $push: { progress: { $each: [entry], $slice: -PROGRESS_ENTRIES } } },
  );
  return r.matchedCount === 1;
}

export async function heartbeat(c: Collections, taskId: ObjectId, workerId: string): Promise<boolean> {
  const r = await c.tasks.findOneAndUpdate(
    { _id: taskId, status: "claimed", worker: workerId },
    { $set: { heartbeat: new Date() } },
    { returnDocument: "after" },
  );
  return r !== null;
}

// The kill switch (controls/kill): take one of the remaining kills, or none.
// One atomic decrement, so five kills stop exactly five workers.
export async function takeKill(c: Collections): Promise<boolean> {
  const r = await c.controls.findOneAndUpdate({ _id: "kill", remaining: { $gt: 0 } }, { $inc: { remaining: -1 } });
  return r !== null;
}
