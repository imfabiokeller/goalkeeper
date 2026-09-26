import { describe, expect, test as pureTest } from "vitest";
import { withDb } from "./harness.ts";
import { answerNeedles, checkInvariants } from "./invariants.ts";
import { refreshMetrics } from "./metrics.ts";
import { plan } from "./plan.ts";
import { sourceFixture, goalFixture, inputFixture, stateFixture, taskFixture } from "./testdb.ts";

describe("plan", () => {
  const it = withDb();

  it("runs every step under the lock and writes a planner-turn source", async (c) => {
    const goal = goalFixture();
    await c.goal.insertOne(goal);
    await c.inputs.insertMany([inputFixture("a"), inputFixture("b"), inputFixture("held", { scheduled: false, scheduledBy: null })]);
    await c.tasks.insertOne(taskFixture("stale", { status: "claimed", worker: "w-9", heartbeat: new Date(Date.now() - 60_000) }));

    const report = await plan(c, "w-1", { workersTarget: 8 });
    expect(report).toMatchObject({ reaped: 1, emitted: 2, backfilled: 0, errors: [] });

    expect(await c.tasks.countDocuments({ status: "open" })).toBe(3); // stale + a + b
    expect(await c.metrics.findOne({ _id: "metrics" })).not.toBeNull();
    const turn = await c.sources.findOne({ kind: "planner-turn" });
    expect(turn?.raw).toMatchObject({ holder: "w-1", reaped: 1, emitted: 2 });
    expect(turn?.text).toContain("emitted 2");

    // Lock released: a second run gets it and finds nothing to do.
    const again = await plan(c, "w-2", { workersTarget: 8 });
    expect(again).toMatchObject({ reaped: 0, emitted: 0 });
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
    await c.sources.insertOne(sourceFixture("x"));
    const report = await plan(c, "w-1", {
      enrich: async () => ({ gist: "g", entities: { keys: [], fields: [] }, labels: [], embedding: [0.1] }),
    });
    expect(report?.backfilled).toBe(1);
    expect((await c.sources.findOne({ kind: "worker-run" }))?.enrichment?.gist).toBe("g");
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
      sourceFixture("run", { kind: "worker-run", tokens: { in: 1000, out: 100, cost: 0.01 }, raw: { contextTokens: 1000 }, createdAt: m1 }),
      sourceFixture("run", { kind: "worker-run", tokens: { in: 3000, out: 100, cost: 0.01 }, raw: { contextTokens: 3000 }, createdAt: m2 }),
      sourceFixture("gate", { kind: "gate", raw: { pass: false, reasons: ["x"] }, createdAt: m2 }),
      sourceFixture("gate", { kind: "gate", raw: { pass: true, reasons: [] }, createdAt: m2 }),
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

  it("solve rate: one cumulative row per 15-minute bucket, plus solved, attempted and the steps median", async (c) => {
    await c.goal.insertOne(goalFixture());
    const now = new Date("2026-09-26T15:05:00Z");
    const t = (iso: string) => new Date(`2026-09-26T${iso}Z`);
    await c.tasks.insertMany([
      taskFixture("a", { status: "merged", createdAt: t("14:20:00") }),
      taskFixture("a", { status: "merged", createdAt: t("14:50:00") }), // second attempt: same key, counted once
      taskFixture("b", { status: "merged", createdAt: t("14:35:00") }),
      taskFixture("c", { status: "blocked", blockReason: "x", createdAt: t("14:50:00") }),
    ]);
    await c.state.insertMany([
      stateFixture("a", { mergedAt: t("14:25:00"), score: 1, scoredAt: t("14:31:00") }),
      stateFixture("b", { mergedAt: t("14:40:00"), score: 0, scoredAt: t("14:41:00") }),
    ]);
    const run = (steps: number, pass: boolean, at: string) =>
      sourceFixture("run", { kind: "worker-run", raw: { steps: Array.from({ length: steps }, () => ({})), gate: { pass } }, createdAt: t(at) });
    await c.sources.insertMany([run(3, true, "14:25:00"), run(9, true, "14:40:00"), run(5, true, "14:41:00"), run(20, false, "14:50:00")]);

    const m = await refreshMetrics(c, now);
    expect(m.solveRate?.map((b) => [b.bucket.toISOString().slice(11, 16), b.attempted, b.merged, b.solved])).toEqual([
      ["14:15", 1, 1, 0],
      ["14:30", 2, 2, 1],
      ["14:45", 3, 2, 1],
      ["15:00", 3, 2, 1],
    ]);
    expect(m.totals).toMatchObject({ solved: 1, attempted: 3, stepsMedian: 5 });

    // No tasks yet: an empty curve, nulls where nothing merged.
    await c.tasks.deleteMany({});
    await c.sources.deleteMany({});
    const empty = await refreshMetrics(c, now);
    expect(empty.solveRate).toEqual([]);
    expect(empty.totals).toMatchObject({ solved: 1, attempted: 0, stepsMedian: null });
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

  it("flags a solved key with an open task, a bad score, and answer text in hints or sources", async (c) => {
    await c.goal.insertOne(goalFixture());
    const merged = (key: string) => taskFixture(key, { status: "merged" });
    const ma = merged("a");
    const mb = merged("b");
    const mc = merged("c");
    await c.tasks.insertMany([ma, mb, mc, taskFixture("a", { status: "open" }), taskFixture("b", { status: "open" })]);
    await c.state.insertMany([
      stateFixture("a", { taskId: ma._id, score: 1 }),
      stateFixture("b", { taskId: mb._id, score: 0 }), // wrong once, open again: fine
      stateFixture("c", { taskId: mc._id, score: 2 as unknown as 1 }),
    ]);
    const needles = [
      { key: "p1", needle: "[[1,2,3],[4,5,6]]" },
      { key: "p1", needle: "123\n456" },
    ];
    await c.tasks.insertOne(taskFixture("leak", { status: "blocked", blockReason: "x", hint: "the output is [[1, 2, 3], [4, 5, 6]]" }));
    await c.sources.insertMany([
      sourceFixture("clean run: 1 2 3", { kind: "worker-run", key: "p1" }),
      sourceFixture("rows:\n123\n456\n", { kind: "worker-run", key: "p1" }),
    ]);

    const v = await checkInvariants(c, new Date(), needles);
    expect(v).toHaveLength(4);
    expect(v.join("\n")).toMatch(/state a scored 1 but has an open task/);
    expect(v.join("\n")).toMatch(/state c has score 2/);
    expect(v.join("\n")).toMatch(/\(leak\) hint contains the answer of p1/);
    expect(v.join("\n")).toMatch(/source .* \(worker-run, p1\) contains the answer of p1/);

    // No needles (answers folder absent): the leak checks are skipped.
    const without = await checkInvariants(c, new Date(), []);
    expect(without).toHaveLength(2);
  });

  pureTest("answerNeedles reads every grid of every answers file and skips a missing folder", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "answers-"));
    writeFileSync(join(dir, "one.json"), JSON.stringify([[[1, 2, 3, 4], [5, 6, 7, 8]]])); // one test output, wrapped
    writeFileSync(join(dir, "two.json"), JSON.stringify([[7, 7, 7, 7, 7]])); // a bare grid
    writeFileSync(join(dir, "tiny.json"), JSON.stringify([[[3]]])); // too short to be a needle
    writeFileSync(join(dir, "notes.txt"), "ignored");
    const needles = answerNeedles(dir);
    expect(needles).toEqual([
      { key: "one", needle: "[[1,2,3,4],[5,6,7,8]]" },
      { key: "one", needle: "1234\n5678" },
      { key: "two", needle: "[[7,7,7,7,7]]" },
    ]);
    expect(answerNeedles(join(dir, "missing"))).toEqual([]);
  });
});
