import { describe, expect } from "vitest";
import { withDb } from "./harness.ts";
import { normalizeReason, propose } from "./propose.ts";
import { goalFixture, questionFixture, taskFixture } from "./testdb.ts";

const reasons = [
  "Bank reports net revenue, not total revenue: JPM",
  "bank reports NET revenue, not total revenue (GS)",
  "Bank  reports net revenue; not total revenue - MS",
];

describe("propose", () => {
  const it = withDb();

  it("normalizes reasons to a lowercase alphanumeric prefix", () => {
    expect(normalizeReason("Bank reports NET revenue, not total revenue: JPM")).toBe("bank reports net revenue not total reven");
    expect(new Set(reasons.map(normalizeReason)).size).toBe(1);
    return Promise.resolve();
  });

  it("creates one question for three similar reasons with all three as evidence", async (c) => {
    const goal = goalFixture();
    await c.goal.insertOne(goal);
    const tasks = reasons.map((r) => taskFixture(`k-${r.slice(-3)}`, { status: "blocked", blockReason: r }));
    await c.tasks.insertMany([...tasks, taskFixture("other", { status: "blocked", blockReason: "something unrelated" })]);

    const prompts: string[] = [];
    const n = await propose(c, goal, async (p) => {
      prompts.push(p);
      return { guideline: "Banks report net revenue; take that as revenue." };
    });
    expect(n).toBe(1);
    expect(prompts).toHaveLength(1);
    const q = await c.questions.findOne({});
    expect(q).toMatchObject({ kind: "approval", status: "open", proposedDiff: { op: "add-guideline", text: "Banks report net revenue; take that as revenue." } });
    expect(q?.evidence.map(String).sort()).toEqual(tasks.map((t) => String(t._id)).sort());

    // A second pass finds the open question citing the group and does nothing.
    expect(await propose(c, goal, async () => ({ guideline: "another" }))).toBe(0);
  });

  it("creates nothing for two similar reasons", async (c) => {
    const goal = goalFixture();
    await c.goal.insertOne(goal);
    await c.tasks.insertMany(reasons.slice(0, 2).map((r) => taskFixture(`k-${r.slice(-3)}`, { status: "blocked", blockReason: r })));
    let called = false;
    const n = await propose(c, goal, async () => {
      called = true;
      return { guideline: "x" };
    });
    expect(n).toBe(0);
    expect(called).toBe(false);
    expect(await c.questions.countDocuments({})).toBe(0);
  });

  it("rejects empty or duplicate guideline text and logs an error source", async (c) => {
    const goal = goalFixture();
    await c.goal.insertOne(goal);
    await c.tasks.insertMany(reasons.map((r) => taskFixture(`k-${r.slice(-3)}`, { status: "blocked", blockReason: r })));
    await c.questions.insertOne(questionFixture("Already proposed.", []));

    expect(await propose(c, goal, async () => ({ guideline: "  " }))).toBe(0);
    expect(await propose(c, goal, async () => ({ guideline: "Prefer GAAP figures over adjusted ones." }))).toBe(0);
    expect(await propose(c, goal, async () => ({ guideline: "Already proposed." }))).toBe(0);
    expect(await c.questions.countDocuments({})).toBe(1);
    expect(await c.sources.countDocuments({ kind: "error" })).toBe(3);
  });
});
