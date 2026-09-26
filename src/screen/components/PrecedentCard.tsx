// A library entry retrieved into a worker's context: kind, key, gist,
// score, with links to the puzzle and to the library entry itself.

import Link from "next/link";
import type { Precedent } from "../lib/types.ts";

export type PrecedentCardProps = {
  precedent: Precedent;
  compact?: boolean; // one line instead of a card
};

export function precedentHref(p: Precedent): string {
  return `/library/${p.id}`;
}

export function PrecedentCard({ precedent: p, compact = false }: PrecedentCardProps) {
  return (
    <div
      className="precedent-card"
      data-kind={p.kind}
      style={{
        display: "flex",
        flexDirection: compact ? "row" : "column",
        gap: compact ? 8 : 4,
        padding: compact ? 0 : 8,
        border: compact ? "none" : "1px solid var(--line)",
        borderRadius: 2,
        background: compact ? "transparent" : "var(--bg-raised)",
        fontSize: 12,
        minWidth: 0,
      }}
    >
      <span style={{ fontFamily: "var(--mono)", display: "flex", gap: 8, color: "var(--fg-dim)", whiteSpace: "nowrap" }}>
        <span>{p.kind}</span>
        {p.key ? <Link href={`/unit/${p.key}`}>{p.key}</Link> : null}
        {p.score !== null ? <span>score {p.score.toFixed(2)}</span> : null}
        <Link href={precedentHref(p)} title="the library entry">
          entry
        </Link>
      </span>
      <span style={{ fontFamily: "var(--sans)", overflow: compact ? "hidden" : undefined, textOverflow: compact ? "ellipsis" : undefined, whiteSpace: compact ? "nowrap" : undefined }}>
        {p.gist ?? <span style={{ color: "var(--fg-dim)" }}>no gist</span>}
      </span>
    </div>
  );
}
