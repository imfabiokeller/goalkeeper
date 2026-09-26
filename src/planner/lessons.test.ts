import { ObjectId } from "mongodb";
import { describe, expect, it as pure } from "vitest";
import type { GateResult, Lessons } from "../shared/types.ts";
import { withDb } from "./harness.ts";
import { computeLessons, lessonsFrom, MAX_BLOCKED, MAX_REASONS, MAX_TEXT_CHARS, readLessons, renderLessons } from "./lessons.ts";
import { crowdFixture, goalFixture, taskFixture } from "./testdb.ts";

const now = new Date("2026-09-26T15:00:00Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

function gate(checks: Record<string, boolean>, reasons: string[]): GateResult {
  return {
    pass: Object.values(checks).every(Boolean),
    reasons,
    checks: Object.fromEntries(Object.entries(checks).map(([k, pass]) => [k, { pass, reasons: pass ? [] : reasons }])),
  };
}

function gateSource(key: string, g: GateResult, at: Date, taskId = new ObjectId()) {
  return crowdFixture("gate", { kind: "gate", key, taskId, raw: { gate: g, reasons: g.reasons }, createdAt: at });
}

describe("computeLessons", () => {
  const it = withDb();

  it("counts checks worst first, groups reasons with example keys, and ranks blocked groups", async (c) => {
    const goal = goalFixture({
      version: 2,
      history: [
        { version: 1, at: ago(170), by: "seed", diff: null },
        { version: 2, at: ago(30), by: "fabio", diff: { op: "add-guideline", text: "Banks report net revenue; take that as revenue." } },
      ],
    });
    await c.goal.insertOne(goal);

    const grounded = "dilutedEps 6.81: the quote contains 6.18, not 6.81";
    const consistent = "revenueChangePct 12: revenue over prior year implies 9";
    await c.sources.insertMany([
      gateSource("aapl", gate({ grounded: false, consistent: true }, [grounded]), ago(50)),
      // Same group: differs only after the 40-character normalized prefix.
      gateSource("msft", gate({ grounded: false, consistent: true }, [grounded.replace("not 6.81", "not 6.8 (rounded)")]), ago(40)),
      gateSource("goog", gate({ grounded: false, consistent: false }, [grounded, consistent]), ago(20)),
      gateSource("amzn", gate({ grounded: false, consistent: true }, [grounded]), ago(10)),
      gateSource("meta", gate({ grounded: true, consistent: false }, [consistent]), ago(5)),
      gateSource("old", gate({ grounded: false, consistent: false }, ["stale reason"]), ago(400)), // outside the window
    ]);
    const mergedGate = gate({ grounded: true, consistent: true }, []);
    await c.tasks.insertMany([
      taskFixture("aapl", { status: "merged", attempt: 2, gate: mergedGate, updatedAt: ago(45) }),
      taskFixture("msft", { status: "merged", attempt: 1, gate: mergedGate, updatedAt: ago(35) }),
      taskFixture("nvda", { status: "merged", attempt: 1, gate: mergedGate, updatedAt: ago(15) }),
      taskFixture("jpm", { status: "blocked", blockReason: "Bank reports net revenue, not total revenue", updatedAt: ago(60) }),
      taskFixture("gs", { status: "blocked", blockReason: "bank reports NET revenue; not total revenue!", updatedAt: ago(55) }),
      taskFixture("tsla", { status: "blocked", blockReason: "Fiscal year release, no quarterly figure", updatedAt: ago(8) }),
      taskFixture("stale", { status: "blocked", blockReason: "Bank reports net revenue, not total revenue", updatedAt: ago(500) }),
      taskFixture("open", { status: "open" }),
      // Reopened by applyDiff at version 2: created before the bump, now at version 2.
      taskFixture("wfc", { status: "open", version: 2, createdAt: ago(100) }),
      taskFixture("c", { status: "open", version: 2, createdAt: ago(90) }),
      taskFixture("fresh", { status: "open", version: 2, createdAt: ago(10) }),
    ]);

    const l = await computeLessons(c, goal, now);
    expect(l.at).toEqual(now);
    expect(l.window.since).toEqual(ago(180));
    expect(l.window.tasks).toBe(6); // 3 merged + 3 blocked in the window
    expect(l.firstTryPass).toBeCloseTo(2 / 3);

    // grounded: 4 fails (5 sources minus the stale one minus meta) and 1 + 3 passes
    expect(l.checks).toEqual([
      { kind: "grounded", criterion: "c1", fails: 4, passes: 4 },
      { kind: "consistent", criterion: "c2", fails: 2, passes: 6 },
    ]);

    expect(l.reasons).toHaveLength(2);
    expect(l.reasons[0]).toMatchObject({ count: 4, keys: ["aapl", "msft", "goog"] });
    expect(l.reasons[0].text).toBe(grounded);
    expect(l.reasons[1]).toMatchObject({ count: 2, keys: ["goog", "meta"], text: consistent });

    expect(l.blocked).toEqual([
      { text: "Bank reports net revenue, not total revenue", count: 2, keys: ["jpm", "gs"] },
      { text: "Fiscal year release, no quarterly figure", count: 1, keys: ["tsla"] },
    ]);

    expect(l.recentGuidelines).toEqual([]);

    expect(l.text.length).toBeLessThanOrEqual(MAX_TEXT_CHARS);
    expect(l.text).toContain("Lessons from the record so far");
    expect(l.text).toContain("first-try pass rate 67%");
    expect(l.text).toContain("grounded [c1] 4 fails / 4 passes");
    expect(l.text).toContain("4x " + grounded);
    expect(l.text).toContain("e.g. aapl, msft, goog");
    expect(l.text).toContain("2x Bank reports net revenue");
    expect(l.text).not.toContain("Recent guidelines");
    expect(l.text).not.toContain("stale");
  });

  it("is empty but well formed on an empty record, and readLessons returns null before the first metrics doc", async (c) => {
    expect(await readLessons(c)).toBeNull();
    const l = await computeLessons(c, null, now);
    expect(l).toMatchObject({ firstTryPass: null, checks: [], reasons: [], blocked: [], recentGuidelines: [], window: { tasks: 0 } });
    expect(l.text).toContain("0 tasks finished, no merges yet");
  });

  it("does not double count a merged task whose passing gate source is in the record", async (c) => {
    const id = new ObjectId();
    const g = gate({ grounded: true }, []);
    await c.sources.insertOne(gateSource("aapl", g, ago(5), id));
    await c.tasks.insertOne(taskFixture("aapl", { _id: id, status: "merged", gate: g, updatedAt: ago(4) }));
    const l = await computeLessons(c, goalFixture(), now);
    expect(l.checks).toEqual([{ kind: "grounded", criterion: "c1", fails: 0, passes: 1 }]);
  });
});

describe("renderLessons", () => {
  const base: Omit<Lessons, "text"> = {
    at: now,
    window: { tasks: 40, since: ago(180) },
    firstTryPass: 0.625,
    checks: [
      { kind: "grounded", criterion: "c1", fails: 9, passes: 31 },
      { kind: "schema", criterion: "", fails: 0, passes: 40 },
    ],
    reasons: [{ text: "quote not found verbatim", count: 7, keys: ["a", "b"] }],
    blocked: [{ text: "no quarterly figure", count: 3, keys: [] }],
    recentGuidelines: [],
  };

  pure("renders every section compactly", () => {
    const text = renderLessons(base);
    expect(text.split("\n")).toEqual([
      "Lessons from the record so far (last 3 h, 40 tasks finished, first-try pass rate 63%)",
      "Checks, worst first: grounded [c1] 9 fails / 31 passes; schema 0 fails / 40 passes",
      "Top gate failure reasons:",
      "- 7x quote not found verbatim (e.g. a, b)",
      "Blocked, grouped by reason:",
      "- 3x no quarterly figure",
    ]);
  });

  pure("caps the text at 2000 characters by trimming the longest section first", () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => ({ text: `reason ${i} ` + "x".repeat(150), count: n - i, keys: ["k1", "k2", "k3"] }));
    const text = renderLessons({ ...base, reasons: many(MAX_REASONS), blocked: many(MAX_BLOCKED) });
    expect(text.length).toBeLessThanOrEqual(MAX_TEXT_CHARS);
    expect(text).toContain("first-try pass rate 63%");
    expect(text).toContain("grounded [c1] 9 fails");
    expect(text).toContain("- 12x reason 0");
  });

  pure("lessonsFrom is pure and ignores records outside the window", () => {
    const l = lessonsFrom(
      {
        tasks: [
          taskFixture("in", { status: "merged", attempt: 1, updatedAt: ago(1) }),
          taskFixture("future", { status: "merged", attempt: 2, updatedAt: new Date(now.getTime() + 60_000) }),
        ],
        gates: [],
        goal: null,
      },
      now,
    );
    expect(l.window.tasks).toBe(1);
    expect(l.firstTryPass).toBe(1);
  });
});
