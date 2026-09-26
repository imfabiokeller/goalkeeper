// The pure parts of the screen data layer: status derivation, feed lines,
// precedent id extraction and the wire trim. The route handlers themselves
// are checked against the live database through /dev.

import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import type { ProgressEntry } from "../../shared/types.ts";
import { deadLines, lastSubmitRule, progressLines, PROGRESS_LAST, taskOutcome, unitStatus, workerRows } from "./stage.ts";
import { citedIds } from "./unit.ts";
import { trimRaw } from "./trim.ts";

const now = new Date("2026-09-26T15:00:00.000Z");
const ago = (s: number) => new Date(now.getTime() - s * 1000);
const entry = (step: number, tool: string, over: Partial<ProgressEntry> = {}): ProgressEntry => ({ at: ago(60 - step), step, tool, ...over });

describe("workerRows", () => {
  const claimed = (over: Partial<Parameters<typeof workerRows>[0][number]> = {}) => ({
    _id: new ObjectId("0123456789abcdef01234567"),
    key: "k1",
    worker: "w-03",
    heartbeat: ago(5),
    attempt: 1,
    step: 4,
    progress: [entry(1, "read_input"), entry(2, "try_submit", { ok: false, reasons: ["pair 1: wrong"], rule: "flip it" })],
    ...over,
  });
  const dead = (over: Partial<Parameters<typeof workerRows>[1][number]> = {}) => ({
    _id: new ObjectId("89abcdef0123456789abcdef"),
    key: "k2",
    attempt: 3,
    lastWorker: "w-07",
    diedAt: ago(10),
    step: 7,
    progress: [entry(7, "try_submit", { ok: false, reasons: ["r"], rule: "shift" }), entry(7, "reaper")],
    ...over,
  });

  it("carries step and the progress lines on a live row", () => {
    const [row] = workerRows([claimed()], [], now);
    expect(row).toMatchObject({ worker: "w-03", key: "k1", step: 4, heartbeatAge: 5, alive: true, diedAt: null });
    expect(row!.progress).toEqual([
      { at: ago(59).toISOString(), step: 1, tool: "read_input", ok: null, reasons: [], rule: null },
      { at: ago(58).toISOString(), step: 2, tool: "try_submit", ok: false, reasons: ["pair 1: wrong"], rule: "flip it" },
    ]);
  });

  it("marks a silent row dead after 30 s and drops it after 90 s", () => {
    expect(workerRows([claimed({ heartbeat: ago(45) })], [], now)[0]!.alive).toBe(false);
    expect(workerRows([claimed({ heartbeat: ago(120) })], [], now)).toEqual([]);
  });

  it("holds a dead row for 30 s from diedAt under lastWorker, then drops it", () => {
    const rows = workerRows([], [dead()], now);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ worker: "w-07", key: "k2", attempt: 2, step: 7, alive: false, heartbeatAge: 10, diedAt: ago(10).toISOString() });
    expect(rows[0]!.progress.at(-1)).toMatchObject({ tool: "reaper", step: 7 });
    expect(workerRows([], [dead({ diedAt: ago(31) })], now)).toEqual([]);
    expect(workerRows([], [dead({ lastWorker: null })], now)).toEqual([]);
  });

  it("keeps the dead row next to the live row that picked the task up", () => {
    const rows = workerRows([claimed({ key: "k2", worker: "w-11" })], [dead()], now);
    expect(rows.map((r) => [r.worker, r.alive])).toEqual([
      ["w-07", false],
      ["w-11", true],
    ]);
  });
});

describe("deadLines", () => {
  it("emits a requeued line at diedAt for the worker that died, within the window only", () => {
    const t = { _id: new ObjectId("89abcdef0123456789abcdef"), key: "k2", attempt: 2, lastWorker: "w-07", diedAt: ago(3), step: 1, progress: [] };
    expect(deadLines([t], now)).toEqual([
      { at: ago(3).toISOString(), kind: "task", key: "k2", outcome: "requeued", reason: null, taskId: t._id.toHexString(), worker: "w-07", id: t._id.toHexString() },
    ]);
    expect(deadLines([{ ...t, diedAt: ago(40) }], now)).toEqual([]);
  });
});

