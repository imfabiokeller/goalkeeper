// The stage view in one payload: eight projected queries, no full
// documents. Unit status is derived here, not stored anywhere.

import type { Collections } from "../../shared/db.ts";
import type { Task, TaskStatus } from "../../shared/types.ts";
import type { FeedLine, StagePayload, StageUnit, StageWorker } from "./types.ts";

export const PER_MINUTE_LAST = 60;
export const FEED_LINES = 15;
export const DEAD_AFTER_S = 30;
export const DROP_AFTER_S = 90;

const iso = (d: Date | null | undefined): string | null => (d instanceof Date ? d.toISOString() : null);

type LatestTask = {
  _id: string; // key
  status: TaskStatus;
  attempt: number;
  hint: string | null;
  blockReason: string | null;
  updatedAt: Date;
  reasons: Array<string | null>; // first gate reason per task, newest first
};

type ClaimedTask = Pick<Task, "_id" | "key" | "worker" | "heartbeat" | "attempt">;

type FeedSource = {
  _id: { toHexString(): string };
  kind: "worker-run" | "gate" | "error";
  key: string | null;
  taskId: { toHexString(): string } | null;
  createdAt: Date;
  raw: {
    worker?: string;
    outcome?: string;
    blockReason?: string;
    failReason?: string;
    gate?: { pass?: boolean; reasons?: string[] } | null;
    reasons?: string[];
    message?: string;
  };
};

type FeedTask = Pick<Task, "_id" | "key" | "status" | "attempt" | "worker" | "hint" | "blockReason" | "updatedAt"> & {
  gate: { pass?: boolean; reasons?: string[] } | null;
};

function first(list: unknown): string | null {
  return Array.isArray(list) && typeof list[0] === "string" ? list[0] : null;
}

// One line per source: what happened, on which key, and the first reason.
function sourceLine(s: FeedSource): FeedLine {
  const raw = s.raw ?? {};
  let outcome: string;
  let reason: string | null = null;
  if (s.kind === "worker-run") {
    outcome = raw.outcome ?? "run";
    if (raw.outcome === "submit") outcome = raw.gate?.pass ? "pass" : raw.gate ? "fail" : "submit";
    reason = raw.blockReason ?? raw.failReason ?? first(raw.gate?.reasons) ?? null;
  } else if (s.kind === "gate") {
    outcome = raw.gate?.pass ? "pass" : "fail";
    reason = first(raw.reasons) ?? first(raw.gate?.reasons);
  } else {
    outcome = "error";
    reason = raw.message ?? null;
  }
  return {
    at: s.createdAt.toISOString(),
    kind: s.kind,
    key: s.key,
    outcome,
    reason,
    taskId: s.taskId ? s.taskId.toHexString() : null,
    worker: raw.worker ?? null,
    id: s._id.toHexString(),
  };
}

// One line per task transition, read off the task's current fields.
export function taskOutcome(t: Pick<FeedTask, "status" | "attempt" | "hint" | "gate" | "worker">): string {
  if (t.status === "open") {
    if (t.hint?.startsWith("passed the examples")) return "too specific";
    if (t.hint?.startsWith("blocked earlier with")) return "reopened";
    if (t.gate && t.gate.pass === false) return "retrying";
    if (t.attempt > 1) return "requeued";
    return "open";
  }
  return t.status;
}

function taskLine(t: FeedTask): FeedLine {
  return {
    at: t.updatedAt.toISOString(),
    kind: "task",
    key: t.key,
    outcome: taskOutcome(t),
    // A claimed task still carries the previous attempt's gate; that reason belongs to the retry line, not to the claim.
    reason: t.status === "claimed" ? null : (t.blockReason ?? first(t.gate?.reasons) ?? null),
    taskId: t._id.toHexString(),
    worker: t.worker,
    id: t._id.toHexString(),
  };
}

export function unitStatus(score: 0 | 1 | null | undefined, hasState: boolean, latest: LatestTask | undefined): StageUnit["status"] {
  if (hasState && score === 1) return "solved";
  if (hasState) return "merged";
  return latest?.status ?? "open";
}

