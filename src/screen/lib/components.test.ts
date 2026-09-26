// The pure parts behind the components: tones, curve points, formatters.

import { describe, expect, it } from "vitest";
import { curvePoints } from "./curve.ts";
import { compact, duration, estimateTokens, hhmm, oneLine, pct } from "./format.ts";
import { outcomeTone, statusTone } from "./status.ts";

describe("statusTone", () => {
  it("maps the brief's statuses to tones", () => {
    expect(statusTone("solved")).toBe("solved");
    expect(statusTone("merged")).toBe("merged");
    expect(statusTone("claimed")).toBe("working");
    expect(statusTone("blocked")).toBe("blocked");
    expect(statusTone("parked")).toBe("parked");
    expect(statusTone("open")).toBe("open");
  });
  it("is amber for a reopened or retried open unit", () => {
    expect(statusTone("open", 2, null)).toBe("retrying");
    expect(statusTone("open", 1, "passed the examples, wrong on the test")).toBe("retrying");
    expect(statusTone("open", 1, null)).toBe("open");
  });
  it("colors feed outcomes", () => {
    expect(outcomeTone("pass")).toBe("merged");
    expect(outcomeTone("requeued")).toBe("retrying");
    expect(outcomeTone("blocked")).toBe("blocked");
    expect(outcomeTone("whatever")).toBeNull();
  });
});

describe("curvePoints", () => {
  it("turns cumulative buckets into rates and per-bucket deltas, sorted by time", () => {
    const pts = curvePoints([
      { bucket: "2026-09-26T13:00:00.000Z", attempted: 40, merged: 10, solved: 6 },
      { bucket: "2026-09-26T12:45:00.000Z", attempted: 20, merged: 4, solved: 2 },
      { bucket: "2026-09-26T12:30:00.000Z", attempted: 0, merged: 0, solved: 0 },
    ]);
    expect(pts.map((p) => p.at.slice(11, 16))).toEqual(["12:30", "12:45", "13:00"]);
    expect(pts.map((p) => p.rate)).toEqual([null, 0.1, 0.15]);
    expect(pts.map((p) => p.solvedDelta)).toEqual([0, 2, 4]);
  });
});

describe("format", () => {
  it("formats numbers, rates and durations", () => {
    expect(compact(1234)).toBe("1.2k");
    expect(compact(210_000_000)).toBe("210.0M");
    expect(compact(null)).toBe("-");
    expect(pct(0.1234, 1)).toBe("12.3%");
    expect(duration(42)).toBe("42s");
    expect(duration(185)).toBe("3m 05s");
    expect(duration(3720)).toBe("1h 02m");
    expect(estimateTokens("x".repeat(400))).toBe(100);
    expect(oneLine({ a: "b   c" }, 5)).toBe('{"a":…');
    expect(hhmm("not a date")).toBe("--:--");
  });
});
