// The hero KPI: solve rate per 15-minute bucket as the library grows,
// with the control run's rate as a dashed line. The claim on screen:
// the line goes up, or at least not down, while the library gets bigger.

import { curvePoints } from "../lib/curve.ts";
import { compact, pct } from "../lib/format.ts";
import type { StagePayload } from "../lib/types.ts";

export type HeroProps = {
  solveRate: StagePayload["metrics"]["solveRate"];
  perMinute: StagePayload["metrics"]["perMinute"];
  libraryTokens: number | null;
  controlRate: number | null;
  width?: number;
  height?: number;
};

// Cumulative library tokens at the end of each bucket, from perMinute
// (the last hour) anchored so the last bucket ends at the live total.
export function libraryAtBuckets(buckets: Array<{ bucket: string }>, perMinute: HeroProps["perMinute"], total: number | null): Array<number | null> {
  if (total === null) return buckets.map(() => null);
  const sorted = [...buckets].sort((a, b) => (a.bucket < b.bucket ? -1 : 1));
  const minutes = [...perMinute].sort((a, b) => (a.minute < b.minute ? -1 : 1));
  const out: number[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const end = new Date(sorted[i]!.bucket).getTime() + 15 * 60_000;
    const after = minutes.filter((m) => new Date(m.minute).getTime() >= end).reduce((s, m) => s + m.tokens, 0);
    out.unshift(Math.max(0, total - after));
  }
  return out;
}

export function Hero({ solveRate, perMinute, libraryTokens, controlRate, width = 400, height = 64 }: HeroProps) {
  const pts = curvePoints(solveRate).filter((p) => p.rate !== null);
  const lib = libraryAtBuckets(
    pts.map((p) => ({ bucket: p.at })),
    perMinute,
    libraryTokens,
  );
  const padL = 2;
  const padR = 2;
  const w = width - padL - padR;
  const top = 6;
  const bottom = height - 6;
  const yOf = (r: number) => bottom - r * (bottom - top);
  const xOf = (i: number) => padL + (pts.length > 1 ? (i / (pts.length - 1)) * w : w / 2);
  const line = pts.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.rate ?? 0).toFixed(1)}`).join(" ");
  const last = pts.at(-1) ?? null;
  const firstRate = pts[0]?.rate ?? null;
  const rate = last?.rate ?? null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" style={{ display: "block" }}>
          {controlRate !== null ? <line x1={padL} x2={width - padR} y1={yOf(controlRate)} y2={yOf(controlRate)} stroke="#8f8f8f" strokeWidth="1.5" strokeDasharray="3 3" /> : null}
          {pts.length > 1 ? <polyline points={line} stroke="#6fbf8e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /> : null}
          {last ? <circle cx={xOf(pts.length - 1)} cy={yOf(last.rate ?? 0)} r="3" fill="#6fbf8e" /> : null}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11, color: "var(--fg-dimmer)", whiteSpace: "nowrap" }}>
          <span>solve rate as the library grows</span>
          <span style={{ fontFamily: "var(--mono)" }}>
            {lib[0] !== null && lib[0] !== undefined && pts.length > 1 ? `${compact(lib[0])} → ` : ""}
            {libraryTokens !== null ? `${compact(libraryTokens)} tokens` : ""}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 26, lineHeight: 1, color: "#6fbf8e" }}>{pct(rate)}</span>
        <span style={{ fontSize: 13, color: "var(--fg-dimmer)" }}>solved{firstRate !== null && pts.length > 1 ? ` · was ${pct(firstRate)}` : ""}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 14, borderLeft: "1px solid #262626" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 26, lineHeight: 1, color: "#8f8f8f" }}>{controlRate !== null ? pct(controlRate) : "-"}</span>
        <span style={{ fontSize: 13, color: "var(--fg-dimmer)" }}>control · no library</span>
      </div>
    </div>
  );
}
