// One worker iteration: claim, assemble, run, gate, write, exit. Holds
// nothing between iterations. Every task update carries the precondition
// { status: "claimed", worker } so a task the reaper took back is never
// overwritten, and the state merge carries a stateVersion precondition so
// two workers on one key cannot both win.

import type { LanguageModel } from "ai";
import { assemble } from "../context/assemble.ts";
import { retrieve, type Passage, type RetrieveResult } from "../context/retrieve.ts";
import { synthesize, type Briefing, type SynthesizeArgs } from "../context/synthesize.ts";
import { gate as realGate } from "../gate/gate.ts";
import type { Collections } from "../shared/db.ts";
import type { CheckInput, CheckState, Enrichment, GateResult, Goal, Input, Source, State, Task } from "../shared/types.ts";
import { claim, heartbeat, stepDone, takeKill } from "./claim.ts";
import { runTask, type RunResult } from "./run.ts";
import { enrich as realEnrich, enrichSource, writeErrorSource, writeGateSource, writeRun, type EnrichFn } from "./write.ts";

export type GateFn = (goal: Goal, task: Pick<Task, "key" | "criteria">, proposal: unknown, input: CheckInput, state: CheckState) => GateResult;
export type PlanFn = (c: Collections, holder: string, opts: { enrich: (source: Source) => Promise<Enrichment> }) => Promise<unknown>;
export type RetrieveFn = (c: Collections, query: string, opts: { excludeKey: string }) => Promise<RetrieveResult>;
export type SynthesizeFn = (args: SynthesizeArgs) => Promise<Briefing | null>;

export type IterationOptions = {
  model?: LanguageModel;
  gate?: GateFn;
  enrich?: EnrichFn;
  plan?: PlanFn | null; // null: never plan (tests); undefined: the planner module if present
  retrieve?: RetrieveFn;
  synthesize?: SynthesizeFn | null; // null: no briefing, show the raw hits (tests)
  deadlineMs?: number; // default 4 minutes
  heartbeatMs?: number; // default 15 s
  maxSteps?: number;
  planEveryMs?: number; // default PLAN_EVERY_MS (env PLAN_EVERY_MS)
  kill?: (() => void) | null; // null: ignore the kill switch (tests); default SIGKILL
};

// A failed gate reopens the task with attempt + 1 while attempt is below
// this; the attempt that reaches it blocks with the reasons.
export const MAX_ATTEMPTS = 5;
// Errors (provider down, credits out) reopen a task this many times, then block it.
export const MAX_ERROR_ATTEMPTS = 5;

export type IterationOutcome = "idle" | "merged" | "reopened" | "blocked" | "raced" | "error";

// Flash without thinking takes long steps on hard puzzles; 6 minutes, DEADLINE_MS overrides.
export const DEADLINE_MS = Number(process.env.DEADLINE_MS ?? 6 * 60_000);
export const HEARTBEAT_MS = 15_000;

const PLANNER_MODULE = "../planner/plan.ts";

// The planner lives in another stream and may not exist yet. Resolve it
// at runtime through a computed path so a missing module is a skip, not a
// build error.
async function loadPlan(): Promise<PlanFn | null> {
  try {
    const mod = (await import(PLANNER_MODULE)) as { plan?: PlanFn };
    return typeof mod.plan === "function" ? mod.plan : null;
  } catch {
    return null;
  }
}

function claimed(task: Task, workerId: string) {
  return { _id: task._id, status: "claimed" as const, worker: workerId };
}

export function checkInput(input: Input): CheckInput {
  return { key: input.key, name: input.name, text: input.text, meta: input.meta };
}

// The task's own key is never in `merged`: a recheck replaces the state
// for that key, so the old record must not count as a duplicate. Other
// keys pass through as given.
export function checkState(task: Pick<Task, "key">, merged: Record<string, unknown> = {}): CheckState {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(merged)) if (k !== task.key) out[k] = v;
  return { merged: out };
}

async function tryPlan(c: Collections, workerId: string, opts: IterationOptions): Promise<void> {
  const plan = opts.plan === undefined ? await loadPlan() : opts.plan;
  if (!plan) return;
  const enrichFn = opts.enrich ?? realEnrich;
  try {
    await plan(c, workerId, { enrich: (source) => enrichSource(source, enrichFn) });
  } catch (err) {
    await writeErrorSource(c, { task: null, worker: workerId, error: err, where: "plan" }).catch(() => undefined);
  }
}

// With more open tasks than workers no worker is ever idle, so the
// planner would never run again after the first turn: nothing scored,
// metrics stale. Before each claim: if the last planner turn is older
// than PLAN_EVERY_MS and the lock is free, plan. The lock's acquire keeps
// it one worker at a time; two cheap reads keep the others from trying.
export const PLAN_EVERY_MS = 60_000;

