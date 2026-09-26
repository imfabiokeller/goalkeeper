// The JSON payloads the route handlers return and the screens consume.
// Dates are ISO strings and ObjectIds are hex strings on the wire; the
// builders in stage.ts, unit.ts and task.ts produce exactly these shapes.

import type { Metrics, TaskStatus } from "../../shared/types.ts";

export type UnitStatus = "solved" | "merged" | TaskStatus;

// One live progress line off task.progress, dates as ISO strings and the
// optional fields filled in so the UI never branches on undefined.
export type ProgressLine = {
  at: string;
  step: number;
  tool: string; // tool name, "text" for a step without a call, "reaper" for a requeue
  ok: boolean | null; // try_submit and submit only: the gate verdict
  reasons: string[]; // first few reasons, clipped by the worker
  rule: string | null; // the draft's rule sentence, when the proposal had one
};

export type StageUnit = {
  key: string;
  status: UnitStatus;
  attempt: number | null; // latest task's attempt, null when no task yet
  reason: string | null; // first reason of the last gate failure on the key, or the block reason
  rule: string | null; // state.data.rule when merged
  hint: string | null; // planner hint on the latest task
  step: number | null; // latest task's live step
  updatedAt: string | null;
};

export type StageWorker = {
  worker: string;
  key: string;
  taskId: string;
  attempt: number;
  step: number | null; // task.step, tool steps finished in the current attempt
  progress: ProgressLine[]; // the last PROGRESS_LAST entries of task.progress, oldest first
  heartbeatAge: number; // seconds since the last heartbeat; on a dead row, seconds since diedAt
  alive: boolean; // false between 30 and 90 s of silence and on dead rows
  diedAt: string | null; // dead row: the reaper requeued the task then and worker is its lastWorker
};

export type FeedLine = {
  at: string;
  kind: "worker-run" | "gate" | "error" | "task";
  key: string | null;
  outcome: string; // submit, block, fail, pass, requeued, reopened, too specific, merged, blocked, claimed, open
  reason: string | null; // the first reason, when any
  taskId: string | null;
  worker: string | null;
  id: string; // source id or task id, for links
};

export type StagePayload = {
  at: string; // server time when the payload was built
  metrics: {
    at: string | null;
    totals: Metrics["totals"] | null;
    solveRate: Array<{ bucket: string; attempted: number; merged: number; solved: number }>;
    perMinute: Array<{
      minute: string;
      merged: number;
      failed: number;
      blocked: number;
      firstTryPass: number | null;
      tokens: number;
      contextAvg: number | null;
      secondsMedian: number | null;
    }>;
    lessons: string | null;
  };
  goal: {
    statement: string;
    criteria: Array<{ id: string; text: string; check: string }>;
    guidelines: string[];
    outOfScope: string[];
    version: number;
    writtenAt: string | null; // history[0].at
  } | null;
  counts: { units: number; solved: number; merged: number; open: number; claimed: number; blocked: number; parked: number };
  units: StageUnit[];
  workers: { target: number; alive: number; rows: StageWorker[] };
  feed: FeedLine[];
};

export type Grid = number[][];

export type UnitPair = { input: Grid; output: Grid };

export type UnitTask = {
  id: string;
  attempt: number;
  worker: string | null;
  status: TaskStatus;
  priority: number;
  gate: { pass: boolean; reasons: string[]; checks: Record<string, { pass: boolean; reasons: string[] }> } | null;
  blockReason: string | null;
  hint: string | null;
  createdAt: string;
  updatedAt: string;
  steps: number | null; // from the linked worker-run source
  tokens: { in: number; out: number; cost: number } | null;
  seconds: number | null; // worker-run createdAt minus task createdAt, when the run is linked
  sourceId: string | null; // the worker-run source
  outcome: string | null; // submit, block, fail from the run
  rule: string | null; // the proposal's rule on this attempt, else the last try_submit's rule from progress
  step: number | null; // live step, reset by the claim
  progress: ProgressLine[]; // full task.progress (up to PROGRESS_ENTRIES), oldest first
};

export type Precedent = { id: string; kind: string; key: string | null; gist: string | null; score: number | null };

export type ActualOutput = { ok: true; output: Grid } | { ok: false; error: string } | null;

export type UnitPayload = {
  key: string;
  name: string;
  text: string;
  train: UnitPair[];
  test: Array<{ input: Grid }>; // never the test output
  state: { data: unknown; rule: string | null; program: string | null; score: 0 | 1 | null; mergedAt: string; stateVersion: number } | null;
  tasks: UnitTask[]; // sorted by createdAt ascending
  latest: {
    taskId: string;
    program: string | null;
    rule: string | null;
    actual: ActualOutput[]; // the program run on each example input, same order as train
    actualTest: ActualOutput[]; // the program run on each test input
    precedents: Precedent[];
    refutedRules: string[];
  } | null;
};

export type TaskPayload = {
  task: {
    id: string;
    key: string;
    criteria: string[];
    version: number;
    status: TaskStatus;
    priority: number;
    attempt: number;
    worker: string | null;
    heartbeat: string | null;
    proposal: unknown;
    gate: UnitTask["gate"];
    blockReason: string | null;
    hint: string | null;
    createdAt: string;
    updatedAt: string;
    step: number | null;
    progress: ProgressLine[];
    lastWorker: string | null;
    diedAt: string | null;
  };
  run: {
    id: string;
    createdAt: string;
    tokens: { in: number; out: number; cost: number };
    enrichment: { gist: string; labels: string[] } | null;
    raw: Record<string, unknown>; // messages, steps, proposal, gate, briefing, contextTokens, trimmed to 200 kB
    truncated: boolean;
  } | null;
  next: { id: string; attempt: number; status: TaskStatus; hint: string | null; createdAt: string } | null;
};

export type SourcePayload = {
  id: string;
  kind: string;
  taskId: string | null;
  key: string | null;
  version: number;
  raw: Record<string, unknown>;
  text: string;
  enrichment: { gist: string; labels: string[]; entities: { keys: string[]; fields: string[] } } | null;
  tokens: { in: number; out: number; cost: number };
  createdAt: string;
  truncated: boolean;
};

// The library page: how big the raw record is right now.
export type LibraryPayload = {
  at: string;
  entries: number;
  tokens: number; // in plus out over every source
  bytes: number; // sources storageSize on disk, 0 when $collStats is not permitted
  byKind: Record<string, number>; // worker-run, gate, planner-turn, error
  solvedRules: number; // state docs with score 1
  refutedRules: number; // gate sources with a failed verdict
  growth: Array<{ at: string; tokens: number }>; // cumulative tokens off metrics.perMinute
  lessons: string | null; // the digest text pinned into every context
  lessonsAt: string | null;
  contextAvg: number | null; // tokens an agent reads, metrics.totals.contextLast20Avg
  newest: Array<{ id: string; at: string; kind: string; key: string | null; gist: string }>;
};

// One puzzle's control result off /api/baseline?key= (null when the
// control has not tried it).
export type BaselinePuzzlePayload = {
  key: string;
  gatePass: boolean;
  score: number;
  solvedAt2: boolean | null;
  firstReason: string | null;
  attempts: Array<{ gatePass: boolean; score: number; firstReason: string | null }>;
} | null;
