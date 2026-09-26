// The pure parts of the screen data layer: status derivation, feed lines,
// precedent id extraction and the wire trim. The route handlers themselves
// are checked against the live database through /dev.

import { describe, expect, it } from "vitest";
import { taskOutcome, unitStatus } from "./stage.ts";
import { citedIds } from "./unit.ts";
import { trimRaw } from "./trim.ts";

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
