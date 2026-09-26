// One planner run. Takes the lock or returns, then reap, emit, score,
// crowd, propose, metrics, backfill, turn. Every step is its own try/catch
// that leaves an error source and moves on; the lock is always released.
// Holds nothing between runs.

import type { Collections } from "../shared/db.ts";
import type { Enrichment, Goal, ScoreFn, Source, Tokens } from "../shared/types.ts";
import { applyDiff } from "./applyDiff.ts";
import { classifyPending, type ClassifyResult, type Decide } from "./classify.ts";
import { emit } from "./emit.ts";
import { readLessons } from "./lessons.ts";
import { acquire, release } from "./lock.ts";
import { refreshMetrics } from "./metrics.ts";
import { propose, type DecideGuideline } from "./propose.ts";
import { reap } from "./reaper.ts";
import { previousMergedCount, reopenOnGrowth, type ReopenReport } from "./reopen.ts";
import { defaultScore, scoreStates, type ScoreReport } from "./score.ts";
import { writeError, writeSource, ZERO_TOKENS } from "./sources.ts";

export type PlanOptions = {
  workersTarget?: number;
  crowdCap?: number;
  backfillCap?: number;
  lockTtlMs?: number;
  staleMs?: number;
  decideCrowd?: Decide;
  decideGuideline?: DecideGuideline;
  // The use case's hidden metric. Defaults to usecase/checks.ts score(); null skips the step.
  score?: ScoreFn | null;
  // Enrichment lives in the worker (S2). When not given, backfill is skipped.
  enrich?: (source: Source) => Promise<Enrichment>;
};

export type PlanReport = {
  holder: string;
  reaped: number;
  emitted: number;
  score: ScoreReport;
  reopen: ReopenReport;
  crowd: ClassifyResult[];
  proposed: number;
  backfilled: number;
  errors: string[];
  tokens: Tokens;
};

export async function plan(c: Collections, holder: string, opts: PlanOptions = {}): Promise<PlanReport | null> {
  if (!(await acquire(c, holder, opts.lockTtlMs))) return null;

  const report: PlanReport = {
    holder,
    reaped: 0,
    emitted: 0,
    score: { scored: 0, solved: 0, reopened: 0, skipped: 0 },
    reopen: { merged: 0, previous: 0, reopened: 0 },
    crowd: [],
    proposed: 0,
    backfilled: 0,
    errors: [],
    tokens: { ...ZERO_TOKENS },
  };
  let goal: Goal | null = null;
  // The digest from the previous run goes into this run's model prompts;
  // the metrics step below recomputes it for the next one.
  let lessons: string | null = null;

  const step = async (name: string, fn: () => Promise<void>): Promise<void> => {
    try {
      await fn();
    } catch (err) {
      report.errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
      await writeError(c, name, err, { holder }, goal?.version ?? 0).catch(() => undefined);
    }
  };

  try {
    await step("reap", async () => {
      report.reaped = await reap(c, opts.staleMs);
    });
    await step("goal", async () => {
      goal = await c.goal.findOne({ _id: "goal" });
      if (!goal) throw new Error("no goal document, nothing to plan");
      lessons = await readLessons(c);
    });
    if (goal) {
      const g: Goal = goal;
      const workersTarget = opts.workersTarget ?? Number(process.env.WORKERS_TARGET ?? 8);
      await step("emit", async () => {
        report.emitted = await emit(c, g, workersTarget);
      });
      await step("score", async () => {
        report.score = await scoreStates(c, g, opts.score === undefined ? defaultScore : opts.score);
      });
      await step("crowd", async () => {
        report.crowd = await classifyPending(c, g, opts.crowdCap ?? 10, opts.decideCrowd, report.tokens, lessons);
      });
      await step("propose", async () => {
        report.proposed = await propose(c, g, opts.decideGuideline, report.tokens, lessons);
      });
    }
    await step("reopen", async () => {
      report.reopen = await reopenOnGrowth(c, await previousMergedCount(c));
    });
    await step("metrics", async () => {
      lessons = (await refreshMetrics(c)).lessons.text;
    });
    if (opts.enrich) {
      const enrich = opts.enrich;
      await step("backfill", async () => {
        const missing = await c.sources.find({ enrichment: null }, { limit: opts.backfillCap ?? 20 }).toArray();
        for (const source of missing) {
          const enrichment = await enrich(source);
          const r = await c.sources.updateOne({ _id: source._id, enrichment: null }, { $set: { enrichment } });
          report.backfilled += r.modifiedCount;
        }
      });
    }
    await step("turn", async () => {
      const outcomes = report.crowd.map((r) => `${r.outcome}: ${r.reason}`);
      await writeSource(
        c,
        "planner-turn",
        {
          holder,
          reaped: report.reaped,
          emitted: report.emitted,
          score: report.score,
          // The merged count the next run compares against for reopen-on-growth.
          merged: report.reopen.merged,
          reopened: report.reopen.reopened,
          crowd: report.crowd.map((r) => ({ sourceId: r.sourceId, outcome: r.outcome, reason: r.reason })),
          proposed: report.proposed,
          backfilled: report.backfilled,
          errors: report.errors,
          lessons,
        },
        {
          version: goal?.version ?? 0,
          tokens: { ...report.tokens },
          text: [
            `planner ${holder}: reaped ${report.reaped}, emitted ${report.emitted}, scored ${report.score.scored} (solved ${report.score.solved}, reopened ${report.score.reopened}), proposed ${report.proposed}, merged ${report.reopen.merged} (reopened on growth ${report.reopen.reopened}), backfilled ${report.backfilled}`,
            ...outcomes,
            ...report.errors,
            ...(lessons ? ["", lessons] : []),
          ].join("\n"),
        },
      );
    });
  } finally {
    await release(c, holder).catch(() => undefined);
  }
  return report;
}

export { applyDiff };
