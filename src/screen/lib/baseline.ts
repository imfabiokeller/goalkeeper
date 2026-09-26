// The control run for the dashed line and the per-puzzle comparison:
// usecase/tools/baseline-400.json when it exists (the full control run,
// being produced), else usecase/tools/baseline.json (written by `npm run
// baseline`), or null when neither is there. Read at request time, path
// relative to the process cwd (the repo root under `next dev src/screen`
// and on Vercel with the repo root as the tracing root; src/screen is
// tried as well). The parsed report is cached in module scope by mtime so
// a poll every few seconds does not parse a big file each time.

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

export type BaselinePayload = { solveRate: number; solveRateAt2: number | null; n: number; model: string } | null;

export type BaselineAttempt = { gatePass: boolean; score: number; firstReason: string | null };

export type BaselinePuzzle = {
  key: string;
  gatePass: boolean;
  score: number;
  solvedAt2: boolean | null; // null when the run took one attempt
  firstReason: string | null;
  attempts: BaselineAttempt[]; // one entry even for a single attempt
};

// The 400 file first, then the small one, under the cwd and under
// src/screen's parent.
export const BASELINE_FILES = ["usecase/tools/baseline-400.json", "usecase/tools/baseline.json"];
export const BASELINE_CANDIDATES = BASELINE_FILES.flatMap((f) => [f, join("../..", f)]);

type RawSample = { gatePass?: unknown; score?: unknown; firstReason?: unknown };
type RawPuzzle = RawSample & { key?: unknown; attempts?: unknown; solvedAt2?: unknown };
type RawReport = { puzzles?: unknown; totals?: { solveRate?: unknown; solveRateAt2?: unknown; n?: unknown; model?: unknown } };

export function baselineFromReport(text: string): BaselinePayload {
  return totalsOf(JSON.parse(text) as RawReport);
}

function totalsOf(report: RawReport): BaselinePayload {
  const t = report.totals;
  if (!t || typeof t.solveRate !== "number") return null;
  return {
    solveRate: t.solveRate,
    solveRateAt2: typeof t.solveRateAt2 === "number" ? t.solveRateAt2 : null,
    n: typeof t.n === "number" ? t.n : 0,
    model: typeof t.model === "string" ? t.model : "",
  };
}

function sampleOf(s: RawSample): BaselineAttempt {
  return {
    gatePass: s.gatePass === true,
    score: typeof s.score === "number" ? s.score : 0,
    firstReason: typeof s.firstReason === "string" ? s.firstReason : null,
  };
}

// The per-puzzle results of a report, keyed by puzzle.
export function puzzlesFromReport(text: string): Map<string, BaselinePuzzle> {
  const report = JSON.parse(text) as RawReport;
  const out = new Map<string, BaselinePuzzle>();
  if (!Array.isArray(report.puzzles)) return out;
  for (const p of report.puzzles as RawPuzzle[]) {
    if (typeof p.key !== "string") continue;
    const first = sampleOf(p);
    const attempts = Array.isArray(p.attempts) && p.attempts.length ? (p.attempts as RawSample[]).map(sampleOf) : [first];
    out.set(p.key, {
      key: p.key,
      ...first,
      solvedAt2: typeof p.solvedAt2 === "boolean" ? p.solvedAt2 : attempts.length > 1 ? attempts.some((a) => a.score === 1) : null,
      attempts,
    });
  }
  return out;
}

type Cached = { path: string; mtimeMs: number; totals: BaselinePayload; puzzles: Map<string, BaselinePuzzle> };
let cache: Cached | null = null;

// The first report that exists, parsed once per mtime.
// The small report is also bundled statically, so a serverless function
// that did not trace the file still answers.
import bundledReport from "../../../usecase/tools/baseline.json" with { type: "json" };

async function loadReport(cwd: string): Promise<Cached | null> {
  for (const rel of BASELINE_CANDIDATES) {
    const path = join(cwd, rel);
    let mtimeMs: number;
    try {
      mtimeMs = (await stat(path)).mtimeMs;
    } catch {
      continue; // try the next location
    }
    if (cache && cache.path === path && cache.mtimeMs === mtimeMs) return cache;
    try {
      const text = await readFile(path, "utf8");
      cache = { path, mtimeMs, totals: baselineFromReport(text), puzzles: puzzlesFromReport(text) };
      return cache;
    } catch {
      // unreadable or half written: try the next location
    }
  }
  if (cache?.path === "bundled") return cache;
  const text = JSON.stringify(bundledReport);
  cache = { path: "bundled", mtimeMs: 0, totals: baselineFromReport(text), puzzles: puzzlesFromReport(text) };
  return cache;
}

export async function readBaseline(cwd = process.cwd()): Promise<BaselinePayload> {
  return (await loadReport(cwd))?.totals ?? null;
}

// One puzzle's control result, null when the control has not tried it
// (or there is no report at all).
export async function readBaselinePuzzle(key: string, cwd = process.cwd()): Promise<BaselinePuzzle | null> {
  return (await loadReport(cwd))?.puzzles.get(key) ?? null;
}