export async function planDue(c: Collections, everyMs: number, now = new Date()): Promise<boolean> {
  const [lock, turn] = await Promise.all([
    c.locks.findOne({ _id: "planner" }, { projection: { until: 1 } }),
    c.sources.findOne({ kind: "planner-turn" }, { sort: { createdAt: -1 }, projection: { createdAt: 1 } }),
  ]);
  if (lock && lock.until.getTime() > now.getTime()) return false;
  return !turn || turn.createdAt.getTime() < now.getTime() - everyMs;
}

export async function iteration(c: Collections, workerId: string, opts: IterationOptions = {}): Promise<IterationOutcome> {
  const everyMs = opts.planEveryMs ?? Number(process.env.PLAN_EVERY_MS ?? PLAN_EVERY_MS);
  if (opts.plan !== null && (await planDue(c, everyMs))) await tryPlan(c, workerId, opts);

  const task = await claim(c, workerId);
  if (!task) {
    await tryPlan(c, workerId, opts);
    return "idle";
  }

  const beat = setInterval(() => {
    heartbeat(c, task._id, workerId).catch(() => undefined);
    // The demo kill: die mid-task like a crashed container, no cleanup.
    // The task stays claimed with a stale heartbeat until the reaper.
    if (opts.kill !== null) {
      takeKill(c)
        .then((yes) => {
          if (yes) (opts.kill ?? (() => process.kill(process.pid, "SIGKILL")))();
        })
        .catch(() => undefined);
    }
  }, opts.heartbeatMs ?? HEARTBEAT_MS);

  try {
    return await work(c, workerId, task, opts);
  } catch (err) {
    // Never leave a task claimed: back to open, attempt + 1, and an error
    // source. If the reaper already took it, the precondition skips it.
    // After MAX_ERROR_ATTEMPTS the task blocks with the error so a broken
    // provider cannot spin one task forever; the reason shows on screen.
    const message = err instanceof Error ? err.message : String(err);
    const exhausted = task.attempt >= MAX_ERROR_ATTEMPTS;
    await c.tasks
      .findOneAndUpdate(claimed(task, workerId), {
        $set: exhausted
          ? { status: "blocked", worker: null, heartbeat: null, blockReason: `error: ${message.slice(0, 200)}`, updatedAt: new Date() }
          : { status: "open", worker: null, heartbeat: null, updatedAt: new Date() },
        $inc: { attempt: 1 },
      })
      .catch(() => undefined);
    await writeErrorSource(c, { task, worker: workerId, error: err, where: "iteration" }).catch(() => undefined);
    return "error";
  } finally {
    clearInterval(beat);
  }
}

