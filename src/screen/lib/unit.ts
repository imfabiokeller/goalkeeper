// The puzzle page in one payload: the input (train pairs and test inputs
// only, never usecase/answers), the state, every attempt with its linked
// run, and for the latest attempt the program's actual outputs, the
// precedents it was shown and the rules refuted before it.

import { ObjectId } from "mongodb";
import type { Collections } from "../../shared/db.ts";
import type { Task } from "../../shared/types.ts";
import { runProgram } from "../../../usecase/sandbox.ts";
import { lastSubmitRule, progressLines } from "./stage.ts";
import type { ActualOutput, Grid, Precedent, UnitPayload, UnitTask } from "./types.ts";

type RunRow = {
  _id: ObjectId;
  taskId: ObjectId | null;
  createdAt: Date;
  tokens: { in: number; out: number; cost: number };
  outcome: string | null;
  rule: string | null;
  program: string | null;
  steps: number;
  cited: string[] | null;
  worker: string | null;
};

type TaskRow = Pick<Task, "_id" | "attempt" | "worker" | "status" | "priority" | "gate" | "blockReason" | "hint" | "createdAt" | "updatedAt" | "step" | "progress"> & {
  proposal?: { rule?: unknown; program?: unknown } | null;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

function isGrid(v: unknown): v is Grid {
  return Array.isArray(v) && v.every((row) => Array.isArray(row) && row.every((c) => typeof c === "number"));
}

function pairs(v: unknown): Array<{ input: Grid; output: Grid }> {
  if (!Array.isArray(v)) return [];
  return v.flatMap((p) => (p && isGrid(p.input) && isGrid(p.output) ? [{ input: p.input, output: p.output }] : []));
}

function testInputs(v: unknown): Array<{ input: Grid }> {
  if (!Array.isArray(v)) return [];
  return v.flatMap((p) => (p && isGrid(p.input) ? [{ input: p.input }] : []));
}

// Source ids cited by a run: the briefing's cited list, or the `[id]`
// heads of the "Library records" section when there was no briefing.
export function citedIds(cited: string[] | null | undefined, system: string | null | undefined): string[] {
  if (Array.isArray(cited) && cited.length) return cited.filter((id) => ObjectId.isValid(id));
  if (!system) return [];
  const section = system.split("\n# ").find((s) => s.startsWith("Library"));
  if (!section) return [];
  const ids = new Set<string>();
  for (const m of section.matchAll(/^\[([0-9a-f]{24})\] /gm)) ids.add(m[1]!);
  return [...ids];
}

// Actual outputs per task id, computed once: a program is immutable once
// written, so the cache never goes stale. Bounded so a long run does not
// grow the function's memory without limit.
const CACHE_MAX = 500;
const g = globalThis as { __gkActual?: Map<string, ActualOutput[]> };
const actualCache = (g.__gkActual ??= new Map());

export function actualOutputs(cacheKey: string, program: string | null, inputs: Grid[]): ActualOutput[] {
  if (!program) return inputs.map(() => null);
  const hit = actualCache.get(cacheKey);
  if (hit) return hit;
  const out: ActualOutput[] = inputs.map((grid) => {
    const r = runProgram(program, grid);
    return r.ok ? (isGrid(r.output) ? { ok: true, output: r.output } : { ok: false, error: "output is not a grid" }) : r;
  });
  if (actualCache.size >= CACHE_MAX) actualCache.delete(actualCache.keys().next().value as string);
  actualCache.set(cacheKey, out);
  return out;
}

export async function buildUnit(c: Collections, key: string): Promise<UnitPayload | null> {
  const input = await c.inputs.findOne({ _id: key }, { projection: { key: 1, name: 1, text: 1, "meta.train": 1, "meta.test": 1 } });
  if (!input) return null;

  const [state, tasks, runs, failedGates] = await Promise.all([
    c.state.findOne({ _id: key }, { projection: { data: 1, score: 1, mergedAt: 1, stateVersion: 1 } }),
    c.tasks
      .find(
        { key },
        {
          sort: { createdAt: 1 },
          projection: { attempt: 1, worker: 1, status: 1, priority: 1, gate: 1, blockReason: 1, hint: 1, createdAt: 1, updatedAt: 1, step: 1, progress: 1, "proposal.rule": 1, "proposal.program": 1 },
        },
      )
      .toArray() as unknown as Promise<TaskRow[]>,
    c.sources
      .aggregate<RunRow>([
        { $match: { key, kind: "worker-run" } },
        { $sort: { createdAt: 1 } },
        {
          $project: {
            taskId: 1,
            createdAt: 1,
            tokens: 1,
            outcome: "$raw.outcome",
            rule: "$raw.proposal.rule",
            program: "$raw.proposal.program",
            steps: { $size: { $ifNull: ["$raw.steps", []] } },
            cited: "$raw.briefing.cited",
            worker: "$raw.worker",
          },
        },
      ])
      .toArray(),
    c.sources
      .find({ key, kind: "gate", "raw.gate.pass": false }, { sort: { createdAt: 1 }, projection: { "raw.proposal.rule": 1 } })
      .toArray(),
  ]);

  const runByTask = new Map<string, RunRow>();
  for (const r of runs) if (r.taskId) runByTask.set(r.taskId.toHexString(), r); // last run per task wins

  const unitTasks: UnitTask[] = tasks.map((t) => {
    const run = runByTask.get(t._id.toHexString());
    return {
      id: t._id.toHexString(),
      attempt: t.attempt,
      // The merge clears task.worker; the run remembers who wrote it.
      worker: t.worker ?? run?.worker ?? null,
      status: t.status,
      priority: t.priority,
      gate: t.gate,
      blockReason: t.blockReason,
      hint: t.hint,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      steps: run ? run.steps : null,
      tokens: run ? run.tokens : null,
      seconds: run ? Math.max(0, Math.round((run.createdAt.getTime() - t.createdAt.getTime()) / 1000)) : null,
      sourceId: run ? run._id.toHexString() : null,
      outcome: run?.outcome ?? null,
      rule: str(t.proposal?.rule) ?? run?.rule ?? lastSubmitRule(t.progress),
      step: typeof t.step === "number" ? t.step : null,
      progress: progressLines(t.progress),
    };
  });

  const train = pairs(input.meta?.train);
  const test = testInputs(input.meta?.test);
  const data = (state?.data ?? null) as { rule?: unknown; program?: unknown } | null;

  let latest: UnitPayload["latest"] = null;
  const last = tasks.at(-1);
  if (last) {
    const run = runByTask.get(last._id.toHexString());
    const program = str(last.proposal?.program) ?? run?.program ?? str(data?.program);
    // A live attempt has no proposal and no run yet; its latest try_submit line carries the draft's rule.
    const rule = str(last.proposal?.rule) ?? run?.rule ?? (run ? null : lastSubmitRule(last.progress)) ?? str(data?.rule);
    const cacheKey = `${last._id.toHexString()}:${run?._id.toHexString() ?? "task"}`;

    let ids: string[] = [];
    if (run) {
      const cited = citedIds(run.cited, null);
      if (cited.length) ids = cited;
      else {
        const sys = await c.sources.findOne({ _id: run._id }, { projection: { "raw.system": 1 } });
        ids = citedIds(null, str(sys?.raw?.system));
      }
    }
    const precedentDocs = ids.length
      ? ((await c.sources
          .find(
            { _id: { $in: ids.map((id) => new ObjectId(id)) } },
            { projection: { kind: 1, key: 1, createdAt: 1, "enrichment.gist": 1, "raw.worker": 1, "raw.gate.pass": 1, "raw.outcome": 1 } },
          )
          .toArray()) as unknown as Array<{
          _id: ObjectId;
          kind: string;
          key: string | null;
          createdAt: Date;
          enrichment?: { gist?: string } | null;
          raw?: { worker?: string; gate?: { pass?: boolean } | null; outcome?: string };
        }>)
      : [];
    // Thumbnails: the first example input of each precedent's puzzle.
    const precedentKeys = [...new Set(precedentDocs.flatMap((d) => (d.key && d.key !== key ? [d.key] : [])))];
    const thumbDocs = precedentKeys.length
      ? await c.inputs.find({ _id: { $in: precedentKeys } }, { projection: { key: 1, "meta.train": { $slice: 1 } } }).toArray()
      : [];
    const thumbByKey = new Map(thumbDocs.map((d) => [d.key, pairs(d.meta?.train)[0]?.input ?? null]));
    const byId = new Map(precedentDocs.map((d) => [d._id.toHexString(), d]));
    const precedents: Precedent[] = ids.flatMap((id) => {
      const d = byId.get(id);
      if (!d) return [];
      const pass = typeof d.raw?.gate?.pass === "boolean" ? d.raw.gate.pass : d.raw?.outcome === "block" ? false : null;
      return [
        {
          id,
          kind: d.kind,
          key: d.key,
          gist: d.enrichment?.gist ?? null,
          score: null,
          thumb: d.key ? (thumbByKey.get(d.key) ?? (d.key === key ? (train[0]?.input ?? null) : null)) : null,
          worker: d.raw?.worker ?? null,
          at: d.createdAt instanceof Date ? d.createdAt.toISOString() : null,
          pass,
        },
      ];
    });

    // Rules refuted before this attempt: gate failures on the key, plus
    // failed proposals kept on earlier tasks, in order, without repeats.
    const refuted = new Set<string>();
    for (const gsrc of failedGates) {
      const r = str((gsrc.raw?.proposal as { rule?: unknown } | undefined)?.rule);
      if (r) refuted.add(r);
    }
    for (const t of tasks) {
      if (t._id.equals(last._id)) continue;
      if (t.gate && !t.gate.pass) {
        const r = str(t.proposal?.rule);
        if (r) refuted.add(r);
      }
    }

    const all = actualOutputs(cacheKey, program, [...train.map((p) => p.input), ...test.map((p) => p.input)]);
    latest = {
      taskId: last._id.toHexString(),
      program,
      rule,
      actual: all.slice(0, train.length),
      actualTest: all.slice(train.length),
      precedents,
      refutedRules: [...refuted],
    };
  }

  return {
    key: input.key,
    name: input.name,
    text: input.text,
    train,
    test,
    state: state
      ? {
          data: state.data,
          rule: str(data?.rule),
          program: str(data?.program),
          score: state.score ?? null,
          mergedAt: state.mergedAt.toISOString(),
          stateVersion: state.stateVersion,
        }
      : null,
    tasks: unitTasks,
    latest,
  };
}
