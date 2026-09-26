import { describe, expect } from "vitest";
import { withDb } from "./harness.ts";
import { checkInvariants } from "./invariants.ts";
import { refreshMetrics } from "./metrics.ts";
import { plan } from "./plan.ts";
import { crowdFixture, goalFixture, inputFixture, stateFixture, taskFixture } from "./testdb.ts";

describe("plan", () => {
  const it = withDb();

  it("runs every step under the lock and writes a planner-turn source", async (c) => {
    const goal = goalFixture();
    await c.goal.insertOne(goal);
    await c.inputs.insertMany([inputFixture("a"), inputFixture("b"), inputFixture("nvda", { scheduled: false, scheduledBy: null })]);
    await c.tasks.insertOne(taskFixture("stale", { status: "claimed", worker: "w-9", heartbeat: new Date(Date.now() - 60_000) }));
    await c.sources.insertOne(crowdFixture("add nvidia"));

    const report = await plan(c, "w-1", {
      workersTarget: 8,
      decideCrowd: async () => ({ outcome: "task", key: "nvda" }),
      decideGuideline: async () => ({ guideline: "never called" }),
    });
    expect(report).toMatchObject({ reaped: 1, emitted: 2, proposed: 0, backfilled: 0, errors: [] });
    expect(report?.crowd).toHaveLength(1);
    expect(report?.crowd[0].outcome).toBe("task");

    expect(await c.tasks.countDocuments({ status: "open" })).toBe(4); // stale + a + b + nvda
    expect(await c.metrics.findOne({ _id: "metrics" })).not.toBeNull();
    const turn = await c.sources.findOne({ kind: "planner-turn" });
    expect(turn?.raw).toMatchObject({ holder: "w-1", reaped: 1, emitted: 2 });
    expect(turn?.text).toContain("emitted 2");

    // Lock released: a second run gets it and finds nothing to do.
    const again = await plan(c, "w-2", { workersTarget: 8 });
    expect(again).toMatchObject({ reaped: 0, emitted: 0, crowd: [] });
  });

  it("two concurrent plan() calls: one gets the lock, the other returns null", async (c) => {
    await c.goal.insertOne(goalFixture());
    const results = await Promise.all([plan(c, "w-1", { workersTarget: 1 }), plan(c, "w-2", { workersTarget: 1 })]);
    expect(results.filter((r) => r === null)).toHaveLength(1);
    expect(await c.sources.countDocuments({ kind: "planner-turn" })).toBe(1);
  });

  it("a missing goal becomes an error source, the lock is still released", async (c) => {
    const report = await plan(c, "w-1", {});
    expect(report?.errors[0]).toContain("no goal");
    expect(await c.sources.countDocuments({ kind: "error" })).toBe(1);
    expect(await plan(c, "w-2", {})).not.toBeNull();
  });

  it("backfills sources without enrichment when an enrich function is given", async (c) => {
    await c.goal.insertOne(goalFixture());
    await c.sources.insertOne(crowdFixture("x", { handled: true }));
    const report = await plan(c, "w-1", {
      enrich: async () => ({ gist: "g", entities: { keys: [], fields: [] }, labels: [], embedding: [0.1] }),
    });
    expect(report?.backfilled).toBe(1);
    expect((await c.sources.findOne({ kind: "crowd-request" }))?.enrichment?.gist).toBe("g");
  });
});

