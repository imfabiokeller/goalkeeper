// One live feed line: time, kind/outcome colored by outcome, key, worker,
// reason. Links the key to the puzzle and the outcome to the task.

import Link from "next/link";
import { hhmmss } from "../lib/format.ts";
import { outcomeTone, TONE_VAR } from "../lib/status.ts";
import type { FeedLine as FeedLineT } from "../lib/types.ts";

export type FeedLineProps = {
  line: FeedLineT;
  showKind?: boolean; // default false: the outcome alone reads better
};

export function FeedLine({ line, showKind = false }: FeedLineProps) {
  const tone = outcomeTone(line.outcome);
  return (
    <div
      className="feed-line"
      data-outcome={line.outcome}
      style={{ display: "grid", gridTemplateColumns: "5.5em 7em 6em 7em 1fr", gap: 8, fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.4, alignItems: "baseline" }}
    >
      <span style={{ color: "var(--fg-dim)" }}>{hhmmss(line.at)}</span>
      <span style={{ color: tone ? TONE_VAR[tone] : "var(--fg)" }}>
        {line.taskId ? <Link href={`/task/${line.taskId}`}>{line.outcome}</Link> : line.outcome}
        {showKind ? <span style={{ color: "var(--fg-dim)" }}> {line.kind}</span> : null}
      </span>
      <span>{line.key ? <Link href={`/unit/${line.key}`}>{line.key}</Link> : "-"}</span>
      <span style={{ color: "var(--fg-dim)" }}>{line.worker ?? ""}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--sans)" }} title={line.reason ?? undefined}>
        {line.reason ?? ""}
      </span>
    </div>
  );
}
