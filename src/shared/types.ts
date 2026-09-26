// The contract between every stream. One Zod schema per collection, plus
// the shapes that cross module boundaries (gate result, tool outputs,
// planner decisions). docs/DATABASE.md explains these; this file is the
// source of truth. Change both in the same commit.

import { z } from "zod";
import { ObjectId } from "mongodb";

export const objectId = z.instanceof(ObjectId);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ---------------------------------------------------------------- goal

export const CheckRef = z.object({
  kind: z.string(), // must exist in usecase/checks.ts `checks`
  params: z.record(z.string(), z.unknown()).default({}),
});

export const Criterion = z.object({
  id: z.string(), // "c1"
  kind: z.enum(["all-units", "metric"]).default("all-units"),
  text: z.string(),
  check: CheckRef,
  // metric criteria only, unused today
  direction: z.enum(["min", "max"]).optional(),
  target: z.number().optional(),
});

export const GoalDiff = z.object({
  op: z.literal("add-guideline"),
  text: z.string().min(1),
});

export const GoalHistoryEntry = z.object({
  version: z.number().int(),
  at: z.date(),
  by: z.string(),
  diff: GoalDiff.nullable(),
  questionId: objectId.optional(),
});

export const Goal = z.object({
  _id: z.literal("goal"),
  version: z.number().int().min(1),
  statement: z.string(),
  criteria: z.array(Criterion).min(1),
  guidelines: z.array(z.string()),
  outOfScope: z.array(z.string()),
  // The exact shape a proposal must have, as the use case states it (a JSON
  // example or a field list). Pinned into every worker context.
  proposalShape: z.string().default(""),
  history: z.array(GoalHistoryEntry),
});

// -------------------------------------------------------------- inputs

export const Input = z.object({
  _id: z.string(), // equals key
  key: z.string(),
  name: z.string(), // display name of the unit
  meta: z.record(z.string(), z.unknown()), // extra fields from inputs.json, passed to the checks as-is
  source: z.string().optional(), // URL of the original
  text: z.string(),
  chars: z.number().int(),
  scheduled: z.boolean(),
  scheduledBy: z.string().nullable(), // "seed" | "crowd:<sourceId>"
  createdAt: z.date(),
});

// --------------------------------------------------------------- tasks

export const TaskStatus = z.enum(["open", "claimed", "merged", "blocked", "parked"]);

export const GateResult = z.object({
  pass: z.boolean(),
  reasons: z.array(z.string()),
  // per check kind, so the screen can name the criterion that failed
  checks: z.record(z.string(), z.object({ pass: z.boolean(), reasons: z.array(z.string()) })),
});

export const Task = z.object({
  _id: objectId,
  key: z.string(),
  criteria: z.array(z.string()).min(1),
  version: z.number().int(),
  status: TaskStatus,
  priority: z.number().int().min(0).max(1),
  attempt: z.number().int().min(1),
  worker: z.string().nullable(),
  heartbeat: z.date().nullable(),
  proposal: z.unknown().nullable(),
  gate: GateResult.nullable(),
  blockReason: z.string().nullable(),
  hint: z.string().nullable(),
  createdBy: z.string(), // "planner" | "crowd:<sourceId>"
  createdAt: z.date(),
  updatedAt: z.date(),
});

// --------------------------------------------------------------- state

export const State = z.object({
  _id: z.string(), // equals key
  key: z.string(),
  version: z.number().int(), // goal version it was verified under
  stateVersion: z.number().int(), // bumps on every merge of this key
  data: z.unknown(),
  // The use case's hidden metric (usecase/checks.ts score()), written by
  // the planner's score step, never by a worker. null until scored.
  score: z.union([z.literal(0), z.literal(1)]).nullable().optional(),
  scoredAt: z.date().nullable().optional(),
  taskId: objectId,
  mergedAt: z.date(),
});

// ------------------------------------------------------------- sources

export const SourceKind = z.enum([
  "worker-run",
  "gate",
  "planner-turn",
  "crowd-request",
  "answer",
  "error",
]);

export const Enrichment = z.object({
  gist: z.string(),
  entities: z.object({
    keys: z.array(z.string()),
    fields: z.array(z.string()),
  }),
  labels: z.array(z.string()),
  embedding: z.array(z.number()),
});

export const Tokens = z.object({
  in: z.number().int(),
  out: z.number().int(),
  cost: z.number(), // USD
});

export const Source = z.object({
  _id: objectId,
  kind: SourceKind,
  taskId: objectId.nullable(),
  key: z.string().nullable(),
  version: z.number().int(),
  raw: z.record(z.string(), z.unknown()),
  text: z.string(),
  enrichment: Enrichment.nullable(),
  tokens: Tokens,
  handled: z.boolean().optional(), // crowd-request only
  outcome: z.string().optional(), // crowd-request only: task | recheck | proposal | parked
  reason: z.string().optional(), // crowd-request only
  createdAt: z.date(),
});

// ----------------------------------------------------------- questions

