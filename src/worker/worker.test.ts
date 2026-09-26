import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MockLanguageModelV3 } from "ai/test";
import type { LanguageModelV3CallOptions, LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import { collections, ensureIndexes, type Collections } from "../shared/db.ts";
import { goalFromLens } from "../shared/goal.ts";
import type { Goal, Task } from "../shared/types.ts";
import { checkInput, checkState, iteration, MAX_ATTEMPTS, type IterationOptions } from "./loop.ts";
import { claim, heartbeat } from "./claim.ts";
import { retrieve } from "../context/retrieve.ts";
import { flattenRun, proposalLines } from "./write.ts";

const lens = JSON.parse(readFileSync(new URL("../../usecase/lens.json", import.meta.url), "utf8"));
const goal: Goal = goalFromLens(lens);
const appleText = readFileSync(new URL("../../usecase/inputs/60c09cac.txt", import.meta.url), "utf8");
const appleSample = JSON.parse(readFileSync(new URL("../../usecase/samples/01-upscale-pass.json", import.meta.url), "utf8"));
// The puzzle's example pairs and test inputs, as the seed puts them into meta.
const puzzleMeta = (() => {
  const index = JSON.parse(readFileSync(new URL("../../usecase/inputs.json", import.meta.url), "utf8")) as { key: string; train: unknown; test: unknown }[];
  const e = index.find((x) => x.key === "60c09cac")!;
  return { train: e.train, test: e.test };
})();

let mongod: MongoMemoryServer;
let client: MongoClient;
let c: Collections;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  c = collections(client.db("goalkeeper-test"));
  await ensureIndexes(c);
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all(Object.values(c).map((col) => col.deleteMany({})));
  await c.goal.insertOne(goal);
});

// ------------------------------------------------------------ helpers

const noEnrich = async () => null;
const noRetrieve = async () => ({ passages: [], degraded: true, reranked: false });
// Never call real providers: no planner, no enrichment, no retrieval, no briefing.
const base: IterationOptions = { enrich: noEnrich, plan: null, retrieve: noRetrieve, synthesize: null, heartbeatMs: 20 };

async function seedInput(key: string) {
  await c.inputs.insertOne({
    _id: key,
    key,
    name: key,
    meta: puzzleMeta,
    text: appleText,
    chars: appleText.length,
    scheduled: true,
    scheduledBy: "seed",
    createdAt: new Date(),
  });
}

async function seedTask(key: string, extra: Partial<Task> = {}): Promise<ObjectId> {
  const _id = new ObjectId();
  await c.tasks.insertOne({
    _id,
    key,
    criteria: ["c1", "c2", "c3"],
    version: goal.version,
    status: "open",
    priority: 0,
    attempt: 1,
    worker: null,
    heartbeat: null,
    proposal: null,
    gate: null,
    blockReason: null,
    hint: null,
    createdBy: "planner",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  });
  return _id;
}

function keyOf(options: LanguageModelV3CallOptions): string {
  const system = options.prompt.find((m) => m.role === "system");
  const m = typeof system?.content === "string" ? /^key: (\S+)$/m.exec(system.content) : null;
  if (!m) throw new Error("no task key in the system prompt");
  return m[1];
}

function toolCallResult(toolName: string, input: unknown): LanguageModelV3GenerateResult {
  return {
    content: [{ type: "tool-call", toolCallId: `call-${Math.random().toString(36).slice(2)}`, toolName, input: JSON.stringify(input) }],
    finishReason: { unified: "tool-calls", raw: "tool_calls" },
    usage: {
      inputTokens: { total: 1200, noCache: 1200, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 80, text: 80, reasoning: undefined },
    },
    warnings: [],
  };
}

function mockModel(decide: (options: LanguageModelV3CallOptions) => Promise<LanguageModelV3GenerateResult> | LanguageModelV3GenerateResult) {
  return new MockLanguageModelV3({ doGenerate: async (options) => decide(options) });
}

const submitModel = (patch: Record<string, unknown> = {}) =>
  mockModel((o) => toolCallResult("submit", { proposal: { ...appleSample.proposal, key: keyOf(o), ...patch } }));

// -------------------------------------------------------------- tests

