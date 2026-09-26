// The solve curve's points off metrics.solveRate. Buckets are cumulative
// counts at the end of each 15-minute bucket, so the rate is
// solved/attempted per bucket and the delta is the solves that landed
// inside it. Pure, tested, used by components/SolveCurve.tsx.

export type SolveBucketT = { bucket: string; attempted: number; merged: number; solved: number };

export type CurvePoint = { at: string; rate: number | null; solvedDelta: number; attempted: number; solved: number; merged: number };

export function curvePoints(buckets: SolveBucketT[]): CurvePoint[] {
  const sorted = [...buckets].sort((a, b) => (a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0));
  return sorted.map((b, i) => ({
    at: b.bucket,
    rate: b.attempted > 0 ? b.solved / b.attempted : null,
    solvedDelta: Math.max(0, b.solved - (i > 0 ? sorted[i - 1]!.solved : 0)),
    attempted: b.attempted,
    solved: b.solved,
    merged: b.merged,
  }));
}
