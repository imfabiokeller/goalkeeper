import { describe, expect } from "vitest";
import { withDb } from "./harness.ts";
import { plan } from "./plan.ts";
import { previousMergedCount, reopenOnGrowth, REOPENED_PREFIX } from "./reopen.ts";
import { TOO_SPECIFIC_HINT } from "./score.ts";
import { crowdFixture, goalFixture, stateFixture, taskFixture } from "./testdb.ts";

const ago = (s: number) => new Date(Date.now() - s * 1000);

describe("reopen on library growth", () => {
  const it = withDb();

  it("reopens old blocked tasks when the merged count crosses a multiple of 20", async (c) => {
    // 21 merges: the 20th most recent merged 100 s ago.
    await c.state.insertMany(Array.from({ length: 21 }, (_, i) => stateFixture(`m${i}`, { mergedAt: ago(200 - i * 5) })));
    const nth = (await c.state.findOne({}, { sort: { mergedAt: -1 }, skip: 19 }))!.mergedAt;
    await c.tasks.insertMany([
      taskFixture("old", { status: "blocked", blockReason: "no rule fits", updatedAt: new Date(nth.getTime() - 1000) }),
      taskFixture("fresh", { status: "blocked", blockReason: "x", updatedAt: new Date(nth.getTime() + 1000) }),
      taskFixture("second", { status: "blocked", blockReason: "y", hint: TOO_SPECIFIC_HINT, updatedAt: ago(500) }),
      taskFixture("openone", { status: "open", updatedAt: ago(500) }),
      taskFixture("mergedone", { status: "merged", updatedAt: ago(500) }),
    ]);

    // Previous run saw 19: no crossing at 19 -> 19, crossing at 19 -> 21.
    expect(await reopenOnGrowth(c, 21)).toEqual({ merged: 21, previous: 21, reopened: 0 });
    expect(await c.tasks.countDocuments({ status: "blocked" })).toBe(3);

    const r = await reopenOnGrowth(c, 19);
    expect(r).toEqual({ merged: 21, previous: 19, reopened: 1 });
    const old = await c.tasks.findOne({ key: "old" });
    expect(old).toMatchObject({
      status: "open",
      attempt: 1,
      blockReason: null,
      worker: null,
      heartbeat: null,
      hint: `${REOPENED_PREFIX}no rule fits; the library has grown since`,
    });
    expect(old!.updatedAt.getTime()).toBeGreaterThan(nth.getTime());
    expect((await c.tasks.findOne({ key: "fresh" }))?.status).toBe("blocked");
    expect((await c.tasks.findOne({ key: "second" }))?.status).toBe("blocked");
    expect((await c.tasks.findOne({ key: "openone" }))?.attempt).toBe(1);
  });

  it("does nothing under 20 merges or without a 20th merge", async (c) => {
    await c.tasks.insertOne(taskFixture("old", { status: "blocked", blockReason: "x", updatedAt: ago(1000) }));
    expect(await reopenOnGrowth(c, 0)).toEqual({ merged: 0, previous: 0, reopened: 0 });
    await c.state.insertMany(Array.from({ length: 5 }, (_, i) => stateFixture(`m${i}`)));
    expect(await reopenOnGrowth(c, 0)).toEqual({ merged: 5, previous: 0, reopened: 0 });
    expect((await c.tasks.findOne({ key: "old" }))?.status).toBe("blocked");
  });

  it("reads the previous merged count from the last planner-turn source", async (c) => {
    expect(await previousMergedCount(c)).toBe(0);
    await c.sources.insertMany([
      crowdFixture("t1", { kind: "planner-turn", raw: { merged: 7 }, createdAt: ago(60) }),
      crowdFixture("t2", { kind: "planner-turn", raw: { merged: 19 }, createdAt: ago(30) }),
      crowdFixture("old-shape", { kind: "planner-turn", raw: { emitted: 2 }, createdAt: ago(10) }),
    ]);
    expect(await previousMergedCount(c)).toBe(19);
  });

  it("plan() records the merged count in the turn so the next run can compare", async (c) => {
    await c.goal.insertOne(goalFixture());
    await c.state.insertMany(Array.from({ length: 20 }, (_, i) => stateFixture(`m${i}`, { mergedAt: ago(100 - i) })));
    await c.tasks.insertOne(taskFixture("old", { status: "blocked", blockReason: "x", updatedAt: ago(500) }));

    const first = await plan(c, "w-1", { workersTarget: 1, score: null });
    expect(first?.reopen).toEqual({ merged: 20, previous: 0, reopened: 1 });
    const turn = await c.sources.findOne({ kind: "planner-turn" });
    expect(turn?.raw).toMatchObject({ merged: 20, reopened: 1 });

    // Same count next run: nothing crosses, nothing reopens.
    await c.tasks.insertOne(taskFixture("later", { status: "blocked", blockReason: "x", updatedAt: ago(500) }));
    const second = await plan(c, "w-2", { workersTarget: 1, score: null });
    expect(second?.reopen).toEqual({ merged: 20, previous: 20, reopened: 0 });
  });
});