describe("check input and state", () => {
  it("passes name, text and the meta bag, never the task's own merged state", () => {
    const input = {
      _id: "k",
      key: "k",
      name: "Unit K",
      meta: { ticker: "K", filedAt: "2026-07-30" },
      text: "t",
      chars: 1,
      scheduled: true,
      scheduledBy: "seed",
      createdAt: new Date(),
    };
    expect(checkInput(input)).toEqual({ key: "k", name: "Unit K", text: "t", meta: { ticker: "K", filedAt: "2026-07-30" } });
    expect(checkState({ key: "k" })).toEqual({ merged: {} });
    expect(checkState({ key: "k" }, { k: { old: true }, other: { x: 1 } })).toEqual({ merged: { other: { x: 1 } } });
  });
});

describe("worker iteration", () => {
  it("merges one task: state doc, merged task, one worker-run source with tokens", async () => {
    await seedInput("60c09cac");
    const taskId = await seedTask("60c09cac");

    const outcome = await iteration(c, "w-1", { ...base, model: submitModel() });
    expect(outcome).toBe("merged");

    const task = await c.tasks.findOne({ _id: taskId });
    expect(task?.status).toBe("merged");
    expect(task?.worker).toBeNull();
    expect(task?.gate?.pass).toBe(true);
    expect((task?.proposal as { rule: string }).rule).toBe(appleSample.proposal.rule);

    const state = await c.state.findOne({ _id: "60c09cac" });
    expect(state?.stateVersion).toBe(1);
    expect(state?.version).toBe(goal.version);
    expect(state?.taskId?.equals(taskId)).toBe(true);
    expect((state?.data as { program: string }).program).toBe(appleSample.proposal.program);

    const sources = await c.sources.find({}).toArray();
    expect(sources).toHaveLength(1);
    expect(sources[0].kind).toBe("worker-run");
    expect(sources[0].tokens.in).toBe(1200);
    expect(sources[0].tokens.out).toBe(80);
    expect(sources[0].tokens.cost).toBeGreaterThan(0);
    expect(sources[0].raw.proposal).toBeDefined();
    expect(sources[0].raw.gate).toMatchObject({ pass: true });
    expect(sources[0].text).toContain("outcome: submit");
    expect(sources[0].enrichment).toBeNull();
  });

  it("try_submit runs the gate on a draft and records nothing; the run still submits", async () => {
    await seedInput("60c09cac");
    const taskId = await seedTask("60c09cac");
    let calls = 0;
    const model = mockModel((o) => {
      calls += 1;
      const key = keyOf(o);
      if (calls === 1) return toolCallResult("try_submit", { proposal: { ...appleSample.proposal, key, program: "function transform(grid) { return grid; }" } });
      if (calls === 2) return toolCallResult("try_submit", { proposal: { ...appleSample.proposal, key } });
      return toolCallResult("submit", { proposal: { ...appleSample.proposal, key } });
    });

    expect(await iteration(c, "w-1", { ...base, model })).toBe("merged");
    expect(calls).toBe(3);
    const task = await c.tasks.findOne({ _id: taskId });
    expect(task?.status).toBe("merged");
    expect(task?.attempt).toBe(1);
    // Dry runs record no gate source and no outcome: only the run source exists.
    expect(await c.sources.countDocuments({ kind: "gate" })).toBe(0);
    const run = await c.sources.findOne({ kind: "worker-run" });
    const steps = run?.raw.steps as Array<{ toolCalls: Array<{ name: string }>; toolResults: Array<{ name: string; output: unknown }> }>;
    expect(steps.map((s) => s.toolCalls[0]?.name)).toEqual(["try_submit", "try_submit", "submit"]);
    const dry = steps.filter((s) => s.toolResults[0]?.name === "try_submit").map((s) => s.toolResults[0].output as { pass: boolean; reasons: string[] });
    expect(dry).toHaveLength(2);
    expect(dry[0].pass).toBe(false);
    expect(dry[0].reasons.join(" ")).toContain("pair 1: expected 6x6, got 3x3");
    expect(dry[1].pass).toBe(true);
  });

  it("two workers over ten tasks never hold the same task at once", async () => {
    const keys = Array.from({ length: 10 }, (_, i) => `unit-${i}`);
    for (const k of keys) {
      await seedInput(k);
      await seedTask(k);
    }
    const held = new Set<string>();
    let overlap = 0;
    let maxConcurrent = 0;
    const model = mockModel(async (o) => {
      const key = keyOf(o);
      if (held.has(key)) overlap += 1;
      held.add(key);
      maxConcurrent = Math.max(maxConcurrent, held.size);
      await sleep(50);
      held.delete(key);
      return toolCallResult("submit", { proposal: { ...appleSample.proposal, key } });
    });

    const worker = async (id: string) => {
      const outcomes: string[] = [];
      for (;;) {
        const o = await iteration(c, id, { ...base, model });
        if (o === "idle") return outcomes;
        outcomes.push(o);
      }
    };
    const [a, b] = await Promise.all([worker("w-a"), worker("w-b")]);

    expect(overlap).toBe(0);
    expect(maxConcurrent).toBe(2);
    expect(a.length + b.length).toBe(10);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    expect(await c.tasks.countDocuments({ status: "merged" })).toBe(10);
    expect(await c.tasks.countDocuments({ status: "claimed" })).toBe(0);
    expect(await c.state.countDocuments({})).toBe(10);
    expect(await c.sources.countDocuments({ kind: "worker-run" })).toBe(10);
    // Each task was merged by exactly the worker that wrote its source.
    for (const s of await c.sources.find({ kind: "worker-run" }).toArray()) {
      expect(["w-a", "w-b"]).toContain(s.raw.worker);
    }
  });

  it("a block call leaves a blocked task with the reason", async () => {
    await seedInput("60c09cac");
    const taskId = await seedTask("60c09cac");
    const model = mockModel(() => toolCallResult("block", { reason: "three hypotheses tried, no rule fits pair 3" }));

    expect(await iteration(c, "w-1", { ...base, model })).toBe("blocked");
    const task = await c.tasks.findOne({ _id: taskId });
    expect(task?.status).toBe("blocked");
    expect(task?.blockReason).toBe("three hypotheses tried, no rule fits pair 3");
    expect(task?.worker).toBeNull();
    expect(await c.state.countDocuments({})).toBe(0);
    const source = await c.sources.findOne({ kind: "worker-run" });
    expect(source?.raw.blockReason).toBe("three hypotheses tried, no rule fits pair 3");
  });

  it("a gate failure reopens with attempt + 1 until MAX_ATTEMPTS, then blocks with the reasons", async () => {
    await seedInput("60c09cac");
    const taskId = await seedTask("60c09cac");
    const model = submitModel({ program: "function transform(grid) { return grid; }" }); // wrong size on every pair

    expect(await iteration(c, "w-1", { ...base, model })).toBe("reopened");
    let task = await c.tasks.findOne({ _id: taskId });
    expect(task?.status).toBe("open");
    expect(task?.attempt).toBe(2);
    expect(task?.worker).toBeNull();
    expect(task?.gate?.pass).toBe(false);
    expect(task?.gate?.reasons.join(" ")).toContain("pair 1: expected 6x6, got 3x3");
    expect(await c.state.countDocuments({})).toBe(0);
    expect(await c.sources.countDocuments({ kind: "gate", "raw.gate.pass": false })).toBe(1);
    expect(await c.sources.countDocuments({ kind: "worker-run" })).toBe(1);

    // Attempts 2, 3 and 4 fail and reopen; the third failure does not block.
    for (let attempt = 2; attempt < MAX_ATTEMPTS; attempt++) {
      expect(await iteration(c, `w-${attempt}`, { ...base, model })).toBe("reopened");
      task = await c.tasks.findOne({ _id: taskId });
      expect(task?.status).toBe("open");
      expect(task?.attempt).toBe(attempt + 1);
    }

    // Attempt 5 (MAX_ATTEMPTS) fails and blocks.
    expect(await iteration(c, "w-last", { ...base, model })).toBe("blocked");
    task = await c.tasks.findOne({ _id: taskId });
    expect(task?.status).toBe("blocked");
    expect(task?.attempt).toBe(MAX_ATTEMPTS);
    expect(task?.blockReason).toContain("pair 1");
    expect(await c.sources.countDocuments({ kind: "gate" })).toBe(MAX_ATTEMPTS);
  });

  it("the next attempt sees the refuted rule of the failed proposal and the planner's hint", async () => {
    await seedInput("60c09cac");
    await seedTask("60c09cac");
    const failing = submitModel({ program: "function transform(grid) { return grid; }", rule: "The output is the input." });
    expect(await iteration(c, "w-1", { ...base, model: failing })).toBe("reopened");
    await c.tasks.updateOne({ key: "60c09cac" }, { $set: { hint: "read the table, not the prose" } });

    expect(await iteration(c, "w-2", { ...base, model: submitModel() })).toBe("merged");
    const runs = await c.sources.find({ kind: "worker-run" }).sort({ createdAt: 1 }).toArray();
    expect(runs).toHaveLength(2);
    expect(runs[0].raw.system).not.toContain("refuted:");
    expect(runs[1].raw.system).toContain("refuted: The output is the input.");
    expect(runs[1].raw.system).toContain("Hint from the planner: read the table, not the prose");
  });

  it("a run that never submits on the last attempt blocks with the run reason", async () => {
    await seedInput("60c09cac");
    const taskId = await seedTask("60c09cac", { attempt: MAX_ATTEMPTS });
    const model = mockModel(() => toolCallResult("read_input", { offset: 0 }));
    expect(await iteration(c, "w-1", { ...base, model, maxSteps: 2 })).toBe("blocked");
    const task = await c.tasks.findOne({ _id: taskId });
    expect(task?.status).toBe("blocked");
    expect(task?.blockReason).toBe("no submit or block within the step budget");
  });

  it("a run that never submits or blocks reopens the task", async () => {
    await seedInput("60c09cac");
    const taskId = await seedTask("60c09cac");
    const model = mockModel(() => toolCallResult("read_input", { offset: 0 }));

    expect(await iteration(c, "w-1", { ...base, model, maxSteps: 3 })).toBe("reopened");
    const task = await c.tasks.findOne({ _id: taskId });
    expect(task?.status).toBe("open");
    expect(task?.attempt).toBe(2);
    expect(task?.gate?.reasons).toEqual(["no submit or block within the step budget"]);
    const run = await c.sources.findOne({ kind: "worker-run" });
    expect((run?.raw.steps as unknown[]).length).toBe(3);
  });

  it("a lost state race reopens the task with the proposal as hint", async () => {
    await seedInput("60c09cac");
    const taskId = await seedTask("60c09cac");
    // Someone merges the key after the worker reads state and before it writes.
    const model = mockModel(async (o) => {
      await c.state.insertOne({
        _id: "60c09cac",
        key: "60c09cac",
        version: goal.version,
        stateVersion: 1,
        data: { other: true },
        taskId: new ObjectId(),
        mergedAt: new Date(),
      });
      return toolCallResult("submit", { proposal: { ...appleSample.proposal, key: keyOf(o) } });
    });

    expect(await iteration(c, "w-1", { ...base, model })).toBe("raced");
    const task = await c.tasks.findOne({ _id: taskId });
    expect(task?.status).toBe("open");
    expect(task?.attempt).toBe(1);
    expect(JSON.parse(task?.hint ?? "null")).toMatchObject({ key: "60c09cac", rule: appleSample.proposal.rule });
    const state = await c.state.findOne({ _id: "60c09cac" });
    expect(state?.data).toEqual({ other: true });
  });

  it("a throw puts the task back to open with attempt + 1 and an error source", async () => {
    await seedTask("missing-input");
    expect(await iteration(c, "w-1", { ...base, model: submitModel() })).toBe("error");
    const task = await c.tasks.findOne({ key: "missing-input" });
    expect(task?.status).toBe("open");
    expect(task?.attempt).toBe(2);
    expect(task?.worker).toBeNull();
    const err = await c.sources.findOne({ kind: "error" });
    expect(err?.text).toContain("no input for key missing-input");
  });

  it("puts the briefing and its cited records into the context and the run source", async () => {
    await seedInput("60c09cac");
    await seedTask("60c09cac");
    const hit = {
      id: "src-jpm",
      kind: "gate" as const,
      key: "jpm-2026-07-15",
      gist: "bank revenue",
      excerpt: "JPMorgan reports net revenue; the gate accepted it as revenue",
      score: 1,
      createdAt: new Date(),
    };
    const outcome = await iteration(c, "w-1", {
      ...base,
      model: submitModel(),
      retrieve: async () => ({ passages: [hit], degraded: false, reranked: true }),
      synthesize: async ({ hits }) => ({ text: "Banks report net revenue [src-jpm].", cited: hits, tokens: { in: 300, out: 40 } }),
    });
    expect(outcome).toBe("merged");
    const run = await c.sources.findOne({ kind: "worker-run" });
    expect(run?.raw.system).toContain("Banks report net revenue [src-jpm].");
    expect(run?.raw.system).toContain("JPMorgan reports net revenue");
    expect(run?.raw.briefing).toMatchObject({ cited: ["src-jpm"], tokens: { in: 300, out: 40 } });
    expect(run?.raw.reranked).toBe(true);
    expect(run?.tokens.in).toBe(1500);
    expect(run?.tokens.out).toBe(120);
  });

  it("idle when nothing is open", async () => {
    expect(await iteration(c, "w-1", base)).toBe("idle");
  });

  it("claim orders by priority then age, and heartbeat only touches its own claim", async () => {
    const old = await seedTask("k-old", { createdAt: new Date(Date.now() - 10_000) });
    const hot = await seedTask("k-hot", { priority: 1 });
    const first = await claim(c, "w-1");
    expect(first?._id.equals(hot)).toBe(true);
    const second = await claim(c, "w-2");
    expect(second?._id.equals(old)).toBe(true);
    expect(await claim(c, "w-3")).toBeNull();
    expect(await heartbeat(c, hot, "w-1")).toBe(true);
    expect(await heartbeat(c, hot, "w-2")).toBe(false);
    expect(await heartbeat(c, old, "w-1")).toBe(false);
  });
});

