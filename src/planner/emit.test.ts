import { describe, expect } from "vitest";
import { emit, insertTaskIfIdle } from "./emit.ts";
import { withDb } from "./harness.ts";
import { goalFixture, inputFixture, stateFixture, taskFixture } from "./testdb.ts";

describe("emit", () => {
  const it = withDb();

  it("emits exactly one task per undone key and none for busy or done keys", async (c) => {
    const goal = goalFixture({ version: 2 });
    await c.goal.insertOne(goal);
    await c.inputs.insertMany([
      inputFixture("a"),
      inputFixture("b"),
      inputFixture("c"),
      inputFixture("d"),
      inputFixture("e"),
      inputFixture("f"),
      inputFixture("g"),
      inputFixture("unscheduled", { scheduled: false, scheduledBy: null }),
    ]);
    await c.tasks.insertMany([
      taskFixture("b", { status: "open" }),
      taskFixture("c", { status: "claimed", worker: "w-1", heartbeat: new Date() }),
      taskFixture("d", { status: "blocked", blockReason: "x" }),
      taskFixture("e", { status: "merged", version: 1 }), // old version, not busy
    ]);
    await c.state.insertMany([
      stateFixture("e", { version: 1 }), // solved at an older version: still solved
      stateFixture("f", { version: 2 }), // done at current version
    ]);

    expect(await emit(c, goal, 8)).toBe(2);
    const open = await c.tasks.find({ status: "open", createdBy: "planner", version: 2 }).sort({ key: 1 }).toArray();
    expect(open.map((t) => t.key)).toEqual(["a", "g"]);
    expect(open[0]).toMatchObject({ criteria: ["c1", "c2"], priority: 0, attempt: 1, worker: null, heartbeat: null });

    // Idempotent: a second pass emits nothing.
    expect(await emit(c, goal, 8)).toBe(0);
    expect(await c.tasks.countDocuments({ key: "a" })).toBe(1);
  });

  it("stops at three times the worker target", async (c) => {
    const goal = goalFixture();
    await c.goal.insertOne(goal);
    await c.inputs.insertMany(Array.from({ length: 10 }, (_, i) => inputFixture(`k${i}`)));
    await c.tasks.insertOne(taskFixture("k0", { status: "open" }));
    expect(await emit(c, goal, 1)).toBe(2);
    expect(await c.tasks.countDocuments({ status: "open" })).toBe(3);
    expect(await emit(c, goal, 1)).toBe(0);
  });

  it("insertTaskIfIdle is a guard against concurrent emits for the same key", async (c) => {
    const goal = goalFixture();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => insertTaskIfIdle(c, { key: "same", goal, priority: 0, createdBy: "planner" })),
    );
    expect(results.filter((r) => r !== null)).toHaveLength(1);
    expect(await c.tasks.countDocuments({ key: "same" })).toBe(1);
  });
});
