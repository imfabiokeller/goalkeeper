// The stage view in one payload: eight projected queries, no full
// documents. Unit status is derived here, not stored anywhere.

import type { Collections } from "../../shared/db.ts";
import type { ProgressEntry, Task, TaskStatus } from "../../shared/types.ts";
import type { CardStatus, FeedLine, ProgressLine, StageCard, StagePayload, StageUnit, StageWorker } from "./types.ts";

export const PER_MINUTE_LAST = 60;
export const FEED_LINES = 15;
export const DEAD_AFTER_S = 30;
export const DROP_AFTER_S = 90;
export const PROGRESS_LAST = 8; // progress entries per worker row
export const DEAD_ROW_MS = 30_000; // a dead worker's row stays this long from diedAt
export const CARDS_MAX = 8; // cards on the stage at 1920x1080
export const RESUMED_MS = 120_000; // a claimed task whose diedAt is this recent reads "Resumed"
export const RECENT_CARD_MS = 10 * 60_000; // finished tasks this recent may fill the grid

const iso = (d: Date | null | undefined): string | null => (d instanceof Date ? d.toISOString() : null);

// task.progress on the wire: ISO dates, optional fields filled in, at most
// the last `last` entries (oldest first, like the task keeps them).
export function progressLines(entries: ProgressEntry[] | null | undefined, last = Infinity): ProgressLine[] {
  if (!Array.isArray(entries)) return [];
  const tail = Number.isFinite(last) ? entries.slice(-Math.max(0, last)) : entries;
  return tail.map((e) => ({
    at: e.at instanceof Date ? e.at.toISOString() : String(e.at),
    step: e.step,
    tool: e.tool,
    ok: typeof e.ok === "boolean" ? e.ok : null,
    reasons: Array.isArray(e.reasons) ? e.reasons : [],
    rule: typeof e.rule === "string" && e.rule.trim() ? e.rule : null,
  }));
}

// The rule of the last try_submit or submit line, for a live attempt that
// has no proposal and no run source yet.
export function lastSubmitRule(entries: ProgressEntry[] | null | undefined): string | null {
  if (!Array.isArray(entries)) return null;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i]!;
    if ((e.tool === "try_submit" || e.tool === "submit") && typeof e.rule === "string" && e.rule.trim()) return e.rule;
  }
  return null;
}

type LatestTask = {
  _id: string; // key
  status: TaskStatus;
  attempt: number;
  hint: string | null;
  blockReason: string | null;
  step: number | null;
  updatedAt: Date;
  reasons: Array<string | null>; // first gate reason per task, newest first
};

export type ClaimedTask = Pick<Task, "_id" | "key" | "worker" | "heartbeat" | "attempt" | "step" | "progress"> &
  Partial<Pick<Task, "hint" | "lastWorker" | "diedAt" | "updatedAt" | "blockReason">> & { gate?: { pass?: boolean; reasons?: string[] } | null };

// A task that finished recently (merged, blocked, or requeued after a
// failed gate): it fills the grid next to the claimed ones.
export type RecentTask = Pick<Task, "_id" | "key" | "status" | "attempt" | "worker" | "hint" | "blockReason" | "updatedAt"> &
  Partial<Pick<Task, "lastWorker" | "diedAt" | "step" | "progress">> & { gate?: { pass?: boolean; reasons?: string[] } | null; proposal?: { rule?: unknown } | null };

const lastTool = (entries: ProgressEntry[] | null | undefined): string | null => {
  const e = Array.isArray(entries) ? entries.at(-1) : undefined;
  return e ? e.tool : null;
};

