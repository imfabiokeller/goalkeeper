// One worker: id, puzzle key, step n/max as a bar, heartbeat age, an alive
// dot, and the last progress line as text. A row with diedAt is dark red.

import Link from "next/link";
import { TONE_VAR } from "../lib/status.ts";
import type { ProgressLine, StageWorker } from "../lib/types.ts";

export type WorkerRowProps = {
  row: StageWorker;
  maxSteps?: number; // default 20
  showProgress?: boolean; // default true
};

export function progressText(line: ProgressLine | undefined): string {
  if (!line) return "";
  const verdict = line.ok === null ? "" : line.ok ? " ok" : " fail";
  const rule = line.rule ? ` "${line.rule}"` : "";
  const reason = line.reasons[0] ? ` (${line.reasons[0]})` : "";
  return `${line.tool}${verdict}${rule}${reason}`;
}

export function WorkerRow({ row, maxSteps = 20, showProgress = true }: WorkerRowProps) {
  const dead = row.diedAt !== null;
  const tone = dead ? "dead" : row.alive ? "working" : "retrying";
  const step = row.step ?? 0;
  const fraction = Math.max(0, Math.min(1, step / maxSteps));
  const last = row.progress.at(-1);
  return (
    <div
      className={`worker-row${dead ? " dead" : ""}`}
      data-worker={row.worker}
      data-alive={row.alive}
      style={{
        display: "grid",
        gridTemplateColumns: "10px 4.5em 6em 1fr 4em",
        gap: 8,
        alignItems: "center",
        padding: "2px 4px",
        background: dead ? TONE_VAR.dead : "transparent",
        color: dead ? "var(--fg)" : row.alive ? "var(--fg)" : "var(--fg-dim)",
        fontFamily: "var(--mono)",
        fontSize: 12,
        lineHeight: 1.3,
      }}
      title={last ? progressText(last) : undefined}
    >
      <span aria-label={dead ? "dead" : row.alive ? "alive" : "stale"} style={{ width: 8, height: 8, borderRadius: 4, background: dead ? "var(--status-blocked)" : TONE_VAR[tone] }} />
      <span>{row.worker}</span>
      <Link href={`/unit/${row.key}`}>{row.key}</Link>
      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span style={{ flex: "0 0 60px", height: 6, background: "var(--line)", borderRadius: 1, overflow: "hidden" }}>
          <span style={{ display: "block", width: `${fraction * 100}%`, height: "100%", background: dead ? "var(--status-blocked)" : "var(--status-working)" }} />
        </span>
        <span style={{ color: "var(--fg-dim)" }}>
          {step}/{maxSteps}
        </span>
        {showProgress ? <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--fg-dim)" }}>{progressText(last)}</span> : null}
      </span>
      <span style={{ textAlign: "right", color: dead ? "var(--fg)" : "var(--fg-dim)" }}>{dead ? `died ${row.heartbeatAge}s` : `${row.heartbeatAge}s`}</span>
    </div>
  );
}
