// Score: the use case's hidden metric, run by the planner on merged state
// and nowhere else. For every state not yet scored, load the input, run
// score(data, input), write the result under a "still unscored"
// precondition. A 0 reopens the key once with a hint that names the
// failure mode, never the answer. The use case may not export score at
// all; then this step is a no-op.

import * as usecase from "../../usecase/checks.ts";
import type { Collections } from "../shared/db.ts";
import type { CheckInput, Goal, ScoreFn } from "../shared/types.ts";
import { insertTaskIfIdle } from "./emit.ts";

export const SCORE_CAP = 50;
export const TOO_SPECIFIC_PREFIX = "passed the examples";
export const TOO_SPECIFIC_HINT =
  "passed the examples, wrong on the test: the rule is too specific. Find a rule that also fits an unseen input.";

export type ScoreReport = { scored: number; solved: number; reopened: number; skipped: number };

const fromUsecase = (usecase as Record<string, unknown>).score;
export const defaultScore: ScoreFn | null = typeof fromUsecase === "function" ? (fromUsecase as ScoreFn) : null;

// Same shape the gate hands its checks: meta spread flat under key, name, text.
export function checkArg(input: { key: string; name: string; text: string; meta: Record<string, unknown> }): CheckInput {
  return { ...input.meta, key: input.key, name: input.name, text: input.text } as CheckInput;
}

export async function scoreStates(
  c: Collections,
  goal: Goal,
  score: ScoreFn | null = defaultScore,
  cap = SCORE_CAP,
): Promise<ScoreReport> {
  const report: ScoreReport = { scored: 0, solved: 0, reopened: 0, skipped: 0 };
  if (!score) return report;

  // Unscored, or scored before the key merged again (a re-merge keeps the
  // old score field; null sorts before every date in $lt).
  const unscored = {
    $or: [{ score: null }, { score: { $exists: false } }, { $expr: { $lt: [{ $ifNull: ["$scoredAt", null] }, "$mergedAt"] } }],
  };
  const pending = await c.state.find(unscored, { limit: cap, sort: { mergedAt: 1 } }).toArray();
  for (const state of pending) {
    const input = await c.inputs.findOne({ _id: state.key });
    if (!input) {
      report.skipped += 1;
      continue;
    }
    let result: 0 | 1;
    try {
      result = score(state.data, checkArg(input)) ? 1 : 0;
    } catch {
      // A throwing scorer is a wrong answer, not a crash of the planner.
      result = 0;
    }
    const written = await c.state.findOneAndUpdate(
      { _id: state._id, ...unscored },
      { $set: { score: result, scoredAt: new Date() } },
    );
    if (!written) {
      report.skipped += 1; // another planner scored it first
      continue;
    }
    report.scored += 1;
    if (result === 1) {
      report.solved += 1;
      continue;
    }
    // One second chance per key: ARC allows two attempts. A key that
    // already carried the hint stays unsolved.
    const before = await c.tasks.countDocuments({ key: state.key, hint: { $regex: `^${TOO_SPECIFIC_PREFIX}` } });
    if (before > 0) continue;
    const id = await insertTaskIfIdle(c, { key: state.key, goal, priority: 1, createdBy: "planner", hint: TOO_SPECIFIC_HINT });
    if (id) report.reopened += 1;
  }
  return report;
}
