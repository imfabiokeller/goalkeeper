import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gate } from "./gate.ts";
import { goalFromLens } from "../shared/goal.ts";
import type { CheckInput, CheckState, Goal } from "../shared/types.ts";

type Sample = {
  note: string;
  input: string;
  merged?: string[];
  expect: Record<string, boolean>;
  proposal: unknown;
};
type IndexEntry = { key: string; file: string; [extra: string]: unknown };

const usecase = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "usecase");
const read = (...p: string[]) => readFileSync(join(usecase, ...p), "utf8");
const goal: Goal = goalFromLens(JSON.parse(read("lens.json")));
const index = new Map((JSON.parse(read("inputs.json")) as IndexEntry[]).map((e) => [e.key, e]));

function loadInput(key: string): CheckInput {
  const e = index.get(key);
  if (!e) throw new Error(`no input with key ${key}`);
  const { key: _key, name, file, source: _source, chars: _chars, ...meta } = e;
  return { key, name: typeof name === "string" ? name : key, text: read(file), meta };
}

function stateFor(sample: Sample): CheckState {
  const merged: Record<string, unknown> = {};
  for (const k of sample.merged ?? []) merged[k] = { key: k };
  return { merged };
}

const allCriteria = goal.criteria.map((c) => c.id);
const sampleNames = readdirSync(join(usecase, "samples")).filter((f) => f.endsWith(".json")).sort();

describe("goalFromLens", () => {
  it("builds a goal with one check kind per criterion", () => {
    expect(goal._id).toBe("goal");
    expect(goal.version).toBe(1);
    expect(goal.statement.length).toBeGreaterThan(0);
    expect(goal.criteria.map((c) => c.check.kind)).toEqual(["reproduces", "general", "schema"]);
    expect(goal.criteria.every((c) => c.kind === "all-units")).toBe(true);
    expect(goal.history).toHaveLength(1);
    expect(goal.history[0]).toMatchObject({ version: 1, by: "seed", diff: null });
  });
});

describe("gate over usecase/samples", () => {
  for (const name of sampleNames) {
    const sample: Sample = JSON.parse(read("samples", name));
    it(`${name}: ${sample.note}`, () => {
      const result = gate(goal, { key: sample.input, criteria: allCriteria }, sample.proposal, loadInput(sample.input), stateFor(sample));
      const got = Object.fromEntries(Object.entries(result.checks).map(([kind, r]) => [kind, r.pass]));
      expect(got).toEqual(sample.expect);
      const expectedPass = Object.values(sample.expect).every(Boolean);
      expect(result.pass).toBe(expectedPass);
      if (expectedPass) expect(result.reasons).toEqual([]);
      else expect(result.reasons.length).toBeGreaterThan(0);
      // reasons are the flattened per-check reasons, nothing lost
      expect(result.reasons).toEqual(Object.values(result.checks).flatMap((r) => r.reasons));
    });
  }
});

describe("gate edge cases", () => {
  const apple: Sample = JSON.parse(read("samples", "01-upscale-pass.json"));
  const input = loadInput(apple.input);
  const empty: CheckState = { merged: {} };

  it("fails with a reason for a criterion id the goal does not have", () => {
    const result = gate(goal, { key: apple.input, criteria: ["c9"] }, apple.proposal, input, empty);
    expect(result.pass).toBe(false);
    expect(result.reasons.join("\n")).toContain("c9");
  });

  it("fails with a reason for a check kind the registry does not have", () => {
    const odd: Goal = {
      ...goal,
      criteria: [...goal.criteria, { id: "c4", kind: "all-units", text: "reviewed by a model", check: { kind: "model-review", params: {} } }],
    };
    const result = gate(odd, { key: apple.input, criteria: ["c4"] }, apple.proposal, input, empty);
    expect(result.pass).toBe(false);
    expect(result.checks["model-review"]?.pass).toBe(false);
    expect(result.reasons.join("\n")).toContain("model-review");
  });

  it("runs only the reproduces check for a task with criteria [c1]", () => {
    const result = gate(goal, { key: apple.input, criteria: ["c1"] }, apple.proposal, input, empty);
    expect(Object.keys(result.checks)).toEqual(["reproduces"]);
    expect(result.pass).toBe(true);
  });

  it("a duplicate merge is invisible to a [c1] task and caught by a [c3] task", () => {
    const merged: CheckState = { merged: { [apple.input]: apple.proposal } };
    expect(gate(goal, { key: apple.input, criteria: ["c1"] }, apple.proposal, input, merged).pass).toBe(true);
    expect(gate(goal, { key: apple.input, criteria: ["c3"] }, apple.proposal, input, merged).pass).toBe(false);
  });

  it("fails when the input key is not the task key", () => {
    const result = gate(goal, { key: "00000000", criteria: ["c1"] }, apple.proposal, input, empty);
    expect(result.pass).toBe(false);
    expect(result.reasons.join("\n")).toContain("00000000");
  });

  it("never throws on garbage proposals", () => {
    for (const p of [null, 42, "x", [], {}, { key: apple.input, rule: "x", program: 42 }]) {
      const result = gate(goal, { key: apple.input, criteria: allCriteria }, p, input, empty);
      expect(result.pass).toBe(false);
    }
  });

  it("turns a sandbox failure into a reason, not an exception", () => {
    const hostile = { key: apple.input, rule: "loop forever", program: "function transform(grid) { while (true) {} }" };
    const result = gate(goal, { key: apple.input, criteria: ["c2"] }, hostile, input, empty);
    expect(result.pass).toBe(false);
    expect(result.reasons.join("\n")).toContain("timeout");
    const nosy = { key: apple.input, rule: "read the answers", program: "function transform(grid) { return require('fs').readdirSync('.') }" };
    const r2 = gate(goal, { key: apple.input, criteria: ["c1"] }, nosy, input, empty);
    expect(r2.pass).toBe(false);
    expect(r2.reasons.join("\n")).toContain("require");
  });
});