describe("metrics", () => {
  const it = withDb();

  it("buckets merges, blocks, failures and tokens per minute and fills the totals", async (c) => {
    const goal = goalFixture({ version: 2, history: [
      { version: 1, at: new Date(1), by: "seed", diff: null },
      { version: 2, at: new Date(2), by: "fabio", diff: { op: "add-guideline", text: "r" } },
    ] });
    await c.goal.insertOne(goal);
    await c.inputs.insertMany([inputFixture("a"), inputFixture("b"), inputFixture("c", { scheduled: false, scheduledBy: null })]);
    await c.state.insertMany([stateFixture("a", { version: 2 }), stateFixture("b", { version: 1 })]);
    const now = new Date("2026-09-26T14:10:30Z");
    const m1 = new Date("2026-09-26T14:05:10Z");
    const m2 = new Date("2026-09-26T14:07:50Z");
    await c.tasks.insertMany([
      taskFixture("a", { status: "merged", attempt: 1, updatedAt: m1 }),
      taskFixture("b", { status: "merged", attempt: 2, updatedAt: m2 }),
      taskFixture("c", { status: "blocked", blockReason: "x", updatedAt: m2 }),
      taskFixture("d", { status: "open" }),
      taskFixture("old", { status: "merged", attempt: 1, updatedAt: new Date("2026-09-26T09:00:00Z") }),
    ]);
    await c.sources.insertMany([
      crowdFixture("run", { kind: "worker-run", tokens: { in: 1000, out: 100, cost: 0.01 }, createdAt: m1 }),
      crowdFixture("run", { kind: "worker-run", tokens: { in: 3000, out: 100, cost: 0.01 }, createdAt: m2 }),
      crowdFixture("gate", { kind: "gate", raw: { pass: false, reasons: ["x"] }, createdAt: m2 }),
      crowdFixture("gate", { kind: "gate", raw: { pass: true, reasons: [] }, createdAt: m2 }),
    ]);

    const m = await refreshMetrics(c, now);
    expect(m.perMinute).toHaveLength(180);
    expect(m.perMinute[179].minute.toISOString()).toBe("2026-09-26T14:10:00.000Z");
    const at = (iso: string) => m.perMinute.find((p) => p.minute.toISOString() === iso);
    expect(at("2026-09-26T14:05:00.000Z")).toMatchObject({ merged: 1, failed: 0, blocked: 0, tokens: 1100, contextAvg: 1000, firstTryPass: 1 });
    expect(at("2026-09-26T14:07:00.000Z")).toMatchObject({ merged: 1, failed: 1, blocked: 1, tokens: 3100, contextAvg: 3000, firstTryPass: 0.5 });
    expect(at("2026-09-26T14:06:00.000Z")).toMatchObject({ merged: 0, tokens: 0, contextAvg: null, firstTryPass: 1 });
    expect(at("2026-09-26T13:00:00.000Z")?.firstTryPass).toBeNull();
    expect(m.totals).toMatchObject({ merged: 3, blocked: 1, open: 1, libraryTokens: 4200, librarySources: 4, contextLast20Avg: 2000 });
    expect(m.perCriterion).toEqual({ c1: { done: 1, total: 2 }, c2: { done: 1, total: 2 } });
    expect(m.versions.map((v) => v.version)).toEqual([1, 2]);
    expect(await c.metrics.findOne({ _id: "metrics" })).not.toBeNull();
    await refreshMetrics(c, now); // upsert twice is fine
  });
});

describe("invariants", () => {
  const it = withDb();

  it("is clean on a consistent database and names every violation otherwise", async (c) => {
    await c.goal.insertOne(goalFixture());
    const merged = taskFixture("a", { status: "merged" });
    await c.tasks.insertOne(merged);
    await c.state.insertOne(stateFixture("a", { taskId: merged._id }));
    expect(await checkInvariants(c)).toEqual([]);

    await c.tasks.insertMany([
      taskFixture("dup", { status: "claimed", worker: "w-1", heartbeat: new Date() }),
      taskFixture("dup", { status: "claimed", worker: "w-2", heartbeat: new Date() }),
      taskFixture("badcrit", { criteria: ["c1", "c9"] }),
      taskFixture("stale", { status: "claimed", worker: "w-3", heartbeat: new Date(Date.now() - 100_000) }),
    ]);
    await c.state.insertOne(stateFixture("orphan"));
    const v = await checkInvariants(c);
    expect(v).toHaveLength(4);
    expect(v.join("\n")).toMatch(/key dup has 2 claimed/);
    expect(v.join("\n")).toMatch(/state orphan has no merged task/);
    expect(v.join("\n")).toMatch(/cites unknown criteria c9/);
    expect(v.join("\n")).toMatch(/\(stale\) claimed by w-3/);
  });
});
