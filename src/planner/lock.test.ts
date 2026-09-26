import { describe, expect } from "vitest";
import { withDb } from "./harness.ts";
import { acquire, release } from "./lock.ts";
import { reap } from "./reaper.ts";
import { taskFixture } from "./testdb.ts";

describe("lock", () => {
  const it = withDb();

  it("first acquire creates the document and later acquires by others fail until the TTL", async (c) => {
    expect(await acquire(c, "w-1", 30_000)).toBe(true);
    expect(await acquire(c, "w-2", 30_000)).toBe(false);
    expect(await acquire(c, "w-1", 30_000)).toBe(true); // holder may renew
    expect(await release(c, "w-2")).toBe(false); // not the holder
    expect(await release(c, "w-1")).toBe(true);
    expect(await acquire(c, "w-2", 30_000)).toBe(true);
  });

  it("an expired lock can be taken over", async (c) => {
    expect(await acquire(c, "w-1", -1)).toBe(true); // already expired
    expect(await acquire(c, "w-2", 30_000)).toBe(true);
    const doc = await c.locks.findOne({ _id: "planner" });
    expect(doc?.holder).toBe("w-2");
  });

  it("two concurrent acquires: exactly one wins", async (c) => {
    for (let round = 0; round < 5; round++) {
      await c.locks.deleteMany({});
      const results = await Promise.all(["a", "b", "c", "d"].map((h) => acquire(c, h, 30_000)));
      expect(results.filter(Boolean)).toHaveLength(1);
    }
  });
});

describe("reaper", () => {
  const it = withDb();

  it("returns a task with a 31 s old heartbeat and leaves a 29 s one alone", async (c) => {
    const now = Date.now();
    const stale = taskFixture("stale", { status: "claimed", worker: "w-1", heartbeat: new Date(now - 31_000), attempt: 2 });
    const fresh = taskFixture("fresh", { status: "claimed", worker: "w-2", heartbeat: new Date(now - 29_000) });
    const merged = taskFixture("done", { status: "merged", worker: "w-3", heartbeat: new Date(now - 90_000) });
    await c.tasks.insertMany([stale, fresh, merged]);

    expect(await reap(c, 30_000)).toBe(1);

    const s = await c.tasks.findOne({ _id: stale._id });
    expect(s).toMatchObject({ status: "open", worker: null, heartbeat: null, attempt: 3, lastWorker: "w-1" });
    expect(s?.diedAt).toBeInstanceOf(Date);
    expect(s?.progress).toHaveLength(1);
    expect(s?.progress?.[0]).toMatchObject({ step: 0, tool: "reaper" });
    const f = await c.tasks.findOne({ _id: fresh._id });
    expect(f).toMatchObject({ status: "claimed", worker: "w-2", attempt: 1 });
    const m = await c.tasks.findOne({ _id: merged._id });
    expect(m?.status).toBe("merged");
  });

  it("the requeue appends to the worker's progress and keeps the last entries only", async (c) => {
    const now = Date.now();
    const progress = Array.from({ length: 25 }, (_, i) => ({ at: new Date(now - 60_000 + i * 1000), step: i + 1, tool: "read_input" }));
    const stale = taskFixture("stale", { status: "claimed", worker: "w-9", heartbeat: new Date(now - 31_000), step: 25, progress });
    await c.tasks.insertOne(stale);
    expect(await reap(c, 30_000)).toBe(1);
    const s = await c.tasks.findOne({ _id: stale._id });
    expect(s?.lastWorker).toBe("w-9");
    expect(s?.progress).toHaveLength(25);
    expect(s?.progress?.at(-1)).toMatchObject({ step: 25, tool: "reaper" });
    expect(s?.progress?.[0]?.step).toBe(2); // the oldest line fell off
  });
});
