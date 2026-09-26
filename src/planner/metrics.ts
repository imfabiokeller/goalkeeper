// The metrics singleton the screen reads instead of scanning the library.
// One aggregation over tasks unioned with sources, bucketed per minute
// with $dateTrunc, plus a few counts for the totals.

import type { Collections } from "../shared/db.ts";
import type { Metrics } from "../shared/types.ts";

type MetricsMinute = Metrics["perMinute"][number];

export const WINDOW_MINUTES = 180;
export const ROLLING_MERGES = 20;

type Bucket = {
  _id: Date;
  merged: number;
  failed: number;
  blocked: number;
  tokens: number;
  contextAvg: number | null;
};

const MINUTE = 60_000;

export async function refreshMetrics(c: Collections, now = new Date()): Promise<Metrics> {
  const since = new Date(Math.floor(now.getTime() / MINUTE) * MINUTE - (WINDOW_MINUTES - 1) * MINUTE);

  const buckets = await c.tasks
    .aggregate<Bucket>([
      { $match: { status: { $in: ["merged", "blocked"] }, updatedAt: { $gte: since } } },
      {
        $replaceWith: {
          minute: { $dateTrunc: { date: "$updatedAt", unit: "minute" } },
          merged: { $cond: [{ $eq: ["$status", "merged"] }, 1, 0] },
          blocked: { $cond: [{ $eq: ["$status", "blocked"] }, 1, 0] },
          failed: { $literal: 0 },
          tokens: { $literal: 0 },
          ctx: null,
        },
      },
      {
        $unionWith: {
          coll: "sources",
          pipeline: [
            { $match: { kind: { $in: ["worker-run", "gate"] }, createdAt: { $gte: since } } },
            {
              $replaceWith: {
                minute: { $dateTrunc: { date: "$createdAt", unit: "minute" } },
                merged: { $literal: 0 },
                blocked: { $literal: 0 },
                failed: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$kind", "gate"] },
                        { $or: [{ $eq: ["$raw.pass", false] }, { $eq: ["$raw.gate.pass", false] }] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
                tokens: {
                  $cond: [
                    { $eq: ["$kind", "worker-run"] },
                    { $add: [{ $ifNull: ["$tokens.in", 0] }, { $ifNull: ["$tokens.out", 0] }] },
                    0,
                  ],
                },
                ctx: { $cond: [{ $eq: ["$kind", "worker-run"] }, "$tokens.in", null] },
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: "$minute",
          merged: { $sum: "$merged" },
          failed: { $sum: "$failed" },
          blocked: { $sum: "$blocked" },
          tokens: { $sum: "$tokens" },
          contextAvg: { $avg: "$ctx" },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  const byMinute = new Map(buckets.map((b) => [b._id.getTime(), b]));

  // Rolling first-try pass rate over the last 20 merges as of each minute.
  const merges = await c.tasks
    .find({ status: "merged", updatedAt: { $gte: since } }, { projection: { attempt: 1, updatedAt: 1 }, sort: { updatedAt: 1 } })
    .map((t) => ({ at: t.updatedAt.getTime(), first: t.attempt === 1 }))
    .toArray();

  const perMinute: MetricsMinute[] = [];
  let mergeIdx = 0;
  for (let i = 0; i < WINDOW_MINUTES; i++) {
    const minute = new Date(since.getTime() + i * MINUTE);
    const end = minute.getTime() + MINUTE;
    while (mergeIdx < merges.length && merges[mergeIdx].at < end) mergeIdx += 1;
    const recent = merges.slice(Math.max(0, mergeIdx - ROLLING_MERGES), mergeIdx);
    const b = byMinute.get(minute.getTime());
    perMinute.push({
      minute,
      merged: b?.merged ?? 0,
      failed: b?.failed ?? 0,
      blocked: b?.blocked ?? 0,
      firstTryPass: recent.length ? recent.filter((m) => m.first).length / recent.length : null,
      tokens: b?.tokens ?? 0,
      contextAvg: b?.contextAvg ?? null,
      secondsMedian: null,
    });
  }

  const [merged, blocked, open, librarySources, library, last20, goal, scheduled] = await Promise.all([
    c.tasks.countDocuments({ status: "merged" }),
    c.tasks.countDocuments({ status: "blocked" }),
    c.tasks.countDocuments({ status: "open" }),
    c.sources.countDocuments({}),
    c.sources
      .aggregate<{ tokens: number }>([
        { $group: { _id: null, tokens: { $sum: { $add: [{ $ifNull: ["$tokens.in", 0] }, { $ifNull: ["$tokens.out", 0] }] } } } },
      ])
      .next(),
    c.sources
      .find({ kind: "worker-run" }, { projection: { "tokens.in": 1 }, sort: { createdAt: -1 }, limit: ROLLING_MERGES })
      .map((s) => s.tokens?.in ?? 0)
      .toArray(),
    c.goal.findOne({ _id: "goal" }),
    c.inputs.countDocuments({ scheduled: true }),
  ]);

  const done = goal ? await c.state.countDocuments({ version: goal.version }) : 0;
  const perCriterion: Metrics["perCriterion"] = {};
  for (const cr of goal?.criteria ?? []) perCriterion[cr.id] = { done, total: scheduled };

  const metrics: Metrics = {
    _id: "metrics",
    at: now,
    perMinute,
    totals: {
      merged,
      blocked,
      open,
      libraryTokens: library?.tokens ?? 0,
      librarySources,
      contextLast20Avg: last20.length ? last20.reduce((a, b) => a + b, 0) / last20.length : null,
    },
    perCriterion,
    versions: (goal?.history ?? []).map((h) => ({ version: h.version, at: h.at })),
  };
  await c.metrics.replaceOne({ _id: "metrics" }, metrics, { upsert: true });
  return metrics;
}
