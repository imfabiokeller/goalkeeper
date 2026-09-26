import { describe, expect } from "vitest";
import type { ScoreFn } from "../shared/types.ts";
import { withDb } from "./harness.ts";
import { plan } from "./plan.ts";
import { scoreStates, TOO_SPECIFIC_HINT } from "./score.ts";
import { goalFixture, inputFixture, stateFixture, taskFixture } from "./testdb.ts";

// A scorer that never sees answers: right when the proposal names the key.
const byKey: ScoreFn = (proposal, input) => ((proposal as { key?: string }).key === input.key ? 1 : 0);

describe("score", () => {
  const it = withDb();

  it("scores unscored states, passes the input like the gate does, reopens a 0 once", async (c) => {
    const goal = goalFixture();
    await c.goal.insertOne(goal);
    await c.inputs.insertMany([inputFixture("a", { meta: { grid: [1] } }), inputFixture("b"), inputFixture("done")]);
    await c.state.insertMany([
      stateFixture("a", { data: { key: "a" } }),
      stateFixture("b", { data: { key: "wrong" } }),
      stateFixture("done", { data: { key: "wrong" }, score: 1, scoredAt: new Date() }),
      stateFixture("orphan", { data: {} }),
    ]);
    const seen: unknown[] = [];
    const spy: ScoreFn = (p, i) => {
      seen.push(i);
      return byKey(p, i);
    };

    const r = await scoreStates(c, goal, spy);
    expect(r).toEqual({ scored: 2, solved: 1, reopened: 1, skipped: 1 });
    expect(seen[0]).toMatchObject({ key: "a", name: "A", text: "press release for a", grid: [1] });
    expect(await c.state.findOne({ _id: "a" })).toMatchObject({ score: 1 });
    expect((await c.state.findOne({ _id: "a" }))?.scoredAt).toBeInstanceOf(Date);
    expect(await c.state.findOne({ _id: "b" })).toMatchObject({ score: 0 });
    expect(await c.state.findOne({ _id: "done" })).toMatchObject({ score: 1 });
    expect((await c.state.findOne({ _id: "orphan" }))?.score).toBeUndefined();

    const reopened = await c.tasks.find({ key: "b" }).toArray();
    expect(reopened).toHaveLength(1);
    expect(reopened[0]).toMatchObject({ status: "open", priority: 1, attempt: 1, hint: TOO_SPECIFIC_HINT, createdBy: "planner" });
    expect(await c.tasks.countDocuments({ key: "a" })).toBe(0);

    // Second pass: nothing left to score, the orphan is skipped again.
    expect(await scoreStates(c, goal, spy)).toEqual({ scored: 0, solved: 0, reopened: 0, skipped: 1 });
  });

  it("a second 0 on the same key does not reopen it again", async (c) => {
    const goal = goalFixture();
    await c.goal.insertOne(goal);
    await c.inputs.insertOne(inputFixture("b"));
    await c.tasks.insertOne(taskFixture("b", { status: "merged", hint: TOO_SPECIFIC_HINT }));
    await c.state.insertOne(stateFixture("b", { data: { key: "still wrong" }, stateVersion: 2 }));
    expect(await scoreStates(c, goal, byKey)).toEqual({ scored: 1, solved: 0, reopened: 0, skipped: 0 });
    expect(await c.tasks.countDocuments({ key: "b", status: "open" })).toBe(0);
  });

  it("a re-merge after scoring is scored again", async (c) => {
    const goal = goalFixture();
    await c.goal.insertOne(goal);
    await c.inputs.insertOne(inputFixture("b"));
    await c.tasks.insertOne(taskFixture("b", { status: "merged", hint: TOO_SPECIFIC_HINT }));
    await c.state.insertOne(
      stateFixture("b", { data: { key: "b" }, score: 0, scoredAt: new Date(Date.now() - 60_000), mergedAt: new Date() }),
    );
    expect(await scoreStates(c, goal, byKey)).toEqual({ scored: 1, solved: 1, reopened: 0, skipped: 0 });
    expect(await c.state.findOne({ _id: "b" })).toMatchObject({ score: 1 });
  });

  it("no scorer means a no-op, and the hint never carries answer content", async (c) => {
    await c.goal.insertOne(goalFixture());
    await c.inputs.insertOne(inputFixture("a"));
    await c.state.insertOne(stateFixture("a"));
    expect(await scoreStates(c, goalFixture(), null)).toEqual({ scored: 0, solved: 0, reopened: 0, skipped: 0 });
    expect((await c.state.findOne({ _id: "a" }))?.score).toBeUndefined();
    expect(TOO_SPECIFIC_HINT).not.toMatch(/answer|\[\[/);
  });

  it("plan() runs the score step after emit and records the counts in the turn", async (c) => {
    await c.goal.insertOne(goalFixture());
    await c.inputs.insertMany([inputFixture("a"), inputFixture("b")]);
    await c.state.insertOne(stateFixture("a", { data: { key: "nope" } }));
    const report = await plan(c, "w-1", { workersTarget: 8, score: byKey });
    expect(report?.score).toEqual({ scored: 1, solved: 0, reopened: 1, skipped: 0 });
    expect(report?.emitted).toBe(1); // b only: a has state
    expect(await c.tasks.countDocuments({ key: "a", status: "open", priority: 1 })).toBe(1);
    const turn = await c.sources.findOne({ kind: "planner-turn" });
    expect(turn?.raw).toMatchObject({ score: { scored: 1, reopened: 1 } });
    expect(turn?.text).toContain("scored 1");
  });
});