describe("source text", () => {
  it("carries the proposal's rule and program verbatim for the text index", () => {
    const proposal = { key: "k", rule: "Fill every enclosed region with the border color.", program: "function transform(grid) {\n  return grid;\n}" };
    expect(proposalLines(proposal)).toEqual([
      "rule: Fill every enclosed region with the border color.",
      "program:\nfunction transform(grid) {\n  return grid;\n}",
    ]);
    expect(proposalLines({ key: "k", revenue: 1 })).toEqual([]);
    expect(proposalLines(null)).toEqual([]);

    const text = flattenRun({ key: "k", outcome: { type: "submit", proposal }, gate: { pass: true, reasons: [], checks: {} }, steps: [], messages: [] });
    expect(text).toContain("rule: Fill every enclosed region with the border color.");
    expect(text).toContain("program:\nfunction transform(grid) {\n  return grid;\n}");
    expect(text).toContain("gate: pass");
  });

  it("the gate source text carries the refuted rule verbatim", async () => {
    await seedInput("60c09cac");
    await seedTask("60c09cac");
    const model = submitModel({ program: "function transform(grid) { return grid; }", rule: "The output is the input." });
    expect(await iteration(c, "w-1", { ...base, model })).toBe("reopened");
    const gate = await c.sources.findOne({ kind: "gate" });
    expect(gate?.text).toContain("rule: The output is the input.");
  });
});