export async function buildStage(c: Collections, now = new Date()): Promise<StagePayload> {
  const [metrics, goal, inputs, states, latestTasks, claimed, feedSources, feedTasks] = await Promise.all([
    c.metrics.findOne(
      { _id: "metrics" },
      { projection: { at: 1, totals: 1, solveRate: 1, perMinute: { $slice: -PER_MINUTE_LAST }, "lessons.text": 1 } },
    ),
    c.goal.findOne(
      { _id: "goal" },
      { projection: { statement: 1, criteria: 1, guidelines: 1, outOfScope: 1, version: 1, history: { $slice: 1 } } },
    ),
    c.inputs.find({ scheduled: true }, { projection: { _id: 0, key: 1 }, sort: { key: 1 } }).toArray(),
    c.state.find({}, { projection: { _id: 0, key: 1, score: 1, "data.rule": 1 } }).toArray(),
    c.tasks
      .aggregate<LatestTask>([
        { $sort: { key: 1, createdAt: -1 } },
        {
          $group: {
            _id: "$key",
            status: { $first: "$status" },
            attempt: { $first: "$attempt" },
            hint: { $first: "$hint" },
            blockReason: { $first: "$blockReason" },
            updatedAt: { $first: "$updatedAt" },
            reasons: { $push: { $arrayElemAt: [{ $ifNull: ["$gate.reasons", []] }, 0] } },
          },
        },
      ])
      .toArray(),
    c.tasks
      .find({ status: "claimed" }, { projection: { key: 1, worker: 1, heartbeat: 1, attempt: 1 } })
      .toArray() as Promise<ClaimedTask[]>,
    c.sources
      .find(
        { kind: { $in: ["worker-run", "gate", "error"] } },
        {
          sort: { createdAt: -1 },
          limit: FEED_LINES,
          projection: {
            kind: 1,
            key: 1,
            taskId: 1,
            createdAt: 1,
            "raw.worker": 1,
            "raw.outcome": 1,
            "raw.blockReason": 1,
            "raw.failReason": 1,
            "raw.gate.pass": 1,
            "raw.gate.reasons": { $slice: 1 },
            "raw.reasons": { $slice: 1 },
            "raw.message": 1,
          },
        },
      )
      .toArray() as unknown as Promise<FeedSource[]>,
    c.tasks
      .find(
        {},
        {
          sort: { updatedAt: -1 },
          limit: FEED_LINES,
          projection: { key: 1, status: 1, attempt: 1, worker: 1, hint: 1, blockReason: 1, updatedAt: 1, "gate.pass": 1, "gate.reasons": { $slice: 1 } },
        },
      )
      .toArray() as unknown as Promise<FeedTask[]>,
  ]);

  const stateByKey = new Map(states.map((s) => [s.key, s]));
  const taskByKey = new Map(latestTasks.map((t) => [t._id, t]));

  const units: StageUnit[] = inputs.map(({ key }) => {
    const st = stateByKey.get(key);
    const lt = taskByKey.get(key);
    const rule = (st?.data as { rule?: unknown } | undefined)?.rule;
    const lastReason = lt?.reasons.find((r): r is string => typeof r === "string") ?? null;
    return {
      key,
      status: unitStatus(st?.score ?? null, !!st, lt),
      attempt: lt?.attempt ?? null,
      reason: lt?.blockReason ?? lastReason,
      rule: typeof rule === "string" ? rule : null,
      hint: lt?.hint ?? null,
      updatedAt: iso(lt?.updatedAt),
    };
  });

  const counts: StagePayload["counts"] = { units: units.length, solved: 0, merged: 0, open: 0, claimed: 0, blocked: 0, parked: 0 };
  for (const u of units) counts[u.status] += 1;

  const rows: StageWorker[] = [];
  for (const t of claimed) {
    if (!t.worker || !t.heartbeat) continue;
    const age = Math.max(0, Math.round((now.getTime() - t.heartbeat.getTime()) / 1000));
    if (age > DROP_AFTER_S) continue;
    rows.push({ worker: t.worker, key: t.key, taskId: t._id.toHexString(), attempt: t.attempt, step: null, heartbeatAge: age, alive: age <= DEAD_AFTER_S });
  }
  rows.sort((a, b) => a.worker.localeCompare(b.worker));

  const feed = [...feedSources.map(sourceLine), ...feedTasks.map(taskLine)]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, FEED_LINES * 2);

  const h0 = goal?.history?.[0];
  return {
    at: now.toISOString(),
    metrics: {
      at: iso(metrics?.at),
      totals: metrics?.totals ?? null,
      solveRate: (metrics?.solveRate ?? []).map((b) => ({ ...b, bucket: b.bucket.toISOString() })),
      perMinute: (metrics?.perMinute ?? []).map((m) => ({ ...m, minute: m.minute.toISOString() })),
      lessons: metrics?.lessons?.text ?? null,
    },
    goal: goal
      ? {
          statement: goal.statement,
          criteria: goal.criteria.map((cr) => ({ id: cr.id, text: cr.text, check: cr.check.kind })),
          guidelines: goal.guidelines,
          outOfScope: goal.outOfScope,
          version: goal.version,
          writtenAt: iso(h0?.at),
        }
      : null,
    counts,
    units,
    workers: { target: Number(process.env.WORKERS_TARGET ?? 0) || 0, alive: rows.filter((r) => r.alive).length, rows },
    feed,
  };
}