// The cards: every claimed task (working or resumed), the tasks that
// died in the last 30 s (stopped), then the most recent finished ones
// until CARDS_MAX, newest first. Solved needs the merged state's score.
export function buildCards(claimed: ClaimedTask[], dead: DeadTask[], recent: RecentTask[], scoreByKey: Map<string, 0 | 1 | null>, now: Date): StageCard[] {
  const cards: StageCard[] = [];
  const seen = new Set<string>();
  for (const t of claimed) {
    if (!t.worker || !t.heartbeat) continue;
    if (now.getTime() - t.heartbeat.getTime() > DROP_AFTER_S * 1000) continue;
    const resumed = t.diedAt instanceof Date && !!t.lastWorker && now.getTime() - t.diedAt.getTime() <= RESUMED_MS;
    seen.add(t.key);
    cards.push({
      key: t.key,
      taskId: t._id.toHexString(),
      status: resumed ? "resumed" : "working",
      attempt: t.attempt,
      worker: t.worker,
      lastWorker: resumed ? (t.lastWorker ?? null) : null,
      diedAt: resumed && t.diedAt instanceof Date ? t.diedAt.toISOString() : null,
      step: typeof t.step === "number" ? t.step : null,
      lastTool: lastTool(t.progress),
      reason: first(t.gate?.reasons),
      hint: t.hint ?? null,
      rule: lastSubmitRule(t.progress),
      updatedAt: (t.updatedAt ?? t.heartbeat).toISOString(),
    });
  }
  for (const t of dead) {
    if (!t.lastWorker || !(t.diedAt instanceof Date) || seen.has(t.key)) continue;
    const sinceMs = now.getTime() - t.diedAt.getTime();
    if (sinceMs < 0 || sinceMs > DEAD_ROW_MS) continue;
    seen.add(t.key);
    cards.push({
      key: t.key,
      taskId: t._id.toHexString(),
      status: "stopped",
      attempt: Math.max(1, t.attempt - 1),
      worker: t.lastWorker,
      lastWorker: t.lastWorker,
      diedAt: t.diedAt.toISOString(),
      step: typeof t.step === "number" ? t.step : null,
      lastTool: lastTool(t.progress),
      reason: null,
      hint: null,
      rule: lastSubmitRule(t.progress),
      updatedAt: t.diedAt.toISOString(),
    });
  }
  const live = cards.length;
  const finished = [...recent].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  for (const t of finished) {
    if (cards.length >= CARDS_MAX) break;
    if (seen.has(t.key) || t.status === "claimed") continue;
    if (now.getTime() - t.updatedAt.getTime() > RECENT_CARD_MS) continue;
    let status: CardStatus;
    if (t.status === "merged") status = scoreByKey.get(t.key) === 1 ? "solved" : "merged";
    else if (t.status === "blocked" || t.status === "parked") status = "blocked";
    else if (t.status === "open" && (t.hint || (t.gate && t.gate.pass === false) || t.attempt > 1)) status = "retrying";
    else continue;
    seen.add(t.key);
    const rule = typeof t.proposal?.rule === "string" && t.proposal.rule.trim() ? t.proposal.rule : lastSubmitRule(t.progress);
    cards.push({
      key: t.key,
      taskId: t._id.toHexString(),
      status,
      attempt: t.attempt,
      worker: t.worker ?? t.lastWorker ?? null,
      lastWorker: t.lastWorker ?? null,
      diedAt: null,
      step: typeof t.step === "number" ? t.step : null,
      lastTool: lastTool(t.progress),
      reason: t.blockReason ?? first(t.gate?.reasons),
      hint: t.hint ?? null,
      rule,
      updatedAt: t.updatedAt.toISOString(),
    });
  }
  return cards.slice(0, Math.max(CARDS_MAX, live));
}

// A task the reaper requeued recently, whatever its status now: another
// worker may already hold it (a live row on the same key) while the dead
// row is still shown.
export type DeadTask = Pick<Task, "_id" | "key" | "attempt" | "lastWorker" | "diedAt" | "step" | "progress">;

// Worker rows: one per claimed task with a fresh enough heartbeat, plus a
// dead row per task whose reaper death is within DEAD_ROW_MS.
export function workerRows(claimed: ClaimedTask[], dead: DeadTask[], now: Date): StageWorker[] {
  const rows: StageWorker[] = [];
  for (const t of claimed) {
    if (!t.worker || !t.heartbeat) continue;
    const age = Math.max(0, Math.round((now.getTime() - t.heartbeat.getTime()) / 1000));
    if (age > DROP_AFTER_S) continue;
    rows.push({
      worker: t.worker,
      key: t.key,
      taskId: t._id.toHexString(),
      attempt: t.attempt,
      step: typeof t.step === "number" ? t.step : null,
      progress: progressLines(t.progress, PROGRESS_LAST),
      heartbeatAge: age,
      alive: age <= DEAD_AFTER_S,
      diedAt: null,
    });
  }
  for (const t of dead) {
    if (!t.lastWorker || !(t.diedAt instanceof Date)) continue;
    const sinceMs = now.getTime() - t.diedAt.getTime();
    if (sinceMs < 0 || sinceMs > DEAD_ROW_MS) continue;
    rows.push({
      worker: t.lastWorker,
      key: t.key,
      taskId: t._id.toHexString(),
      attempt: Math.max(1, t.attempt - 1), // the attempt that died; the reaper already bumped it
      step: typeof t.step === "number" ? t.step : null,
      progress: progressLines(t.progress, PROGRESS_LAST),
      heartbeatAge: Math.round(sinceMs / 1000),
      alive: false,
      diedAt: t.diedAt.toISOString(),
    });
  }
  rows.sort((a, b) => a.worker.localeCompare(b.worker) || (a.diedAt ? 1 : 0) - (b.diedAt ? 1 : 0));
  return rows;
}