describe("retrieve", () => {
  it("degrades to plain queries when $rankFusion is unavailable", async () => {
    const mk = (key: string, kind: "gate" | "worker-run", text: string, enriched: boolean) => ({
      _id: new ObjectId(),
      kind,
      taskId: new ObjectId(),
      key,
      version: 1,
      raw: {},
      text,
      enrichment: enriched ? { gist: `gist for ${key}`, entities: { keys: [key], fields: [] }, labels: [], embedding: [0.1] } : null,
      tokens: { in: 0, out: 0, cost: 0 },
      createdAt: new Date(),
    });
    await c.sources.insertMany([
      mk("jpm-2026-07-15", "gate", "revenue quote missing: banks report net revenue", true),
      mk("nvda-2026-08-27", "worker-run", "fiscal year runs ahead of the calendar", true),
      mk("60c09cac", "worker-run", "own key, must be excluded", true),
      mk("meta-2026-07-29", "worker-run", "no enrichment but mentions revenue", false),
    ]);
    const r = await retrieve(c, "Every value is backed by a verbatim quote containing revenue", {
      excludeKey: "60c09cac",
      embed: async () => [0.1],
    });
    expect(r.degraded).toBe(true);
    const keys = r.passages.map((p) => p.key);
    expect(keys).not.toContain("60c09cac");
    expect(keys).toContain("jpm-2026-07-15");
    expect(keys).toContain("nvda-2026-08-27");
    expect(keys).toContain("meta-2026-07-29"); // by the text regex
    expect(new Set(keys).size).toBe(keys.length);
    expect(r.passages[0].gist).toBeTruthy();
  });
});
