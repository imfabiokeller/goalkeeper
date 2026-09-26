import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assemble, failureReasons, inputPage, PAGE_CHARS } from "./assemble.ts";
import type { Passage } from "./retrieve.ts";
import { goalFromLens } from "../shared/goal.ts";
import type { Goal } from "../shared/types.ts";

const lens = JSON.parse(readFileSync(new URL("../../usecase/lens.json", import.meta.url), "utf8"));
const goal: Goal = goalFromLens(lens);

function longPassage(i: number): Passage {
  return {
    id: `p${i}`,
    kind: "worker-run",
    key: `other-${i}`,
    gist: "g".repeat(5000),
    excerpt: "x".repeat(20_000),
    score: 1 / (i + 1),
    createdAt: new Date("2026-09-26T12:00:00Z"),
  };
}

const baseTask = { key: "aapl-2026-07-30", criteria: ["c1", "c2", "c3"], attempt: 1, hint: null };
const baseInput = { key: "aapl-2026-07-30", company: "Apple Inc.", ticker: "AAPL", filedAt: "2026-07-30", text: "Apple reports third quarter results. Revenue $109.4 billion." };

describe("assemble", () => {
  it("stays under 20k tokens with a 60k input and 10 long passages", () => {
    const text = "Lorem ipsum dolor sit amet ".repeat(3000).slice(0, 60_000);
    const out = assemble({
      goal,
      task: { ...baseTask, hint: "h".repeat(50_000) },
      input: { ...baseInput, text },
      state: { data: { big: "s".repeat(50_000) }, stateVersion: 1, version: 1 },
      failures: Array.from({ length: 5 }, (_, i) => ({
        createdAt: new Date(),
        raw: { reasons: Array.from({ length: 30 }, (_, j) => `reason ${i}.${j} ` + "r".repeat(2000)) },
      })),
      passages: Array.from({ length: 10 }, (_, i) => longPassage(i)),
    });
    expect(out.contextTokens).toBeLessThan(20_000);
    expect(out.system.length).toBeLessThan(80_000);
  });

  it("has every section and pins the first page of the input", () => {
    const text = "A".repeat(PAGE_CHARS) + "B".repeat(100);
    const out = assemble({
      goal,
      task: baseTask,
      input: { ...baseInput, text },
      state: null,
      failures: [{ createdAt: new Date(), raw: { gate: { pass: false, reasons: ["revenue 1 not in quote"] } } }],
      passages: [{ ...longPassage(0), gist: "banks report net revenue", excerpt: "JPMorgan net revenue" }],
    });
    expect(out.system).toContain("# Goal (version 1)");
    expect(out.system).toContain("c1 [grounded]");
    expect(out.system).toContain("## Guidelines");
    expect(out.system).toContain("## Out of scope");
    expect(out.system).toContain("key: aapl-2026-07-30");
    expect(out.system).toContain("none merged yet");
    expect(out.system).toContain("revenue 1 not in quote");
    expect(out.system).toContain("banks report net revenue");
    expect(out.system).toContain("JPMorgan net revenue");
    expect(out.system).toContain(`call read_input with offset ${PAGE_CHARS}`);
    expect(out.system).toContain("A".repeat(PAGE_CHARS));
    expect(out.system).not.toContain("BBBB");
    expect(out.system).toContain("exactly one call to submit");
    expect(out.messages).toHaveLength(1);
    expect(out.messages[0].role).toBe("user");
    expect(out.contextTokens).toBeGreaterThan(1000);
  });

  it("extracts failure reasons from both raw shapes", () => {
    expect(failureReasons({ raw: { reasons: ["a", 1, "b"] } })).toEqual(["a", "b"]);
    expect(failureReasons({ raw: { gate: { reasons: ["c"] } } })).toEqual(["c"]);
    expect(failureReasons({ raw: {} })).toEqual([]);
  });

  it("pages the input", () => {
    const text = "0123456789";
    expect(inputPage(text, 0, 4)).toEqual({ text: "0123", offset: 0, total: 10, next: 4 });
    expect(inputPage(text, 8, 4)).toEqual({ text: "89", offset: 8, total: 10, next: null });
    expect(inputPage(text, 50, 4)).toEqual({ text: "", offset: 10, total: 10, next: null });
  });
});
