// The baseline reader: totals off the report, null when absent.

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { baselineFromReport, readBaseline } from "./baseline.ts";

describe("baseline", () => {
  it("reads the totals off a report", () => {
    expect(baselineFromReport(JSON.stringify({ totals: { solveRate: 0.13, solveRateAt2: 0.2, n: 40, model: "deepseek/deepseek-v4-flash" } }))).toEqual({
      solveRate: 0.13,
      solveRateAt2: 0.2,
      n: 40,
      model: "deepseek/deepseek-v4-flash",
    });
    expect(baselineFromReport(JSON.stringify({ totals: { solveRate: 0.1 } }))).toEqual({ solveRate: 0.1, solveRateAt2: null, n: 0, model: "" });
    expect(baselineFromReport("{}")).toBeNull();
  });
  it("finds the file under the cwd and is null without it", async () => {
    const root = mkdtempSync(join(tmpdir(), "gk-baseline-"));
    expect(await readBaseline(root)).toBeNull();
    mkdirSync(join(root, "usecase", "tools"), { recursive: true });
    writeFileSync(join(root, "usecase", "tools", "baseline.json"), JSON.stringify({ totals: { solveRate: 0.125, n: 8, model: "m" } }));
    expect(await readBaseline(root)).toMatchObject({ solveRate: 0.125, n: 8 });
    expect(await readBaseline(join(root, "src", "screen"))).toMatchObject({ solveRate: 0.125 });
  });
});
