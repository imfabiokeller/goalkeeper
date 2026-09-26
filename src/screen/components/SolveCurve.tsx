// The claim as a chart: solve rate over time. Buckets are cumulative
// counts at the end of each 15-minute bucket (metrics.solveRate), so the
// line is solved/attempted per bucket and the bars are the solves that
// landed inside each bucket. A dashed horizontal line marks the single
// shot baseline. Plain SVG, no chart library, sized by props.

import { curvePoints, type SolveBucketT } from "../lib/curve.ts";
import { hhmm, pct } from "../lib/format.ts";

export type { CurvePoint, SolveBucketT } from "../lib/curve.ts";

export type SolveCurveProps = {
  buckets: SolveBucketT[];
  baselineRate: number | null; // 0..1, the single shot solve rate; null hides the line
  width?: number; // default 960
  height?: number; // default 240
  caption?: string | null; // e.g. the model name
  baselineLabel?: string; // default "single shot"
  maxRate?: number | null; // y axis top; default: max(line, baseline) rounded up to a 0.1 step, at least 0.2
};

export function SolveCurve({ buckets, baselineRate, width = 960, height = 240, caption = null, baselineLabel = "single shot", maxRate = null }: SolveCurveProps) {
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const w = Math.max(1, width - pad.l - pad.r);
  const h = Math.max(1, height - pad.t - pad.b);
  const pts = curvePoints(buckets);
  const rates = pts.map((p) => p.rate ?? 0);
  const top = maxRate ?? Math.max(0.2, Math.ceil((Math.max(0, ...rates, baselineRate ?? 0) + 0.02) * 10) / 10);
  const n = Math.max(1, pts.length);
  const slot = w / n;
  const x = (i: number) => pad.l + slot * (i + 0.5);
  const y = (r: number) => pad.t + h - (Math.min(r, top) / top) * h;
  const maxDelta = Math.max(1, ...pts.map((p) => p.solvedDelta));
  const barH = (d: number) => (d / maxDelta) * h * 0.6;

  const line = pts
    .map((p, i) => (p.rate === null ? null : `${x(i).toFixed(1)},${y(p.rate).toFixed(1)}`))
    .filter((s): s is string => s !== null)
    .join(" ");
  const ticks = [0, top / 2, top];
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(w / 70))));
  const last = pts.at(-1);

  return (
    <svg className="solve-curve" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="solve rate over time" style={{ display: "block", fontFamily: "var(--mono)", fontSize: 11 }}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fill="var(--fg-dim)">
            {pct(t)}
          </text>
        </g>
      ))}
      {pts.map((p, i) =>
        p.solvedDelta > 0 ? (
          <rect key={`b${i}`} x={x(i) - slot * 0.3} y={pad.t + h - barH(p.solvedDelta)} width={slot * 0.6} height={barH(p.solvedDelta)} fill="var(--status-solved)" opacity={0.28}>
            <title>{`${hhmm(p.at)}: ${p.solvedDelta} solved in bucket, ${p.solved}/${p.attempted} cumulative`}</title>
          </rect>
        ) : null,
      )}
      {baselineRate !== null ? (
        <g>
          <line x1={pad.l} x2={width - pad.r} y1={y(baselineRate)} y2={y(baselineRate)} stroke="var(--fg-dim)" strokeWidth={1} strokeDasharray="6 4" />
          <text x={width - pad.r} y={y(baselineRate) - 4} textAnchor="end" fill="var(--fg-dim)">
            {baselineLabel} {pct(baselineRate)}
          </text>
        </g>
      ) : null}
      {line ? <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /> : null}
      {pts.map((p, i) =>
        p.rate === null ? null : (
          <circle key={`p${i}`} cx={x(i)} cy={y(p.rate)} r={2.5} fill="var(--accent)">
            <title>{`${hhmm(p.at)}: ${pct(p.rate, 1)} (${p.solved}/${p.attempted})`}</title>
          </circle>
        ),
      )}
      {last && last.rate !== null ? (
        <text x={Math.min(x(n - 1) + 6, width - pad.r - 40)} y={y(last.rate) - 6} fill="var(--accent)" fontWeight={600}>
          {pct(last.rate, 1)}
        </text>
      ) : null}
      {pts.map((p, i) =>
        i % labelEvery === 0 || i === n - 1 ? (
          <text key={`t${i}`} x={x(i)} y={height - 8} textAnchor="middle" fill="var(--fg-dim)">
            {hhmm(p.at)}
          </text>
        ) : null,
      )}
      {caption ? (
        <text x={pad.l} y={pad.t + 10} fill="var(--fg-dim)" fontFamily="var(--sans)">
          {caption}
        </text>
      ) : null}
      {!pts.length ? (
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="var(--fg-dim)" fontFamily="var(--sans)">
          no buckets yet
        </text>
      ) : null}
    </svg>
  );
}