async function work(c: Collections, workerId: string, task: Task, opts: IterationOptions): Promise<IterationOutcome> {
  const gateFn = opts.gate ?? realGate;
  const enrichFn = opts.enrich ?? realEnrich;
  const retrieveFn = opts.retrieve ?? retrieve;

  const [goal, input, state, failures, metrics] = await Promise.all([
    c.goal.findOne({ _id: "goal" }),
    c.inputs.findOne({ _id: task.key }),
    c.state.findOne({ _id: task.key }),
    c.sources
      .find({ key: task.key, kind: "gate", "raw.gate.pass": false })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray() as Promise<Source[]>,
    // The lessons digest the planner derived from recent gate verdicts.
    // Absent before the first planner run; then the section is skipped.
    c.metrics.findOne({ _id: "metrics" }, { projection: { "lessons.text": 1 } }),
  ]);
  const lessons = metrics?.lessons?.text ?? null;
  if (!goal) throw new Error("no goal document");
  if (!input) throw new Error(`no input for key ${task.key}`);

  const criteriaText = task.criteria
    .map((id) => goal.criteria.find((cr) => cr.id === id)?.text ?? "")
    .filter(Boolean)
    .join(" ");
  const retrieved = await retrieveFn(c, `${criteriaText}\n${input.text.slice(0, 300)}`, { excludeKey: task.key });
  const synthesizeFn = opts.synthesize === undefined ? synthesize : opts.synthesize;
  const briefing = synthesizeFn ? await synthesizeFn({ goal, task, hits: retrieved.passages }) : null;

  const ctx = assemble({ goal, task, input, state, failures, passages: retrieved.passages, briefing, lessons });

  const abort = AbortSignal.timeout(opts.deadlineMs ?? DEADLINE_MS);
  const run: RunResult = await runTask({
    system: ctx.system,
    messages: ctx.messages,
    inputText: input.text,
    readState: async (key) => (await c.state.findOne({ _id: key }))?.data ?? null,
    search: async (query): Promise<Passage[]> => (await retrieveFn(c, query, { excludeKey: task.key })).passages,
    dryRun: (proposal) => gateFn(goal, task, proposal, checkInput(input), checkState(task)),
    model: opts.model,
    abortSignal: abort,
    maxSteps: opts.maxSteps,
    // Live progress on the task document, one write per finished step.
    onStep: (entry) => stepDone(c, task._id, workerId, entry),
  });

  let gateResult: GateResult | null = null;
  let outcome: IterationOutcome;
  const now = () => new Date();

  if (run.outcome.type === "submit") {
    const proposal = run.outcome.proposal;
    gateResult = gateFn(goal, task, proposal, checkInput(input), checkState(task));
    if (gateResult.pass) {
      const merged = await mergeState(c, task, proposal, state, goal.version);
      if (!merged) {
        await c.tasks.findOneAndUpdate(claimed(task, workerId), {
          $set: { status: "open", worker: null, heartbeat: null, hint: JSON.stringify(proposal), updatedAt: now() },
        });
        outcome = "raced";
      } else {
        await c.tasks.findOneAndUpdate(claimed(task, workerId), {
          $set: { status: "merged", worker: null, heartbeat: null, proposal, gate: gateResult, updatedAt: now() },
        });
        outcome = "merged";
      }
    } else {
      await writeGateSource(c, { task, gate: gateResult, proposal, worker: workerId, enrich: enrichFn });
      outcome = await failGate(c, workerId, task, gateResult, proposal);
    }
  } else if (run.outcome.type === "block") {
    await c.tasks.findOneAndUpdate(claimed(task, workerId), {
      $set: { status: "blocked", worker: null, heartbeat: null, blockReason: run.outcome.reason, updatedAt: now() },
    });
    outcome = "blocked";
  } else {
    // No submit or block within the budget: same path as a gate failure.
    gateResult = { pass: false, reasons: [run.outcome.reason], checks: { run: { pass: false, reasons: [run.outcome.reason] } } };
    await writeGateSource(c, { task, gate: gateResult, proposal: null, worker: workerId, enrich: enrichFn });
    outcome = await failGate(c, workerId, task, gateResult, null);
  }

  await writeRun(c, {
    task,
    system: ctx.system,
    messages: ctx.messages,
    responseMessages: run.messages,
    steps: run.steps,
    outcome: run.outcome,
    gate: gateResult,
    usage: run.usage,
    contextTokens: ctx.contextTokens,
    retrievalDegraded: retrieved.degraded,
    reranked: retrieved.reranked,
    briefing,
    worker: workerId,
    enrich: enrichFn,
  });

  return outcome;
}

// A failed gate (or a run that never submitted): reopen with attempt + 1
// below MAX_ATTEMPTS, block with the reasons at MAX_ATTEMPTS. The failed
// proposal stays on the task so the screen and the next attempt see it.
async function failGate(
  c: Collections,
  workerId: string,
  task: Task,
  gateResult: GateResult,
  proposal: Record<string, unknown> | null,
): Promise<IterationOutcome> {
  const updatedAt = new Date();
  if (task.attempt < MAX_ATTEMPTS) {
    await c.tasks.findOneAndUpdate(claimed(task, workerId), {
      $set: { status: "open", worker: null, heartbeat: null, attempt: task.attempt + 1, proposal, gate: gateResult, updatedAt },
    });
    return "reopened";
  }
  await c.tasks.findOneAndUpdate(claimed(task, workerId), {
    $set: { status: "blocked", worker: null, heartbeat: null, proposal, gate: gateResult, blockReason: gateResult.reasons.join("; "), updatedAt },
  });
  return "blocked";
}

// Upsert with a precondition: absent, or stateVersion equal to what this
// iteration read. Returns false on a lost race (a duplicate key on insert,
// or no document matching the version).
async function mergeState(c: Collections, task: Task, data: unknown, read: State | null, version: number): Promise<boolean> {
  const mergedAt = new Date();
  if (read) {
    const r = await c.state.findOneAndUpdate(
      { _id: task.key, stateVersion: read.stateVersion },
      { $set: { data, version, stateVersion: read.stateVersion + 1, taskId: task._id, mergedAt } },
      { returnDocument: "after" },
    );
    return r !== null;
  }
  try {
    const r = await c.state.findOneAndUpdate(
      { _id: task.key, stateVersion: { $exists: false } },
      { $set: { key: task.key, data, version, stateVersion: 1, taskId: task._id, mergedAt } },
      { upsert: true, returnDocument: "after" },
    );
    return r !== null;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false;
    throw err;
  }
}
