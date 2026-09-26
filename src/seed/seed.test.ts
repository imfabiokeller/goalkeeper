// Seed tests that need no database: the goal conversion and the live input
// loader against the real usecase folder.

import { access } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { goalFromLens } from "../shared/goal.ts";
import { Goal, Input } from "../shared/types.ts";
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
    expect(goal.criteria.map((c) => c.check.kind)).toEqual(["reproduces", "general", "schema"]);
    for (const c of goal.criteria) {
      expect(c.kind).toBe("all-units");
      expect(c.check.params).toEqual({});
    }
    expect(goal.guidelines.length).toBe(5);
    expect(goal.outOfScope.length).toBe(4);
    expect(goal.proposalShape).toContain('"program"');
    expect(goal.history).toHaveLength(1);
    expect(goal.history[0]).toMatchObject({ version: 1, by: "seed", diff: null });
  });
});

describe("live input loader", () => {
  it("reads inputs.json and finds every referenced file", async () => {
    const index = await readIndex();
    expect(index.length).toBe(400);
    for (const e of index) await expect(access(join(USECASE_DIR, e.file))).resolves.toBeUndefined();
    const keys = new Set(index.map((e) => e.key));
    expect(keys.size).toBe(index.length);
    // every puzzle carries its example pairs and test inputs, never a test output
    for (const e of index) {
      expect(/^[0-9a-f]{8}$/.test(e.key)).toBe(true);
      expect(Array.isArray(e.train) && (e.train as unknown[]).length > 0).toBe(true);
      const test = e.test as Record<string, unknown>[];
      expect(test.length).toBeGreaterThan(0);
      for (const t of test) expect(Object.keys(t)).toEqual(["input"]);
    }
  });

  it("produces Input documents with the first 300 scheduled", async () => {
    const inputs = await loadInputs(USECASE_DIR, NOW);
    const index = await readIndex();
    expect(inputs).toHaveLength(index.length);
    for (const [i, doc] of inputs.entries()) {
      expect(Input.parse(doc)).toEqual(doc);
      expect(doc._id).toBe(doc.key);
      expect(doc.key).toBe(index[i]!.key);
      expect(doc.chars).toBe(doc.text.length);
      expect(doc.text.length).toBeGreaterThan(100);
      expect(doc.text.startsWith("Example 1 input (")).toBe(true);
      expect(doc.text).toMatch(/Test (\d+ )?input \(/);
      expect(doc.scheduled).toBe(i < SCHEDULED_COUNT);
      expect(doc.scheduledBy).toBe(i < SCHEDULED_COUNT ? "seed" : null);
      expect(doc.createdAt).toEqual(NOW);
      // the harness names the unit; every other index field lands in meta untouched
      const { key: _key, name: _name, file: _file, source: _source, chars: _chars, ...rest } = index[i]!;
      expect(doc.name).toBe(entryName(index[i]!));
      expect(doc.meta).toEqual(rest);
      expect(Object.keys(doc.meta)).toEqual(["train", "test"]);
    }
    expect(inputs.filter((d) => d.scheduled)).toHaveLength(SCHEDULED_COUNT);
  }, 60_000);
});
