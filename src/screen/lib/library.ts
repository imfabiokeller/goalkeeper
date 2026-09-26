// The library page: how big the raw record is right now and every solve
// on a timeline. Entries and tokens per kind off `sources`, bytes on disk
// off $collStats, the rules stored (solved off `state`, refuted off failed
// gate sources), the growth line off metrics.perMinute (cumulative
// tokens), the solve-rate buckets joined with library size, one row per
// solved puzzle (with a tiny thumbnail) and the newest records classified
// as worked, dead, gate, run.

import type { Collections } from "../../shared/db.ts";
import { estimateTokens } from "./format.ts";
import type { Grid, LibraryPayload, LibraryRow, LibraryRowKind, LibrarySolve } from "./types.ts";

const NEWEST = 20;
const LIBRARY_ROWS = 40;
const GIST_CHARS = 240;
const THUMB = 6;
const BUCKET_MS = 15 * 60_000;

type SolveDoc = { _id: string; key: string; scoredAt?: Date | null; mergedAt: Date; data?: { rule?: unknown } | null; taskId?: unknown };

type RowDoc = {
  _id: { toHexString(): string };
  kind: string;
  key: string | null;
  createdAt: Date;
  tokens?: { in?: number; out?: number };
  text?: string;
  enrichment?: { gist?: string } | null;
  raw?: {
    worker?: string;
    gate?: { pass?: boolean; reasons?: string[] } | null;
    reasons?: string[];
    proposal?: { rule?: unknown } | null;
    message?: string;
    outcome?: string;
    steps?: number;
    tests?: number;
  };
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

// A grid sampled down to at most THUMB by THUMB cells.
export function thumb6(grid: unknown): Grid | null {
  if (!Array.isArray(grid) || !grid.length || !Array.isArray(grid[0])) return null;
  const h = grid.length;
  const w = (grid[0] as unknown[]).length;
  if (!w) return null;
  const rows = Math.min(THUMB, h);
  const cols = Math.min(THUMB, w);
  const out: Grid = [];
  // Each thumb cell is the most common non-zero color of its block, so a
  // sparse grid keeps its few colored cells.
  for (let y = 0; y < rows; y++) {
    const row: number[] = [];
    const y0 = Math.floor((y * h) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / rows));
    for (let x = 0; x < cols; x++) {
      const x0 = Math.floor((x * w) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / cols));
      const count = new Map<number, number>();
      for (let yy = y0; yy < y1; yy++)
        for (let xx = x0; xx < x1; xx++) {
          const v = (grid[yy] as unknown[])?.[xx];
          if (typeof v === "number" && v) count.set(v, (count.get(v) ?? 0) + 1);
        }
      let best = 0;
      let n = 0;
      for (const [v, k] of count) if (k > n) (best = v), (n = k);
      row.push(best);
    }
    out.push(row);
  }
  return out;
}

// One record's kind and one-line text for the rows of the whole library:
// worked is a run whose gate passed, dead is a refuted rule (a run or a
// gate verdict with a proposal the gate failed), gate is a verdict
// without a rule, run is anything else a worker wrote.
export function classifyRow(d: RowDoc): { kind: LibraryRowKind; text: string } {
  const rule = str(d.raw?.proposal?.rule);
  const reasons = d.raw?.gate?.reasons ?? d.raw?.reasons ?? [];
  const gist = (d.enrichment?.gist ?? d.text ?? "").replace(/\s+/g, " ").slice(0, GIST_CHARS);
  switch (d.kind) {
    case "worker-run": {
      if (d.raw?.gate?.pass === true) return { kind: "worked", text: rule ?? gist };
      if (rule) return { kind: "dead", text: rule };
      const tests = d.raw?.tests ?? 0;
      const who = d.raw?.worker ? `agent ${d.raw.worker.replace(/^w-/, "")}` : "agent";
      const outcome = d.raw?.outcome === "block" ? "blocked" : reasons[0] ? `gate: ${reasons[0]}` : "";
      return { kind: "run", text: `${who} · ${d.raw?.steps ?? 0} steps · ${tests} test run${tests === 1 ? "" : "s"}${outcome ? ` · ${outcome}` : ""}` };
    }
    case "gate":
      if (rule) return { kind: "dead", text: rule };
      return { kind: "gate", text: reasons[0] ? `gate: ${reasons[0]}` : gist };
    case "error":
      return { kind: "error", text: d.raw?.message ?? gist };
    default:
      return { kind: "planner", text: gist };
  }
}

