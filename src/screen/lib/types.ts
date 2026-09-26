// The JSON payloads the route handlers return and the screens consume.
// Dates are ISO strings and ObjectIds are hex strings on the wire; the
// builders in stage.ts, unit.ts and task.ts produce exactly these shapes.

import type { Metrics, TaskStatus } from "../../shared/types.ts";

export type UnitStatus = "solved" | "merged" | TaskStatus;

export type StageUnit = {
  key: string;
  status: UnitStatus;
  attempt: number | null; // latest task's attempt, null when no task yet
  reason: string | null; // first reason of the last gate failure on the key, or the block reason
  rule: string | null; // state.data.rule when merged
  hint: string | null; // planner hint on the latest task
  updatedAt: string | null;
};

export type StageWorker = {
  worker: string;
  key: string;
  taskId: string;
  attempt: number;
  step: number | null; // tasks carry no step today; null until the worker writes one
  heartbeatAge: number; // seconds since the last heartbeat
  alive: boolean; // false between 30 and 90 s of silence; older rows are dropped
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
  rule: string | null; // the proposal's rule on this attempt
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
