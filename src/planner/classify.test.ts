import { describe, expect } from "vitest";
import type { CrowdOutcome } from "../shared/types.ts";
import { classify, classifyPending } from "./classify.ts";
import { withDb } from "./harness.ts";
import { crowdFixture, goalFixture, inputFixture, stateFixture, taskFixture } from "./testdb.ts";

const decideWith = (outcome: CrowdOutcome) => async () => outcome;

describe("classify", () => {
  const it = withDb();

  async function seed(c: Parameters<Parameters<typeof it>[1]>[0]) {
    const goal = goalFixture();
    await c.goal.insertOne(goal);
    await c.inputs.insertMany([
      inputFixture("nvda", { scheduled: false, scheduledBy: null, company: "NVIDIA" }),
      inputFixture("aapl"),
    ]);
    await c.state.insertOne(stateFixture("aapl"));
    return goal;
  }

  it("task: schedules the input, queues a priority task, marks the source", async (c) => {
    const goal = await seed(c);
    const req = crowdFixture("please add NVIDIA");
    await c.sources.insertOne(req);

    const r = await classify(c, goal, req, decideWith({ outcome: "task", key: "nvda" }));
    expect(r?.outcome).toBe("task");

    const input = await c.inputs.findOne({ _id: "nvda" });
    expect(input).toMatchObject({ scheduled: true, scheduledBy: `crowd:${req._id.toHexString()}` });
    const task = await c.tasks.findOne({ key: "nvda" });
    expect(task).toMatchObject({ status: "open", priority: 1, version: 1, createdBy: `crowd:${req._id.toHexString()}`, criteria: ["c1", "c2"] });
    const src = await c.sources.findOne({ _id: req._id });
    expect(src).toMatchObject({ handled: true, outcome: "task" });
    expect(src?.reason).toContain("nvda");
  });

  it("recheck: queues a priority task with the doubt as hint, old state stays", async (c) => {
    const goal = await seed(c);
    const req = crowdFixture("Apple revenue looks wrong");
    await c.sources.insertOne(req);

    const r = await classify(c, goal, req, decideWith({ outcome: "recheck", key: "aapl", reason: "revenue looks off by 10x" }));
    expect(r?.outcome).toBe("recheck");
    const task = await c.tasks.findOne({ key: "aapl" });
    expect(task).toMatchObject({ status: "open", priority: 1, hint: "revenue looks off by 10x" });
    expect(await c.state.findOne({ _id: "aapl" })).not.toBeNull();
    const src = await c.sources.findOne({ _id: req._id });
    expect(src).toMatchObject({ handled: true, outcome: "recheck" });
    expect(src?.reason).toContain("revenue looks off");
  });

  it("proposal: inserts an open question with the guideline", async (c) => {
    const goal = await seed(c);
    const req = crowdFixture("banks should use net revenue");
    await c.sources.insertOne(req);

    const r = await classify(c, goal, req, decideWith({ outcome: "proposal", guideline: "Banks report net revenue; take that as revenue." }));
    expect(r?.outcome).toBe("proposal");
    const q = await c.questions.findOne({});
    expect(q).toMatchObject({ kind: "approval", status: "open", proposedDiff: { op: "add-guideline", text: "Banks report net revenue; take that as revenue." } });
    const src = await c.sources.findOne({ _id: req._id });
    expect(src).toMatchObject({ handled: true, outcome: "proposal" });
    expect(src?.reason).toContain("Banks report net revenue");
  });

  it("parked: writes the reason and nothing else", async (c) => {
    const goal = await seed(c);
    const req = crowdFixture("what is the weather");
    await c.sources.insertOne(req);

    const r = await classify(c, goal, req, decideWith({ outcome: "parked", reason: "not about earnings" }));
    expect(r?.outcome).toBe("parked");
    expect(await c.tasks.countDocuments({})).toBe(0);
    expect(await c.questions.countDocuments({})).toBe(0);
    const src = await c.sources.findOne({ _id: req._id });
    expect(src).toMatchObject({ handled: true, outcome: "parked", reason: "not about earnings" });
  });

  it("invalid outcomes are parked with 'could not classify' and an error source when the model throws", async (c) => {
    const goal = await seed(c);
    const reqs = [
      crowdFixture("add a scheduled one"),
      crowdFixture("recheck a missing one"),
      crowdFixture("propose an existing guideline"),
      crowdFixture("model failure"),
    ];
    await c.sources.insertMany(reqs);

    await classify(c, goal, reqs[0], decideWith({ outcome: "task", key: "aapl" })); // already scheduled
    await classify(c, goal, reqs[1], decideWith({ outcome: "recheck", key: "msft", reason: "x" })); // no state
    await classify(c, goal, reqs[2], decideWith({ outcome: "proposal", guideline: "Prefer GAAP figures over adjusted ones." }));
    await classify(c, goal, reqs[3], async () => {
      throw new Error("provider down");
    });

    for (const req of reqs) {
      const src = await c.sources.findOne({ _id: req._id });
      expect(src?.outcome).toBe("parked");
      expect(src?.reason).toMatch(/^could not classify: /);
    }
    expect(await c.tasks.countDocuments({})).toBe(0);
    expect(await c.questions.countDocuments({})).toBe(0);
    expect(await c.sources.countDocuments({ kind: "error" })).toBe(1);
  });

  it("a request is handled once even when classified twice; a busy key gets no second task", async (c) => {
    const goal = await seed(c);
    await c.tasks.insertOne(taskFixture("aapl", { status: "claimed", worker: "w-1", heartbeat: new Date() }));
    const req = crowdFixture("recheck apple");
    await c.sources.insertOne(req);
    const decide = decideWith({ outcome: "recheck", key: "aapl", reason: "doubt" });
    const first = await classify(c, goal, req, decide);
    const second = await classify(c, goal, req, decide);
    expect(first?.outcome).toBe("recheck");
    expect(second).toBeNull();
    expect(await c.tasks.countDocuments({ key: "aapl" })).toBe(1);
    expect(first?.reason).toContain("already in flight");
  });

  it("classifyPending handles oldest first up to the cap", async (c) => {
    const goal = await seed(c);
    const reqs = Array.from({ length: 4 }, (_, i) => crowdFixture(`r${i}`, { createdAt: new Date(1_000 * i) }));
    await c.sources.insertMany(reqs);
    const seen: string[] = [];
    const results = await classifyPending(c, goal, 3, async (prompt) => {
      seen.push(prompt);
      return { outcome: "parked", reason: "test" };
    });
    expect(results).toHaveLength(3);
    expect(await c.sources.countDocuments({ kind: "crowd-request", handled: false })).toBe(1);
    expect(seen[0]).toContain("REQUEST:\nr0");
    expect(seen[0]).toContain("nvda: NVIDIA");
    expect(seen[0]).toContain("- aapl");
  });
});
