// The claim is the whole distributed lock: one findOneAndUpdate that moves
// an open task to claimed under this worker. The heartbeat is the same
// shape with a precondition, so a task the reaper has already taken back
// is never touched again by its old worker.

import type { Collections } from "../shared/db.ts";
import type { Task } from "../shared/types.ts";
import type { ObjectId } from "mongodb";

export async function claim(c: Collections, workerId: string): Promise<Task | null> {
  const now = new Date();
  return c.tasks.findOneAndUpdate(
    { status: "open" },
    { $set: { status: "claimed", worker: workerId, heartbeat: now, updatedAt: now } },
    { sort: { priority: -1, createdAt: 1 }, returnDocument: "after" },
  );
}

export async function heartbeat(c: Collections, taskId: ObjectId, workerId: string): Promise<boolean> {
  const r = await c.tasks.findOneAndUpdate(
    { _id: taskId, status: "claimed", worker: workerId },
    { $set: { heartbeat: new Date() } },
    { returnDocument: "after" },
  );
  return r !== null;
}
