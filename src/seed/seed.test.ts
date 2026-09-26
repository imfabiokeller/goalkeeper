// Seed tests that need no database: the goal conversion, the live input
// loader against the real usecase folder, and the dev fakes against the
// Zod schemas.

import { access } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { goalFromLens } from "../shared/goal.ts";
import { Goal, Input, Lock, Metrics, Question, Source, SourceKind, State, Task, TaskStatus } from "../shared/types.ts";
import { makeDevData, WORKERS } from "./fakes.ts";
import { entryMeta, entryName, loadInputs, readIndex, readLens, SCHEDULED_COUNT, USECASE_DIR } from "./inputs.ts";

const NOW = new Date("2026-09-26T15:00:00Z");

describe("goal conversion", () => {
  it("turns usecase/lens.json into a version 1 goal that validates", async () => {
    const goal = goalFromLens(await readLens());
    expect(Goal.parse(goal)).toEqual(goal);
    expect(goal._id).toBe("goal");
    expect(goal.version).toBe(1);
    expect(goal.statement.length).toBeGreaterThan(20);
    expect(goal.criteria.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(goal.criteria.map((c) => c.check.kind)).toEqual(["grounded", "consistent", "schema"]);
    for (const c of goal.criteria) {
      expect(c.kind).toBe("all-units");
      expect(c.check.params).toEqual({});
    }
    expect(goal.guidelines.length).toBe(5);
    expect(goal.outOfScope.length).toBe(6);
    expect(goal.history).toHaveLength(1);
    expect(goal.history[0]).toMatchObject({ version: 1, by: "seed", diff: null });
  });
});

describe("live input loader", () => {
  it("reads inputs.json and finds every referenced file", async () => {
    const index = await readIndex();
    expect(index.length).toBeGreaterThanOrEqual(100);
    for (const e of index) await expect(access(join(USECASE_DIR, e.file))).resolves.toBeUndefined();
    const keys = new Set(index.map((e) => e.key));
    expect(keys.size).toBe(index.length);
  });

  it("produces Input documents with the first 200 scheduled", async () => {
    const inputs = await loadInputs(USECASE_DIR, NOW);
    const index = await readIndex();
    expect(inputs).toHaveLength(index.length);
    for (const [i, doc] of inputs.entries()) {
      expect(Input.parse(doc)).toEqual(doc);
      expect(doc._id).toBe(doc.key);
      expect(doc.key).toBe(index[i]!.key);
      expect(doc.chars).toBe(doc.text.length);
      expect(doc.text.length).toBeGreaterThan(1000);
      expect(doc.scheduled).toBe(i < SCHEDULED_COUNT);
      expect(doc.scheduledBy).toBe(i < SCHEDULED_COUNT ? "seed" : null);
      expect(doc.createdAt).toEqual(NOW);
      // the harness names the unit; every other index field lands in meta untouched
      const { key: _key, file: _file, source: _source, chars: _chars, ...rest } = index[i]!;
      expect(doc.name).toBe(entryName(index[i]!));
      expect(doc.meta).toEqual(rest);
      expect(doc).not.toHaveProperty("company");
    }
    expect(inputs.filter((d) => d.scheduled)).toHaveLength(SCHEDULED_COUNT);
  }, 60_000);
});

describe("dev fakes", () => {
  // The generators only need the metadata, so the tests use short texts
  // instead of reading 395 press releases.
  async function smallInputs() {
    const index = await readIndex();
    return index.map((e, i) =>
      Input.parse({
        _id: e.key,
        key: e.key,
        name: entryName(e),
        meta: entryMeta(e),
        source: e.source,
        text: `${entryName(e)} reports quarterly results.`,
        chars: 40,
        scheduled: i < SCHEDULED_COUNT,
        scheduledBy: i < SCHEDULED_COUNT ? "seed" : null,
        createdAt: NOW,
      }),
    );
  }

  it("produces documents that pass every schema", async () => {
    const data = makeDevData(await smallInputs(), await readLens(), NOW);
    expect(Goal.parse(data.goal)).toEqual(data.goal);
    for (const d of data.inputs) expect(Input.parse(d)).toEqual(d);
    for (const d of data.tasks) expect(Task.parse(d)).toEqual(d);
    for (const d of data.state) expect(State.parse(d)).toEqual(d);
    for (const d of data.sources) expect(Source.parse(d)).toEqual(d);
    for (const d of data.questions) expect(Question.parse(d)).toEqual(d);
    for (const d of data.locks) expect(Lock.parse(d)).toEqual(d);
    expect(Metrics.parse(data.metrics)).toEqual(data.metrics);
  }, 60_000);

  it("covers what the screen needs", async () => {
    const data = makeDevData(await smallInputs(), await readLens(), NOW);

    // goal at version 2 with an approved add-guideline diff in history
    expect(data.goal.version).toBe(2);
    expect(data.goal.history).toHaveLength(2);
    expect(data.goal.history[1]!.diff).toEqual({ op: "add-guideline", text: data.goal.guidelines.at(-1) });
    expect(data.goal.history[1]!.questionId).toEqual(data.questions[0]!._id);

    // about 500 tasks across every status, attempts 1 to 3, last 90 minutes
    expect(data.tasks.length).toBeGreaterThan(400);
    expect(data.tasks.length).toBeLessThan(600);
    for (const status of TaskStatus.options) expect(data.tasks.some((t) => t.status === status)).toBe(true);
    for (const t of data.tasks) {
      expect(t.attempt).toBeGreaterThanOrEqual(1);
      expect(t.attempt).toBeLessThanOrEqual(3);
      expect(t.createdAt.getTime()).toBeGreaterThanOrEqual(NOW.getTime() - 90 * 60_000);
      expect(t.updatedAt.getTime()).toBeLessThanOrEqual(NOW.getTime() + 1000);
    }
    for (const attempt of [1, 2, 3]) expect(data.tasks.some((t) => t.attempt === attempt)).toBe(true);

    // claimed tasks: fresh heartbeats, every worker holds one
    const claimed = data.tasks.filter((t) => t.status === "claimed");
    expect(new Set(claimed.map((t) => t.worker))).toEqual(new Set(WORKERS));
    for (const t of claimed) expect(NOW.getTime() - t.heartbeat!.getTime()).toBeLessThan(30_000);

    // merged with proposal and passing gate, blocked with a reason
    const merged = data.tasks.filter((t) => t.status === "merged");
    for (const t of merged) {
      expect(t.proposal).not.toBeNull();
      expect(t.gate?.pass).toBe(true);
    }
    for (const t of data.tasks.filter((t) => t.status === "blocked")) expect(t.blockReason?.length).toBeGreaterThan(20);
    for (const t of data.tasks.filter((t) => t.status === "parked")) expect(t.blockReason?.length).toBeGreaterThan(20);
    expect(data.tasks.some((t) => t.hint !== null)).toBe(true);
    expect(data.tasks.some((t) => t.createdBy.startsWith("crowd:"))).toBe(true);

    // state for every merged key, pointing at a merged task
    const mergedKeys = new Set(merged.map((t) => t.key));
    expect(new Set(data.state.map((s) => s.key))).toEqual(mergedKeys);
    const taskIds = new Set(data.tasks.map((t) => t._id.toHexString()));
    for (const s of data.state) expect(taskIds.has(s.taskId.toHexString())).toBe(true);

    // sources of every kind, worker runs with messages and steps, enrichment with 1024 dims
    for (const kind of SourceKind.options) expect(data.sources.some((s) => s.kind === kind)).toBe(true);
    for (const s of data.sources.filter((s) => s.kind === "worker-run")) {
      expect(Array.isArray(s.raw.messages)).toBe(true);
      expect(Array.isArray(s.raw.steps)).toBe(true);
    }
    const enriched = data.sources.filter((s) => s.enrichment);
    expect(enriched.length).toBeGreaterThan(data.sources.length / 2);
    for (const s of enriched) {
      expect(s.enrichment!.embedding).toHaveLength(1024);
      expect(s.enrichment!.gist.length).toBeGreaterThan(5);
    }
    const crowd = data.sources.filter((s) => s.kind === "crowd-request");
    expect(crowd.some((s) => s.handled === false)).toBe(true);
    expect(new Set(crowd.filter((s) => s.handled).map((s) => s.outcome))).toEqual(new Set(["task", "recheck", "proposal", "parked"]));
    for (const s of data.sources) expect(s.createdAt.getTime()).toBeLessThanOrEqual(NOW.getTime() + 1000);

    // three questions, one per status
    expect(data.questions.map((q) => q.status).sort()).toEqual(["approved", "open", "rejected"]);

    // lock and metrics
    expect(data.locks[0]!._id).toBe("planner");
    expect(data.metrics.perMinute).toHaveLength(90);
    expect(data.metrics.versions.map((v) => v.version)).toEqual([1, 2]);
    expect(Object.keys(data.metrics.perCriterion)).toEqual(["c1", "c2", "c3"]);
    expect(data.metrics.totals.librarySources).toBe(data.sources.length);
    expect(data.metrics.totals.merged).toBe(merged.length);
  }, 60_000);

  it("is deterministic", async () => {
    const inputs = await smallInputs();
    const lens = await readLens();
    const a = makeDevData(inputs, lens, NOW);
    const b = makeDevData(inputs, lens, NOW);
    expect(a.tasks.map((t) => t._id.toHexString())).toEqual(b.tasks.map((t) => t._id.toHexString()));
    expect(a.sources.map((s) => s._id.toHexString())).toEqual(b.sources.map((s) => s._id.toHexString()));
    expect(a.metrics).toEqual(b.metrics);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  }, 60_000);
});
