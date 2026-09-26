import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assemble, failureReasons, failureRule, inputPage, PAGE_CHARS } from "./assemble.ts";
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
const baseInput = { key: "aapl-2026-07-30", name: "Apple Inc.", text: "Apple reports third quarter results. Revenue $109.4 billion." };

describe("assemble", () => {
  const heavy = {
    goal,
    task: { ...baseTask, hint: "h".repeat(50_000) },
    input: { ...baseInput, text: "Lorem ipsum dolor sit amet ".repeat(3000).slice(0, 60_000) },
    state: { data: { big: "s".repeat(50_000) }, stateVersion: 1, version: 1 },
    failures: Array.from({ length: 5 }, (_, i) => ({
      createdAt: new Date(),
      raw: { reasons: Array.from({ length: 30 }, (_, j) => `reason ${i}.${j} ` + "r".repeat(2000)) },
    })),
    passages: Array.from({ length: 10 }, (_, i) => longPassage(i)),
  };

  it("stays under 20k tokens with a 60k input and 10 long passages, no briefing", () => {
    const out = assemble(heavy);
    expect(out.contextTokens).toBeLessThan(20_000);
    expect(out.system.length).toBeLessThan(80_000);
  });

  it("stays under 20k tokens with a long briefing citing 10 long records", () => {
    const out = assemble({
      ...heavy,
      briefing: { text: "Long sentence [p0]. ".repeat(2000), cited: heavy.passages, tokens: { in: 1, out: 1 } },
    });
    expect(out.contextTokens).toBeLessThan(20_000);
  });

  it("shows the briefing and only its cited records when there is one, else the top hits", () => {
    const passages = Array.from({ length: 6 }, (_, i) => ({ ...longPassage(i), gist: `gist ${i}`, excerpt: `record ${i}` }));
    const withBriefing = assemble({
      ...heavy,
      input: baseInput,
      passages,
      briefing: { text: "Banks report net revenue [p1].", cited: [passages[1]], tokens: { in: 1, out: 1 } },
    });
    expect(withBriefing.system).toContain("# Library briefing");
    expect(withBriefing.system).toContain("Banks report net revenue [p1].");
    expect(withBriefing.system).toContain("[p1] worker-run on other-1");
    expect(withBriefing.system).toContain("record 1");
    expect(withBriefing.system).not.toContain("record 0");
    expect(withBriefing.system).not.toContain("# Library records");

    const without = assemble({ ...heavy, input: baseInput, passages, briefing: null });
    expect(without.system).toContain("# Library records");
    expect(without.system).toContain("record 0");
    expect(without.system).toContain("record 3");
    expect(without.system).not.toContain("record 4"); // top 4 only
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
    expect(out.system).toContain("[p0] worker-run on other-0");
    expect(out.system).toContain(`call read_input with offset ${PAGE_CHARS}`);
    expect(out.system).toContain("A".repeat(PAGE_CHARS));
    expect(out.system).not.toContain("BBBB");
    expect(out.system).toContain("exactly one call to submit");
    expect(out.messages).toHaveLength(1);
    expect(out.messages[0].role).toBe("user");
    expect(out.contextTokens).toBeGreaterThan(1000);
  });

  it("pins the lessons digest after the goal and before the task, capped, and skips it when absent", () => {
    const lessons = "Lessons from the record so far (last 3 h, 40 tasks finished, first-try pass rate 63%)\n- 7x quote not found verbatim";
    const out = assemble({ ...heavy, input: baseInput, lessons });
    const section = out.system.indexOf("# Lessons from the record so far");
    expect(section).toBeGreaterThan(out.system.indexOf("## Out of scope"));
    expect(section).toBeLessThan(out.system.indexOf("# Task"));
    expect(out.system).toContain("7x quote not found verbatim");

    const capped = assemble({ ...heavy, lessons: "L".repeat(10_000) });
    expect(capped.contextTokens).toBeLessThan(20_000);
    expect(capped.system).not.toContain("L".repeat(2001));

    expect(assemble({ ...heavy, input: baseInput }).system).not.toContain("# Lessons");
    expect(assemble({ ...heavy, input: baseInput, lessons: null }).system).not.toContain("# Lessons");
  });

  it("pins the refuted rule of each failed proposal and the planner's hint", () => {
    const out = assemble({
      goal,
      task: { ...baseTask, attempt: 3, hint: "passed the examples, wrong on the test: the rule is too specific" },
      input: baseInput,
      state: null,
      failures: [
        {
          createdAt: new Date("2026-09-26T14:10:00Z"),
          raw: { reasons: ["pair 2: expected 3x3, got 9x9"], proposal: { key: "k", rule: "Tile the input three times.", program: "x" } },
        },
        { createdAt: new Date("2026-09-26T14:05:00Z"), raw: { gate: { pass: false, reasons: ["pair 1: cell (0,0) is 5, expected 0"] }, proposal: { key: "k" } } },
        { createdAt: new Date("2026-09-26T14:00:00Z"), raw: { reasons: [] } },
      ],
      passages: [],
    });
    expect(out.system).toContain("refuted: Tile the input three times.");
    expect(out.system).toContain("pair 2: expected 3x3, got 9x9");
    expect(out.system).toContain("pair 1: cell (0,0) is 5, expected 0");
    expect(out.system).toContain("(no reasons recorded)");
    expect(out.system.match(/refuted:/g)).toHaveLength(1);
    expect(out.system).toContain("Hint from the planner: passed the examples, wrong on the test: the rule is too specific");
    expect(assemble({ ...heavy, input: baseInput, task: baseTask }).system).not.toContain("Hint from the planner");
  });

  it("reads the rule only from a string field named rule on the failed proposal", () => {
    expect(failureRule({ raw: { proposal: { rule: "  r  " } } })).toBe("r");
    expect(failureRule({ raw: { proposal: { rule: "" } } })).toBeNull();
    expect(failureRule({ raw: { proposal: { rule: 3 } } })).toBeNull();
    expect(failureRule({ raw: { proposal: null } })).toBeNull();
    expect(failureRule({ raw: {} })).toBeNull();
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
