// The metrics singleton the screen reads instead of scanning the library.
// One aggregation over tasks unioned with sources, bucketed per minute
// with $dateTrunc, plus a few counts for the totals.

import type { Collections } from "../shared/db.ts";
import type { Metrics } from "../shared/types.ts";
import { computeLessons } from "./lessons.ts";

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
export const SOLVE_BUCKET_MS = 15 * MINUTE;
export const STEPS_WINDOW = 50;

type SolveBucket = NonNullable<Metrics["solveRate"]>[number];

// The solve-rate curve: one cumulative row per 15-minute bucket from the
// first task to now. attempted counts keys with a task created by the end
// of the bucket, merged keys with state merged by then, solved keys whose
// state scored 1 by then. Two aggregations: first task per key, and the
// state timestamps.
export async function solveRate(c: Collections, now: Date): Promise<{ buckets: SolveBucket[]; attempted: number; finished: number; solved: number }> {
  const firsts = await c.tasks
    .aggregate<{ _id: string; at: Date }>([{ $group: { _id: "$key", at: { $min: "$createdAt" } } }])
    .map((k) => k.at.getTime())
    .toArray();
  const states = await c.state
    .find({}, { projection: { mergedAt: 1, score: 1, scoredAt: 1 } })
    .map((s) => ({ merged: s.mergedAt.getTime(), solved: s.score === 1 ? (s.scoredAt ?? s.mergedAt).getTime() : null }))
    .toArray();
  const solvedAts = states.flatMap((s) => (s.solved === null ? [] : [s.solved]));
  // Finished: merged, or blocked with no later task. The denominator of the
  // solve rate on stage; attempted swings with the worker count.
  const blockedAts = await c.tasks
    .aggregate<{ _id: string; at: Date; open: number }>([
      { $group: { _id: "$key", at: { $max: { $cond: [{ $eq: ["$status", "blocked"] }, "$updatedAt", null] } }, open: { $sum: { $cond: [{ $in: ["$status", ["open", "claimed"]] }, 1, 0] } } } },
      { $match: { at: { $ne: null }, open: 0 } },
    ])
    .map((k) => k.at.getTime())
    .toArray();
  const finishedAts = [...states.map((s) => s.merged), ...blockedAts];
  const totals = { attempted: firsts.length, finished: finishedAts.length, solved: solvedAts.length };
  if (!firsts.length) return { buckets: [], ...totals };

  const start = Math.floor(Math.min(...firsts) / SOLVE_BUCKET_MS) * SOLVE_BUCKET_MS;
  const buckets: SolveBucket[] = [];
  const upTo = (times: number[], end: number) => times.filter((t) => t < end).length;
  for (let b = start; b <= now.getTime(); b += SOLVE_BUCKET_MS) {
    const end = b + SOLVE_BUCKET_MS;
    buckets.push({
      bucket: new Date(b),
      attempted: upTo(firsts, end),
      finished: upTo(finishedAts, end),
      merged: upTo(states.map((s) => s.merged), end),
      solved: upTo(solvedAts, end),
    });
  }
  return { buckets, ...totals };
}

// Median number of model steps over the last merged worker runs (raw.steps
// as write.ts records it). null until a run merged.
export async function stepsMedian(c: Collections, window = STEPS_WINDOW): Promise<number | null> {
  const steps = await c.sources
    .aggregate<{ n: number }>([
      { $match: { kind: "worker-run", "raw.gate.pass": true } },
      { $sort: { createdAt: -1 } },
      { $limit: window },
      { $project: { _id: 0, n: { $size: { $ifNull: ["$raw.steps", []] } } } },
      { $sort: { n: 1 } },
    ])
    .map((s) => s.n)
    .toArray();
  if (!steps.length) return null;
  const mid = Math.floor(steps.length / 2);
  return steps.length % 2 ? steps[mid] : (steps[mid - 1] + steps[mid]) / 2;
}

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
                ctx: { $cond: [{ $eq: ["$kind", "worker-run"] }, "$raw.contextTokens", null] },
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

  const [merged, blocked, open, librarySources, library, last20, goal, scheduled, solve, median] = await Promise.all([
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
      // The assembled context per task (goal, input, state, failures, briefing), the flat number on stage.
      .find({ kind: "worker-run", "raw.contextTokens": { $gt: 0 } }, { projection: { "raw.contextTokens": 1 }, sort: { createdAt: -1 }, limit: ROLLING_MERGES })
      .map((s) => Number((s.raw as { contextTokens?: number }).contextTokens ?? 0))
      .toArray(),
    c.goal.findOne({ _id: "goal" }),
    c.inputs.countDocuments({ scheduled: true }),
    solveRate(c, now),
    stepsMedian(c),
  ]);

  const done = goal ? await c.state.countDocuments({ version: goal.version }) : 0;
  const perCriterion: Metrics["perCriterion"] = {};
  for (const cr of goal?.criteria ?? []) perCriterion[cr.id] = { done, total: scheduled };
  const lessons = await computeLessons(c, goal, now);

  const metrics: Metrics = {
    _id: "metrics",
    at: now,
    perMinute,
    solveRate: solve.buckets,
    totals: {
      merged,
      blocked,
      open,
      libraryTokens: library?.tokens ?? 0,
      librarySources,
      contextLast20Avg: last20.length ? last20.reduce((a, b) => a + b, 0) / last20.length : null,
      solved: solve.solved,
      attempted: solve.attempted,
      finished: solve.finished,
      stepsMedian: median,
    },
    perCriterion,
    versions: (goal?.history ?? []).map((h) => ({ version: h.version, at: h.at })),
    lessons,
  };
  await c.metrics.replaceOne({ _id: "metrics" }, metrics, { upsert: true });
  return metrics;
}
