"use client";

// The stage view: header (goal, KPIs), the curve, the puzzle grid, the
// worker rows and the live feed, in the brief's order. Layout only: the
// regions fill 1920x1080 without scrolling; the mockup pass restyles.

import { KpiStrip } from "../components/Counter.tsx";
import { FeedLine } from "../components/FeedLine.tsx";
import { SolveCurve } from "../components/SolveCurve.tsx";
import { UnitGrid } from "../components/UnitGrid.tsx";
import { WorkerRow } from "../components/WorkerRow.tsx";
import { compact, duration, hhmm, pct, secondsSince } from "../lib/format.ts";
import { usePoll } from "../lib/poll.ts";
import type { StagePayload } from "../lib/types.ts";
import { useSize } from "../lib/useSize.ts";

type BaselinePayload = { solveRate: number; solveRateAt2: number | null; n: number; model: string } | null;

const STAGE_POLL_MS = 2000;
const BASELINE_POLL_MS = 60_000;
const FEED_SHOWN = 15;

function lastDefined<T>(list: T[], pick: (t: T) => number | null): number | null {
  for (let i = list.length - 1; i >= 0; i--) {
    const v = pick(list[i]!);
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

export default function StagePage() {
  const stage = usePoll<StagePayload>("/api/stage", STAGE_POLL_MS);
  const baseline = usePoll<BaselinePayload>("/api/baseline", BASELINE_POLL_MS);
  const curveBox = useSize<HTMLDivElement>();
  const s = stage.data;

  const totals = s?.metrics.totals ?? null;
  const attempted = totals?.attempted ?? s?.units.filter((u) => u.attempt !== null).length ?? 0;
  const solved = s?.counts.solved ?? 0;
  const merged = (s?.counts.merged ?? 0) + solved;
  const lastBucket = s?.metrics.solveRate.at(-1) ?? null;
  const solveRate = lastBucket && lastBucket.attempted > 0 ? lastBucket.solved / lastBucket.attempted : attempted > 0 ? solved / attempted : null;
  const firstTry = s ? lastDefined(s.metrics.perMinute, (m) => m.firstTryPass) : null;
  const uptime = secondsSince(s?.goal?.writtenAt ?? null, stage.at ?? Date.now());
  const model = process.env.NEXT_PUBLIC_WORKER_MODEL ?? baseline.data?.model ?? null;

  return (
    <main
      className="stage"
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateRows: "auto 240px minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr) 640px",
        gap: 12,
        padding: 12,
        overflow: "hidden",
      }}
    >
      <header style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s?.goal?.statement ?? undefined}>
            <span style={{ fontFamily: "var(--mono)", color: "var(--accent)", marginRight: 12 }}>goalkeeper</span>
            <span>{s?.goal?.statement ?? (stage.loading ? "loading" : "no goal")}</span>
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-dim)", whiteSpace: "nowrap" }}>
            written once by a human at {hhmm(s?.goal?.writtenAt)}
            {stage.error ? <span style={{ color: "var(--status-blocked)", marginLeft: 12 }}>stale: {stage.error}</span> : null}
          </span>
        </div>
        <KpiStrip
          items={[
            { label: "solve rate", value: pct(solveRate, 1), caption: baseline.data ? `single shot ${pct(baseline.data.solveRate, 1)}` : "hidden test passes / attempted", size: "lg", tone: "var(--accent)" },
            { label: "solved", value: solved, caption: `of ${s?.counts.units ?? 0}`, tone: "var(--status-solved)" },
            { label: "merged", value: merged, caption: "passed the examples", tone: "var(--status-merged)" },
            { label: "attempted", value: attempted, caption: `${s?.counts.claimed ?? 0} working now` },
            { label: "blocked", value: s?.counts.blocked ?? 0, caption: `${s?.counts.parked ?? 0} parked`, tone: "var(--status-blocked)" },
            { label: "library tokens", value: compact(totals?.libraryTokens), caption: `${compact(totals?.librarySources, 0)} sources, rising`, size: "lg" },
            { label: "context per request", value: compact(totals?.contextLast20Avg), caption: "tokens, flat", size: "lg" },
            { label: "first-attempt pass", value: pct(firstTry), caption: "rolling 20" },
            { label: "median steps", value: totals?.stepsMedian ?? "-", caption: "to merge" },
            { label: "workers", value: `${s?.workers.alive ?? 0}/${s?.workers.target ?? 0}`, caption: "alive / target" },
            { label: "uptime", value: duration(uptime), caption: `since ${hhmm(s?.goal?.writtenAt)}` },
          ]}
        />
      </header>

      <section ref={curveBox.ref} style={{ gridColumn: "1 / -1", minWidth: 0, minHeight: 0 }} aria-label="solve rate over time">
        {curveBox.width > 0 ? (
          <SolveCurve
            buckets={s?.metrics.solveRate ?? []}
            baselineRate={baseline.data?.solveRate ?? null}
            width={curveBox.width}
            height={curveBox.height || 240}
            caption={model ? `${model}, same model all day` : "same model all day"}
          />
        ) : null}
      </section>

      <section style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: 6 }} aria-label="puzzles">
        <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-dim)" }}>
          {s?.counts.units ?? 0} puzzles: {s?.counts.open ?? 0} open, {s?.counts.claimed ?? 0} working, {s?.counts.merged ?? 0} merged, {s?.counts.solved ?? 0} solved, {s?.counts.blocked ?? 0} blocked
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <UnitGrid units={s?.units ?? []} />
        </div>
      </section>

      <aside style={{ minWidth: 0, minHeight: 0, display: "grid", gridTemplateRows: "minmax(0, auto) minmax(0, 1fr)", gap: 12 }}>
        <section aria-label="workers" style={{ minHeight: 0, overflow: "hidden" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-dim)", marginBottom: 4 }}>
            workers {s?.workers.alive ?? 0} alive of {s?.workers.target ?? 0}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {(s?.workers.rows ?? []).map((r) => (
              <WorkerRow key={`${r.worker}-${r.taskId}-${r.diedAt ?? "live"}`} row={r} />
            ))}
            {s && !s.workers.rows.length ? <div style={{ color: "var(--fg-dim)", fontFamily: "var(--mono)", fontSize: 12 }}>no workers</div> : null}
          </div>
        </section>
        <section aria-label="live feed" style={{ minHeight: 0, overflow: "hidden" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-dim)", marginBottom: 4 }}>live feed</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {(s?.feed ?? []).slice(0, FEED_SHOWN).map((l) => (
              <FeedLine key={`${l.id}-${l.at}-${l.outcome}`} line={l} />
            ))}
          </div>
        </section>
      </aside>
    </main>
  );
}
