// Reopen on library growth: every 20 merges, blocked tasks that predate
// the 20th most recent merge go back to open. A puzzle nobody could
// solve earlier may be solvable now that the library holds more merged
// rules. The previous merged count comes from the last planner-turn
// source; the planner remembers nothing else. Tasks that block on the
// "too specific" second attempt stay blocked: ARC allows two attempts.

import type { Collections } from "../shared/db.ts";
import { TOO_SPECIFIC_PREFIX } from "./score.ts";

export const GROWTH_STEP = 20;
export const REOPENED_PREFIX = "blocked earlier with: ";

export type ReopenReport = { merged: number; previous: number; reopened: number };

// The merged count the previous planner run recorded, 0 when there is none.
export async function previousMergedCount(c: Collections): Promise<number> {
  const turn = await c.sources.findOne(
    { kind: "planner-turn", "raw.merged": { $type: "number" } },
    { sort: { createdAt: -1 }, projection: { "raw.merged": 1 } },
  );
  const n = (turn?.raw as { merged?: unknown } | undefined)?.merged;
  return typeof n === "number" ? n : 0;
}

export async function reopenOnGrowth(c: Collections, previous: number, step = GROWTH_STEP): Promise<ReopenReport> {
  const merged = await c.state.countDocuments({});
  const report: ReopenReport = { merged, previous, reopened: 0 };
  if (Math.floor(merged / step) <= Math.floor(previous / step)) return report;

  const nth = await c.state.findOne({}, { sort: { mergedAt: -1 }, skip: step - 1, projection: { mergedAt: 1 } });
  if (!nth) return report;

  const r = await c.tasks.updateMany(
    {
      status: "blocked",
      updatedAt: { $lt: nth.mergedAt },
      hint: { $not: { $regex: `^${TOO_SPECIFIC_PREFIX}` } },
    },
    [
      {
        $set: {
          status: "open",
          attempt: 1,
          hint: { $concat: [REOPENED_PREFIX, { $ifNull: ["$blockReason", ""] }, "; the library has grown since"] },
          blockReason: null,
          worker: null,
          heartbeat: null,
          updatedAt: "$$NOW",
        },
      },
    ],
  );
  report.reopened = r.modifiedCount;
  return report;
}