export const Question = z.object({
  _id: objectId,
  kind: z.literal("approval"),
  question: z.string(),
  proposedDiff: GoalDiff,
  evidence: z.array(objectId), // task ids
  status: z.enum(["open", "approved", "rejected"]),
  answeredBy: z.string().nullable(),
  answeredAt: z.date().nullable(),
  createdAt: z.date(),
});

// ---------------------------------------------------------- singletons

export const Lock = z.object({
  _id: z.literal("planner"),
  holder: z.string(),
  until: z.date(),
});

export const MetricsMinute = z.object({
  minute: z.date(),
  merged: z.number().int(),
  failed: z.number().int(),
  blocked: z.number().int(),
  firstTryPass: z.number().nullable(), // rolling rate 0..1
  tokens: z.number().int(),
  contextAvg: z.number().nullable(),
  secondsMedian: z.number().nullable(),
});

// The lessons digest: derived counts from the raw record over a recent
// window, recomputed by every planner run and pinned into every worker and
// planner call. Never a replacement for the raw record it is computed from.
export const Lessons = z.object({
  at: z.date(),
  window: z.object({ tasks: z.number().int(), since: z.date() }),
  firstTryPass: z.number().nullable(), // 0..1 over the merged tasks in the window
  checks: z.array(z.object({ kind: z.string(), criterion: z.string(), fails: z.number().int(), passes: z.number().int() })), // worst first
  reasons: z.array(z.object({ text: z.string(), count: z.number().int(), keys: z.array(z.string()) })), // top normalized gate reasons
  blocked: z.array(z.object({ text: z.string(), count: z.number().int(), keys: z.array(z.string()) })), // top normalized block reasons
  recentGuidelines: z.array(z.object({ version: z.number().int(), text: z.string(), resolved: z.number().int() })), // last approved diffs
  text: z.string().max(2000), // the digest rendered for prompts
});

// One row per 15-minute bucket: the solve-rate curve on the stage view.
export const SolveBucket = z.object({
  bucket: z.date(),
  attempted: z.number().int(), // keys with at least one task created up to the end of the bucket
  merged: z.number().int(), // keys with state merged up to the end of the bucket
  solved: z.number().int(), // keys with state.score === 1 up to the end of the bucket
});

export const Metrics = z.object({
  _id: z.literal("metrics"),
  at: z.date(),
  perMinute: z.array(MetricsMinute),
  solveRate: z.array(SolveBucket).optional(),
  totals: z.object({
    merged: z.number().int(),
    blocked: z.number().int(),
    open: z.number().int(),
    libraryTokens: z.number().int(),
    librarySources: z.number().int(),
    contextLast20Avg: z.number().nullable(),
    solved: z.number().int().optional(),
    attempted: z.number().int().optional(),
    stepsMedian: z.number().nullable().optional(),
  }),
  perCriterion: z.record(z.string(), z.object({ done: z.number().int(), total: z.number().int() })),
  versions: z.array(z.object({ version: z.number().int(), at: z.date() })),
  lessons: Lessons,
});

// ---------------------------------------------------- planner outputs

export const CrowdOutcome = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("task"), key: z.string() }),
  z.object({ outcome: z.literal("recheck"), key: z.string(), reason: z.string() }),
  z.object({ outcome: z.literal("proposal"), guideline: z.string().min(1) }),
  z.object({ outcome: z.literal("parked"), reason: z.string() }),
]);

// ------------------------------------------------------- worker tools

export const BlockArgs = z.object({ reason: z.string().min(1) });
export const SubmitArgs = z.object({ proposal: z.record(z.string(), z.unknown()) });

// ------------------------------------------------------------- types

export type Goal = z.infer<typeof Goal>;
export type Criterion = z.infer<typeof Criterion>;
export type GoalDiff = z.infer<typeof GoalDiff>;
export type Input = z.infer<typeof Input>;
export type Task = z.infer<typeof Task>;
export type TaskStatus = z.infer<typeof TaskStatus>;
export type GateResult = z.infer<typeof GateResult>;
export type State = z.infer<typeof State>;
export type Source = z.infer<typeof Source>;
export type SourceKind = z.infer<typeof SourceKind>;
export type Enrichment = z.infer<typeof Enrichment>;
export type Tokens = z.infer<typeof Tokens>;
export type Question = z.infer<typeof Question>;
export type Lock = z.infer<typeof Lock>;
export type Metrics = z.infer<typeof Metrics>;
export type Lessons = z.infer<typeof Lessons>;
export type CrowdOutcome = z.infer<typeof CrowdOutcome>;

// The check function contract, as implemented in usecase/checks.ts. The
// harness is domain-agnostic: a check reads whatever it needs from `meta`.
// `state.merged` is the map of merged proposals by key, built by the gate
// caller from the `state` collection. The task's own key is never in it:
// a recheck replaces that key's state, so the old record is not a
// duplicate.
export type CheckInput = { key: string; name: string; text: string; meta: Record<string, unknown> };
export type CheckState = { merged: Record<string, unknown> };
export type CheckFn = (proposal: unknown, input: CheckInput, state: CheckState) => { pass: boolean; reasons: string[] };
// Optional hidden metric a use case may export next to its checks. Run by the planner only.
export type ScoreFn = (proposal: unknown, input: CheckInput) => 0 | 1;
