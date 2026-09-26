// Bare data-layer check, unstyled on purpose: the stage counts and one
// puzzle's grids through ArcGrid. `?key=<key>` picks the puzzle; the
// default is the first merged one, else the first unit.

import { ArcGrid } from "../../lib/arc.tsx";
import { screenDb } from "../../lib/db.ts";
import { buildStage } from "../../lib/stage.ts";
import { buildUnit } from "../../lib/unit.ts";

export const dynamic = "force-dynamic";

export default async function DevPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key: wanted } = await searchParams;
  const c = await screenDb();
  const stage = await buildStage(c);
  const key = wanted ?? stage.units.find((u) => u.status === "solved" || u.status === "merged")?.key ?? stage.units[0]?.key ?? null;
  const unit = key ? await buildUnit(c, key) : null;

  return (
    <main style={{ padding: 16, fontFamily: "var(--mono)", fontSize: 13 }}>
      <h1>/dev</h1>
      <pre>{JSON.stringify({ at: stage.at, counts: stage.counts, workers: { target: stage.workers.target, alive: stage.workers.alive, rows: stage.workers.rows.length }, feed: stage.feed.length, metricsAt: stage.metrics.at, totals: stage.metrics.totals, solveRateBuckets: stage.metrics.solveRate.length, goalVersion: stage.goal?.version ?? null }, null, 2)}</pre>
      <p>
        <a href="/api/stage">/api/stage</a>
        {key ? (
          <>
            {" | "}
            <a href={`/api/unit/${key}`}>/api/unit/{key}</a>
          </>
        ) : null}
      </p>
      {unit ? (
        <section>
          <h2>
            {unit.key} ({unit.state ? (unit.state.score === 1 ? "solved" : "merged") : "not merged"})
          </h2>
          {unit.latest?.rule ? <p>rule: {unit.latest.rule}</p> : null}
          {unit.train.map((pair, i) => {
            const actual = unit.latest?.actual[i] ?? null;
            return (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
                <ArcGrid grid={pair.input} cell={12} title={`example ${i + 1} input`} />
                <span>→</span>
                <ArcGrid grid={pair.output} cell={12} title={`example ${i + 1} output`} />
                {actual ? (
                  actual.ok ? (
                    <ArcGrid grid={actual.output} cell={12} diff={pair.output} title={`example ${i + 1} actual`} />
                  ) : (
                    <span>actual: {actual.error}</span>
                  )
                ) : null}
              </div>
            );
          })}
          {unit.test.map((t, i) => (
            <div key={`t${i}`} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
              <ArcGrid grid={t.input} cell={12} title={`test ${i + 1} input`} />
              {unit.latest?.actualTest[i]?.ok ? <ArcGrid grid={unit.latest.actualTest[i]!.output} cell={12} title={`test ${i + 1} actual`} /> : null}
            </div>
          ))}
          <pre>{JSON.stringify({ tasks: unit.tasks, precedents: unit.latest?.precedents ?? [], refutedRules: unit.latest?.refutedRules ?? [] }, null, 2)}</pre>
        </section>
      ) : (
        <p>no units</p>
      )}
    </main>
  );
}