// The rows filter: which records the "whole library" list shows, matched
// in the database so a chip searches every record, not the newest 40.
export type RowFilter = "all" | "worked" | "dead" | "gate" | "run";
export function rowFilterMatch(kind: RowFilter): Record<string, unknown> {
  if (kind === "worked") return { kind: "worker-run", "raw.gate.pass": true };
  if (kind === "dead") return { "raw.gate.pass": false, "raw.proposal.rule": { $type: "string" } };
  if (kind === "gate") return { kind: "gate" };
  if (kind === "run") return { kind: "worker-run" };
  return {};
}

export async function buildLibrary(c: Collections, rowFilter: RowFilter = "all"): Promise<LibraryPayload> {
  const [perKind, storage, refutedRules, metrics, newest, goal, solveDocs, rowDocs, worked, dead, inputsTotal] = await Promise.all([
    c.sources
      .aggregate<{ _id: string; entries: number; tokens: number }>([{ $group: { _id: "$kind", entries: { $sum: 1 }, tokens: { $sum: { $add: ["$tokens.in", "$tokens.out"] } } } }])
      .toArray(),
    storageSize(c),
    c.sources.countDocuments({ kind: "gate", "raw.gate.pass": false }),
    c.metrics.findOne({ _id: "metrics" }, { projection: { at: 1, "totals.libraryTokens": 1, "totals.contextLast20Avg": 1, perMinute: 1, solveRate: 1, "lessons.text": 1, "lessons.at": 1 } }),
    c.sources
      .find({}, { sort: { createdAt: -1 }, limit: NEWEST, projection: { kind: 1, key: 1, createdAt: 1, "enrichment.gist": 1, text: 1 } })
      .toArray(),
    c.goal.findOne({ _id: "goal" }, { projection: { version: 1, history: { $slice: 1 } } }),
    c.state.find({ score: 1 }, { sort: { scoredAt: 1, mergedAt: 1 }, projection: { key: 1, scoredAt: 1, mergedAt: 1, "data.rule": 1, taskId: 1 } }).toArray() as unknown as Promise<SolveDoc[]>,
    c.sources
      .aggregate<RowDoc>([
        { $match: rowFilterMatch(rowFilter) },
        { $sort: { createdAt: -1 } },
        { $limit: LIBRARY_ROWS },
        {
          $project: {
            kind: 1,
            key: 1,
            createdAt: 1,
            tokens: 1,
            "enrichment.gist": 1,
            text: { $substrCP: ["$text", 0, GIST_CHARS] },
            "raw.worker": 1,
            "raw.gate.pass": 1,
            "raw.gate.reasons": 1,
            "raw.reasons": 1,
            "raw.proposal.rule": 1,
            "raw.message": 1,
            "raw.outcome": 1,
            "raw.steps": { $size: { $ifNull: ["$raw.steps", []] } },
            "raw.tests": {
              $size: {
                $filter: {
                  input: { $reduce: { input: { $ifNull: ["$raw.steps", []] }, initialValue: [], in: { $concatArrays: ["$$value", { $ifNull: ["$$this.toolCalls", []] }] } } },
                  as: "t",
                  cond: { $eq: ["$$t.name", "try_submit"] },
                },
              },
            },
          },
        },
      ])
      .toArray(),
    c.sources.countDocuments({ kind: "worker-run", "raw.gate.pass": true }),
    c.sources.countDocuments({ kind: { $in: ["worker-run", "gate"] }, "raw.gate.pass": false, "raw.proposal.rule": { $type: "string" } }),
    c.inputs.countDocuments(),
  ]);

  const byKind: Record<string, number> = {};
  let entries = 0;
  let tokens = 0;
  for (const k of perKind) {
    byKind[k._id] = k.entries;
    entries += k.entries;
    tokens += k.tokens;
  }

  let sum = 0;
  const perMinute = (metrics?.perMinute ?? []).map((m) => {
    sum += m.tokens;
    return { at: m.minute.getTime(), tokens: sum };
  });
  const growth = perMinute.map((p) => ({ at: new Date(p.at).toISOString(), tokens: p.tokens }));
  const tokensAt = (t: number): number => {
    let v = 0;
    for (const p of perMinute) {
      if (p.at >= t) break;
      v = p.tokens;
    }
    return v;
  };
  const solveRate = (metrics?.solveRate ?? []).map((b) => ({
    bucket: b.bucket.toISOString(),
    attempted: b.attempted,
    merged: b.merged,
    solved: b.solved,
    finished: typeof (b as { finished?: unknown }).finished === "number" ? ((b as { finished?: number }).finished ?? null) : null,
    tokens: tokensAt(b.bucket.getTime() + BUCKET_MS),
  }));

  // The worker whose run merged: the task's worker-run source on the
  // state's taskId, in one query over every solve.
  const taskIds = solveDocs.flatMap((s) => (s.taskId ? [s.taskId] : []));
  const [runDocs, inputDocs] = await Promise.all([
    taskIds.length
      ? (c.sources.find({ kind: "worker-run", taskId: { $in: taskIds as never[] } }, { projection: { taskId: 1, "raw.worker": 1 } }).toArray() as unknown as Promise<
          Array<{ taskId: { toHexString(): string } | null; raw?: { worker?: string } }>
        >)
      : [],
    solveDocs.length
      ? c.inputs.find({ _id: { $in: solveDocs.map((s) => s.key) } }, { projection: { key: 1, "meta.train": { $slice: 1 } } }).toArray()
      : [],
  ]);
  const whoByTask = new Map(runDocs.map((r) => [r.taskId ? r.taskId.toHexString() : "", r.raw?.worker ?? null]));
  const thumbByKey = new Map(inputDocs.map((d) => [d.key, thumb6((d.meta as { train?: Array<{ input?: unknown }> } | undefined)?.train?.[0]?.input)]));

  const solves: LibrarySolve[] = solveDocs.map((s) => ({
    key: s.key,
    at: (s.scoredAt ?? s.mergedAt).toISOString(),
    who: whoByTask.get(String(s.taskId ?? "")) ?? null,
    rule: str(s.data?.rule),
    thumb: thumbByKey.get(s.key) ?? null,
  }));

  const firstSolve = solves[0] ? new Date(solves[0].at).getTime() : Infinity;
  const goalAt = goal?.history?.[0]?.at ? goal.history[0].at.getTime() : Infinity;
  const runStartMs = Math.min(goalAt, firstSolve);

  const rows: LibraryRow[] = rowDocs.map((d) => {
    const { kind, text } = classifyRow(d);
    const tok = (d.tokens?.in ?? 0) + (d.tokens?.out ?? 0);
    return { id: d._id.toHexString(), at: d.createdAt.toISOString(), kind, key: d.key, text, tokens: tok || estimateTokens(d.text ?? "") };
  });

  return {
    at: new Date().toISOString(),
    entries,
    tokens,
    bytes: storage,
    byKind,
    solvedRules: solves.length,
    refutedRules,
    growth,
    lessons: metrics?.lessons?.text ?? null,
    lessonsAt: metrics?.lessons?.at ? metrics.lessons.at.toISOString() : null,
    contextAvg: metrics?.totals?.contextLast20Avg ?? null,
    newest: newest.map((s) => ({
      id: s._id.toHexString(),
      at: s.createdAt.toISOString(),
      kind: s.kind,
      key: s.key,
      gist: (s.enrichment?.gist ?? s.text ?? "").replace(/\s+/g, " ").slice(0, GIST_CHARS),
    })),
    runStart: Number.isFinite(runStartMs) ? new Date(runStartMs).toISOString() : null,
    goalVersion: goal?.version ?? null,
    solveRate,
    notSolved: Math.max(0, inputsTotal - solves.length),
    solves,
    rows,
    kindCounts: { all: entries, worked, dead, gate: byKind.gate ?? 0, run: byKind["worker-run"] ?? 0 },
  };
}

// storageSize of `sources` in bytes, 0 when the role may not run $collStats.
async function storageSize(c: Collections): Promise<number> {
  try {
    const [row] = await c.sources.aggregate<{ storageStats?: { storageSize?: number; size?: number } }>([{ $collStats: { storageStats: {} } }]).toArray();
    const st = row?.storageStats;
    return typeof st?.storageSize === "number" ? st.storageSize : typeof st?.size === "number" ? st.size : 0;
  } catch {
    return 0;
  }
}
