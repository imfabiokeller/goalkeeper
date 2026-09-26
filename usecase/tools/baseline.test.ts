import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MockLanguageModelV3 } from "ai/test";
import type { LanguageModelV3CallOptions, LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import { checkInput, judge, loadIndex, parseArgs, pickKeys, runBaseline, unfence } from "./baseline.ts";

const sample = JSON.parse(readFileSync(new URL("../samples/01-upscale-pass.json", import.meta.url), "utf8")) as {
  proposal: { key: string; rule: string; program: string };
};

function textResult(text: string): LanguageModelV3GenerateResult {
  return {
    content: [{ type: "text", text }],
    finishReason: { unified: "stop", raw: "stop" },
    usage: {
      inputTokens: { total: 1500, noCache: 1500, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 300, text: 300, reasoning: undefined },
    },
    warnings: [],
  };
}

function mockModel(decide: (o: LanguageModelV3CallOptions) => LanguageModelV3GenerateResult | Promise<LanguageModelV3GenerateResult>) {
  return new MockLanguageModelV3({ doGenerate: async (o) => decide(o) });
}

const fenced = (program: string) => "```javascript\n" + program + "\n```";

describe("baseline", () => {
  it("picks every k-th sorted key, deterministically", () => {
    const keys = ["d", "b", "a", "c", "f", "e", "h", "g"];
    expect(pickKeys(keys, 4)).toEqual(["a", "c", "e", "g"]);
    expect(pickKeys(keys, 100)).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
    expect(pickKeys(loadIndex().map((e) => e.key), 40)).toHaveLength(40);
  });

  it("parses the cli and rejects nonsense", () => {
    const a = parseArgs(["--n", "10", "--concurrency", "2", "--attempts", "2", "--keys", "60c09cac, 00576224", "--out", "x.json"]);
    expect(a).toMatchObject({ n: 10, concurrency: 2, attempts: 2, keys: ["60c09cac", "00576224"], out: "x.json" });
    expect(() => parseArgs(["--n", "0"])).toThrow();
    expect(() => parseArgs(["--bogus"])).toThrow();
  });

  it("unwraps a fenced program and leaves plain source alone", () => {
    expect(unfence(fenced("function transform(g) { return g; }"))).toBe("function transform(g) { return g; }");
    expect(unfence("function transform(g) { return g; }")).toBe("function transform(g) { return g; }");
  });

  it("parses the JSON, runs the gate and scores 1 on the correct program for 60c09cac", async () => {
    const seen: LanguageModelV3CallOptions[] = [];
    const model = mockModel((o) => {
      seen.push(o);
      return textResult(JSON.stringify({ rule: sample.proposal.rule, program: fenced(sample.proposal.program) }));
    });
    const report = await runBaseline({ keys: ["60c09cac"], concurrency: 1, attempts: 1, model, modelName: "mock" });
    expect(report.puzzles).toHaveLength(1);
    const p = report.puzzles[0]!;
    expect(p.key).toBe("60c09cac");
    expect(p.checks).toEqual({ schema: true, reproduces: true, general: true });
    expect(p.gatePass).toBe(true);
    expect(p.score).toBe(1);
    expect(p.firstReason).toBeNull();
    expect(p.tokensIn).toBe(1500);
    expect(p.tokensOut).toBe(300);
    expect(report.totals).toMatchObject({ n: 1, gatePassRate: 1, solveRate: 1, errors: 0, tokens: { in: 1500, out: 300 }, model: "mock" });
    expect(report.totals.costUsd).toBeGreaterThan(0);
    expect(report.totals.solveRateAt2).toBeUndefined();
    // The model sees the puzzle text a worker sees and never the answer.
    const user = seen[0]!.prompt.find((m) => m.role === "user");
    const text = JSON.stringify(user);
    expect(text).toContain("Example 1 input (3x3)");
    expect(text).toContain("Test input (5x5)");
    expect(text).not.toContain("6 6 6 6 6 6");
  });

  it("fails the gate with the first reason on a wrong program", () => {
    const entry = loadIndex().find((e) => e.key === "60c09cac")!;
    const input = checkInput(entry, readFileSync(new URL("../inputs/60c09cac.txt", import.meta.url), "utf8"));
    const r = judge({ key: "60c09cac", rule: "identity", program: "function transform(g) { return g; }" }, input);
    expect(r.gatePass).toBe(false);
    expect(r.checks.schema).toBe(true);
    expect(r.checks.reproduces).toBe(false);
    expect(r.firstReason).toMatch(/^pair 1: expected 6x6, got 3x3/);
    expect(r.score).toBe(0);
  });

  it("records a provider error as gatePass false, score 0, and keeps going", async () => {
    let calls = 0;
    const model = mockModel(() => {
      calls++;
      if (calls === 1) throw new Error("429 rate limited");
      return textResult(JSON.stringify({ rule: sample.proposal.rule, program: sample.proposal.program }));
    });
    const report = await runBaseline({ keys: ["00576224", "60c09cac"], concurrency: 1, attempts: 1, model, modelName: "mock" });
    const [first, second] = report.puzzles;
    expect(first!.key).toBe("00576224");
    expect(first!.gatePass).toBe(false);
    expect(first!.score).toBe(0);
    expect(first!.error).toContain("429");
    expect(second!.score).toBe(1);
    expect(report.totals).toMatchObject({ n: 2, errors: 1, solveRate: 0.5, gatePassRate: 0.5 });
  });

  it("with two attempts, solved at 2 if either sample is right", async () => {
    let calls = 0;
    const model = mockModel(() => {
      calls++;
      const program = calls % 2 === 1 ? "function transform(g) { return g; }" : sample.proposal.program;
      return textResult(JSON.stringify({ rule: "r", program }));
    });
    const report = await runBaseline({ keys: ["60c09cac"], concurrency: 1, attempts: 2, model, modelName: "mock" });
    const p = report.puzzles[0]!;
    expect(p.attempts).toHaveLength(2);
    expect(p.score).toBe(0); // the first sample
    expect(p.solvedAt2).toBe(true);
    expect(p.tokensIn).toBe(3000);
    expect(report.totals.solveRate).toBe(0);
    expect(report.totals.solveRateAt2).toBe(1);
  });
});
