import { describe, expect } from "vitest";
import { applyDiff, rejectQuestion } from "./applyDiff.ts";
import { withDb } from "./harness.ts";
import { goalFixture, questionFixture, taskFixture } from "./testdb.ts";

describe("applyDiff", () => {
  const it = withDb();

  it("bumps the version, writes history, reopens only blocked tasks at the old version", async (c) => {
    await c.goal.insertOne(goalFixture({ version: 2, history: [
      { version: 1, at: new Date(1), by: "seed", diff: null },
      { version: 2, at: new Date(2), by: "fabio", diff: { op: "add-guideline", text: "Older rule." } },
    ] }));
    const oldBlocked = taskFixture("a", { status: "blocked", blockReason: "bank", version: 2, attempt: 2 });
    const olderBlocked = taskFixture("b", { status: "blocked", blockReason: "bank", version: 1, attempt: 3 });
    const open = taskFixture("c", { status: "open", version: 2 });
    const claimed = taskFixture("d", { status: "claimed", worker: "w-1", heartbeat: new Date(), version: 2 });
    const merged = taskFixture("e", { status: "merged", version: 2 });
    await c.tasks.insertMany([oldBlocked, olderBlocked, open, claimed, merged]);
    const q = questionFixture("Banks report net revenue; take that as revenue.", [oldBlocked._id, olderBlocked._id]);
    await c.questions.insertOne(q);

    const r = await applyDiff(c, q._id, "fabio");
    expect(r).toMatchObject({ version: 3, reopened: 2 });

    const goal = await c.goal.findOne({ _id: "goal" });
    expect(goal?.version).toBe(3);
    expect(goal?.guidelines).toEqual(["Prefer GAAP figures over adjusted ones.", "Banks report net revenue; take that as revenue."]);
    expect(goal?.history).toHaveLength(3);
    expect(goal?.history[2]).toMatchObject({ version: 3, by: "fabio", diff: { op: "add-guideline", text: "Banks report net revenue; take that as revenue." }, questionId: q._id });
    expect(goal?.history[2].at).toBeInstanceOf(Date);

    for (const t of [oldBlocked, olderBlocked]) {
      const doc = await c.tasks.findOne({ _id: t._id });
      expect(doc).toMatchObject({ status: "open", attempt: 1, blockReason: null, version: 3, worker: null, heartbeat: null });
    }
    expect((await c.tasks.findOne({ _id: open._id }))?.version).toBe(2);
    expect((await c.tasks.findOne({ _id: claimed._id }))).toMatchObject({ status: "claimed", version: 2 });
    expect((await c.tasks.findOne({ _id: merged._id }))).toMatchObject({ status: "merged", version: 2 });

    const question = await c.questions.findOne({ _id: q._id });
    expect(question).toMatchObject({ status: "approved", answeredBy: "fabio" });
    expect(question?.answeredAt).toBeInstanceOf(Date);
    const answer = await c.sources.findOne({ kind: "answer" });
    expect(answer).toMatchObject({ version: 3, raw: { status: "approved", by: "fabio", reopened: 2 } });

    // Blocked tasks created later at version 3 are not touched by a repeat.
    expect(await applyDiff(c, q._id, "fabio")).toBeNull();
    expect((await c.goal.findOne({ _id: "goal" }))?.version).toBe(3);
  });

  it("a blocked task at the new version stays blocked", async (c) => {
    await c.goal.insertOne(goalFixture({ version: 1 }));
    const atNew = taskFixture("z", { status: "blocked", blockReason: "x", version: 2 });
    await c.tasks.insertOne(atNew);
    const q = questionFixture("New rule.", [atNew._id]);
    await c.questions.insertOne(q);
    const r = await applyDiff(c, q._id, "fabio");
    expect(r?.version).toBe(2);
    expect(r?.reopened).toBe(0);
    expect((await c.tasks.findOne({ _id: atNew._id }))?.status).toBe("blocked");
  });

  it("only one of two concurrent approvals applies", async (c) => {
    await c.goal.insertOne(goalFixture({ version: 1 }));
    const q = questionFixture("Rule.", []);
    await c.questions.insertOne(q);
    const results = await Promise.all([applyDiff(c, q._id, "a"), applyDiff(c, q._id, "b")]);
    expect(results.filter((r) => r !== null)).toHaveLength(1);
    expect((await c.goal.findOne({ _id: "goal" }))?.version).toBe(2);
  });

  it("rejectQuestion closes the question and writes an answer without touching the goal", async (c) => {
    await c.goal.insertOne(goalFixture({ version: 1 }));
    const q = questionFixture("Rule.", []);
    await c.questions.insertOne(q);
    expect(await rejectQuestion(c, q._id, "fabio")).toMatchObject({ status: "rejected", answeredBy: "fabio" });
    expect(await rejectQuestion(c, q._id, "fabio")).toBeNull();
    expect(await applyDiff(c, q._id, "fabio")).toBeNull();
    expect((await c.goal.findOne({ _id: "goal" }))?.version).toBe(1);
    expect(await c.sources.countDocuments({ kind: "answer" })).toBe(1);
  });
});
