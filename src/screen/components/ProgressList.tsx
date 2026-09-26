// Live progress of an attempt: one line per tool step with the gate
// verdict on try_submit and submit, the draft rule and the first reasons.

import { hhmmss } from "../lib/format.ts";
import type { ProgressLine } from "../lib/types.ts";

export type ProgressListProps = {
  lines: ProgressLine[];
  showTime?: boolean; // default true
  maxReasons?: number; // per line, default 2
};

export function ProgressList({ lines, showTime = true, maxReasons = 2 }: ProgressListProps) {
  if (!lines.length) return <div style={{ color: "var(--fg-dim)", fontFamily: "var(--mono)", fontSize: 12 }}>no progress yet</div>;
  return (
    <ol className="progress-list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2, fontFamily: "var(--mono)", fontSize: 12 }}>
      {lines.map((l, i) => (
        <li key={`${l.step}-${i}`} data-tool={l.tool} data-ok={l.ok} style={{ display: "grid", gridTemplateColumns: showTime ? "5.5em 2.5em 8em 3em 1fr" : "2.5em 8em 3em 1fr", gap: 8 }}>
          {showTime ? <span style={{ color: "var(--fg-dim)" }}>{hhmmss(l.at)}</span> : null}
          <span style={{ color: "var(--fg-dim)" }}>{l.step}</span>
          <span>{l.tool}</span>
          <span style={{ color: l.ok === null ? "var(--fg-dim)" : l.ok ? "var(--status-merged)" : "var(--status-retrying)" }}>{l.ok === null ? "" : l.ok ? "ok" : "fail"}</span>
          <span style={{ fontFamily: "var(--sans)", minWidth: 0 }}>
            {l.rule ? <span>{l.rule}</span> : null}
            {l.reasons.length ? <span style={{ color: "var(--fg-dim)" }}>{l.rule ? " : " : ""}{l.reasons.slice(0, maxReasons).join("; ")}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