// One "requeued" feed line per recent reaper death, attributed to the
// worker that died. Dated at diedAt so it sorts where the kill happened.
export function deadLines(dead: DeadTask[], now: Date): FeedLine[] {
  return dead.flatMap((t) => {
    if (!(t.diedAt instanceof Date)) return [];
    const sinceMs = now.getTime() - t.diedAt.getTime();
    if (sinceMs < 0 || sinceMs > DEAD_ROW_MS) return [];
    const id = t._id.toHexString();
    return [{ at: t.diedAt.toISOString(), kind: "task" as const, key: t.key, outcome: "requeued", reason: null, taskId: id, worker: t.lastWorker ?? null, id }];
  });
}

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

type FeedTask = Pick<Task, "_id" | "key" | "status" | "attempt" | "worker" | "hint" | "blockReason" | "updatedAt" | "lastWorker"> & {
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
  const outcome = taskOutcome(t);
  return {
    at: t.updatedAt.toISOString(),
    kind: "task",
    key: t.key,
    outcome,
    // A claimed task still carries the previous attempt's gate; that reason belongs to the retry line, not to the claim.
    reason: t.status === "claimed" ? null : (t.blockReason ?? first(t.gate?.reasons) ?? null),
    taskId: t._id.toHexString(),
    // The reaper clears worker on a requeue; the line names the worker that died.
    worker: outcome === "requeued" ? (t.lastWorker ?? t.worker) : t.worker,
    id: t._id.toHexString(),
  };
}

export function unitStatus(score: 0 | 1 | null | undefined, hasState: boolean, latest: LatestTask | undefined): StageUnit["status"] {
  if (hasState && score === 1) return "solved";
  if (hasState) return "merged";
  return latest?.status ?? "open";
}

export async function buildStage(c: Collections, now = new Date()): Promise<StagePayload> {
  const deadSince = new Date(now.getTime() - DEAD_ROW_MS);
  const [metrics, goal, inputs, states, latestTasks, claimed, recent, dead, feedSources, feedTasks] = await Promise.all([
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
            step: { $first: { $ifNull: ["$step", null] } },
            updatedAt: { $first: "$updatedAt" },
            reasons: { $push: { $arrayElemAt: [{ $ifNull: ["$gate.reasons", []] }, 0] } },
          },
        },
      ])
      .toArray(),
    c.tasks
      .find(
        { status: "claimed" },
        { projection: { key: 1, worker: 1, heartbeat: 1, attempt: 1, step: 1, hint: 1, lastWorker: 1, diedAt: 1, updatedAt: 1, "gate.pass": 1, "gate.reasons": { $slice: 1 }, progress: { $slice: -PROGRESS_LAST } } },
      )
      .toArray() as Promise<ClaimedTask[]>,
    c.tasks
      .find(
        { status: { $in: ["merged", "blocked", "open"] }, updatedAt: { $gte: new Date(now.getTime() - RECENT_CARD_MS) } },
        {
          sort: { updatedAt: -1 },
          limit: CARDS_MAX * 3,
          projection: { key: 1, status: 1, attempt: 1, worker: 1, lastWorker: 1, hint: 1, blockReason: 1, updatedAt: 1, step: 1, "gate.pass": 1, "gate.reasons": { $slice: 1 }, "proposal.rule": 1, progress: { $slice: -PROGRESS_LAST } },
        },
      )
      .toArray() as unknown as Promise<RecentTask[]>,
    c.tasks
      .find({ diedAt: { $gte: deadSince } }, { projection: { key: 1, attempt: 1, lastWorker: 1, diedAt: 1, step: 1, progress: { $slice: -PROGRESS_LAST } } })
      .toArray() as Promise<DeadTask[]>,
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
          projection: { key: 1, status: 1, attempt: 1, worker: 1, lastWorker: 1, hint: 1, blockReason: 1, updatedAt: 1, "gate.pass": 1, "gate.reasons": { $slice: 1 } },
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
      step: typeof lt?.step === "number" ? lt.step : null,
      updatedAt: iso(lt?.updatedAt),
    };
  });

  const counts: StagePayload["counts"] = { units: units.length, solved: 0, merged: 0, open: 0, claimed: 0, blocked: 0, parked: 0 };
  for (const u of units) counts[u.status] += 1;

  const rows = workerRows(claimed, dead, now);
  const cards = buildCards(claimed, dead, recent, new Map(states.map((st) => [st.key, st.score ?? null])), now);

  // A reaped task that is still open also shows up as a "requeued" task
  // line (its updatedAt is the death); the dead line is the same event, so
  // the task line yields to it.
  const requeued = deadLines(dead, now);
  const deadIds = new Set(requeued.map((l) => l.id));
  const taskLines = feedTasks.map(taskLine).filter((l) => !(l.outcome === "requeued" && deadIds.has(l.id)));
  const feed = [...feedSources.map(sourceLine), ...taskLines, ...requeued]
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
    cards,
    units,
    workers: { target: Number(process.env.WORKERS_TARGET ?? 0) || 0, alive: rows.filter((r) => r.alive).length, rows },
    feed,
  };
}
