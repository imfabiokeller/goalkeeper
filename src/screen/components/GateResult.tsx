// The gate verdict: one line per check with pass/fail and its reasons,
// plus the overall verdict. `labels` maps check kinds to the goal's short
// criterion labels (reproduces, general, schema) when the page has them.

import type { UnitTask } from "../lib/types.ts";

export type GateResultProps = {
  gate: UnitTask["gate"];
  labels?: Record<string, string>; // check kind -> label
  blockReason?: string | null; // shown instead of the checks when the worker blocked
  solved?: boolean | null; // the hidden test verdict, when known
};

export function GateResult({ gate, labels = {}, blockReason = null, solved = null }: GateResultProps) {
  if (!gate && blockReason) {
    return (
      <div className="gate-result" data-pass="blocked" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
        <span style={{ color: "var(--status-blocked)" }}>blocked</span> <span style={{ fontFamily: "var(--sans)" }}>{blockReason}</span>
      </div>
    );
  }
  if (!gate) {
    return (
      <div className="gate-result" data-pass="none" style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-dim)" }}>
        no gate result yet
      </div>
    );
  }
  const checks = Object.entries(gate.checks ?? {});
  return (
    <div className="gate-result" data-pass={gate.pass} style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "var(--mono)", fontSize: 12 }}>
      <div>
        <span style={{ color: gate.pass ? "var(--status-merged)" : "var(--status-retrying)", fontWeight: 600 }}>{gate.pass ? "gate: pass" : "gate: fail"}</span>
        {solved !== null ? (
          <span style={{ marginLeft: 12, color: solved ? "var(--status-solved)" : "var(--fg-dim)" }}>{solved ? "hidden test: solved" : "hidden test: not solved"}</span>
        ) : null}
      </div>
      {checks.map(([kind, c]) => (
        <div key={kind} style={{ display: "grid", gridTemplateColumns: "9em 3em 1fr", gap: 8 }}>
          <span title={kind}>{labels[kind] ?? kind}</span>
          <span style={{ color: c.pass ? "var(--status-merged)" : "var(--status-blocked)" }}>{c.pass ? "pass" : "fail"}</span>
          <span style={{ fontFamily: "var(--sans)", color: c.pass ? "var(--fg-dim)" : "var(--fg)" }}>{c.reasons.join("; ")}</span>
        </div>
      ))}
      {!checks.length && gate.reasons.length ? <div style={{ fontFamily: "var(--sans)" }}>{gate.reasons.join("; ")}</div> : null}
    </div>
  );
}
