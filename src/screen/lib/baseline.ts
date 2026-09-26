// The single shot baseline for the curve's dashed line: the totals of
// usecase/tools/baseline.json (written by `npm run baseline`), or null
// when the file is not there. Read at request time, path relative to the
// process cwd (the repo root under `next dev src/screen` and on Vercel
// with the repo root as the tracing root; src/screen is tried as well).

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type BaselinePayload = { solveRate: number; solveRateAt2: number | null; n: number; model: string } | null;

export const BASELINE_CANDIDATES = ["usecase/tools/baseline.json", "../../usecase/tools/baseline.json"];

export function baselineFromReport(text: string): BaselinePayload {
  const report = JSON.parse(text) as { totals?: { solveRate?: unknown; solveRateAt2?: unknown; n?: unknown; model?: unknown } };
  const t = report.totals;
  if (!t || typeof t.solveRate !== "number") return null;
  return {
    solveRate: t.solveRate,
    solveRateAt2: typeof t.solveRateAt2 === "number" ? t.solveRateAt2 : null,
    n: typeof t.n === "number" ? t.n : 0,
    model: typeof t.model === "string" ? t.model : "",
  };
}

export async function readBaseline(cwd = process.cwd()): Promise<BaselinePayload> {
  for (const rel of BASELINE_CANDIDATES) {
    try {
      return baselineFromReport(await readFile(join(cwd, rel), "utf8"));
    } catch {
      // try the next location
    }
  }
  return null;
}