describe("progressLines", () => {
  const entries = Array.from({ length: 12 }, (_, i) => entry(i + 1, i % 2 ? "try_submit" : "text", i % 2 ? { rule: `rule ${i + 1}` } : {}));
  it("keeps only the last n entries, oldest first", () => {
    const last = progressLines(entries, PROGRESS_LAST);
    expect(last).toHaveLength(PROGRESS_LAST);
    expect(last.map((l) => l.step)).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
    expect(progressLines(entries)).toHaveLength(12);
    expect(progressLines(undefined)).toEqual([]);
  });
  it("finds the last submit rule", () => {
    expect(lastSubmitRule(entries)).toBe("rule 12");
    expect(lastSubmitRule([entry(1, "text", { rule: "not a submit" })])).toBeNull();
    expect(lastSubmitRule(undefined)).toBeNull();
  });
});

describe("unitStatus", () => {
  const latest = (status: "open" | "claimed" | "blocked") =>
    ({ _id: "k", status, attempt: 2, hint: null, blockReason: null, updatedAt: new Date(), reasons: [] }) as never;
  it("is solved on score 1, merged on any other state", () => {
    expect(unitStatus(1, true, latest("open"))).toBe("solved");
    expect(unitStatus(0, true, latest("open"))).toBe("merged");
    expect(unitStatus(null, true, undefined)).toBe("merged");
  });
  it("follows the latest task without state, open with no task", () => {
    expect(unitStatus(null, false, latest("claimed"))).toBe("claimed");
    expect(unitStatus(null, false, latest("blocked"))).toBe("blocked");
    expect(unitStatus(null, false, undefined)).toBe("open");
  });
});

describe("taskOutcome", () => {
  const t = (over: Partial<Parameters<typeof taskOutcome>[0]>) => taskOutcome({ status: "open", attempt: 1, hint: null, gate: null, worker: null, ...over });
  it("names the planner's reopen kinds from the hint", () => {
    expect(t({ hint: "passed the examples, wrong on the test" })).toBe("too specific");
    expect(t({ hint: "blocked earlier with: x; the library has grown since" })).toBe("reopened");
  });
  it("tells a gate retry from a reaper requeue", () => {
    expect(t({ attempt: 2, gate: { pass: false, reasons: ["r"] } })).toBe("retrying");
    expect(t({ attempt: 2 })).toBe("requeued");
    expect(t({ attempt: 1 })).toBe("open");
    expect(t({ status: "merged" })).toBe("merged");
  });
});

describe("citedIds", () => {
  const a = "0123456789abcdef01234567";
  const b = "89abcdef0123456789abcdef";
  it("prefers the briefing's cited list", () => {
    expect(citedIds([a, "nope"], "# Library records\n[" + b + "] gate on k")).toEqual([a]);
  });
  it("falls back to the record heads of the library section", () => {
    const system = `# Goal\nx\n\n# Library records (precedents)\n[${a}] worker-run on k1\ngist: g\n\n[${b}] gate on k2\n\n# Input text\n[${a}] not a record`;
    expect(citedIds(null, system)).toEqual([a, b]);
    expect(citedIds([], "# Goal\nnothing")).toEqual([]);
  });
});

describe("trimRaw", () => {
  it("leaves small records alone and clips strings of large ones", () => {
    const small = { a: "x".repeat(100), b: [1, 2] };
    expect(trimRaw(small, 1000)).toEqual({ raw: small, truncated: false });
    const big = { messages: [{ content: "y".repeat(50_000) }], n: 1 };
    const r = trimRaw(big, 20_000);
    expect(r.truncated).toBe(true);
    expect(r.raw.n).toBe(1);
    expect(r.raw.messages[0]!.content.length).toBeLessThan(20_000);
    expect(Buffer.byteLength(JSON.stringify(r.raw))).toBeLessThanOrEqual(20_000);
  });
});
