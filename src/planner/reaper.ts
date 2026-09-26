// Kill-and-resume: a claimed task whose worker stopped heartbeating goes
// back to the queue with attempt + 1. One updateMany, no other code. The
// update is a pipeline so the task remembers who died (lastWorker, diedAt,
// a "reaper" progress line) without a read: the screen holds the dead
// worker's row for a while from diedAt.

import type { Collections } from "../shared/db.ts";
import { PROGRESS_ENTRIES } from "../shared/types.ts";

export const STALE_MS = 30_000;

export async function reap(c: Collections, staleMs = STALE_MS): Promise<number> {
  const now = new Date();
  const r = await c.tasks.updateMany({ status: "claimed", heartbeat: { $lt: new Date(now.getTime() - staleMs) } }, [
    {
      $set: {
        status: "open",
        lastWorker: "$worker",
        diedAt: now,
        worker: null,
        heartbeat: null,
        updatedAt: now,
        attempt: { $add: ["$attempt", 1] },
        progress: {
          $slice: [
            { $concatArrays: [{ $ifNull: ["$progress", []] }, [{ at: now, step: { $ifNull: ["$step", 0] }, tool: "reaper" }]] },
            -PROGRESS_ENTRIES,
          ],
        },
      },
    },
  ]);
  return r.modifiedCount;
}
