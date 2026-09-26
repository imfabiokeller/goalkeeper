"use client";

// The puzzle page: example pairs with the latest attempt's actual output,
// the test input, then rule, program, gate, precedents and refuted rules,
// then the attempt history with its live progress. Layout only.

import Link from "next/link";
import { useParams } from "next/navigation";
import { CodeBlock } from "../../../components/CodeBlock.tsx";
import { GateResult } from "../../../components/GateResult.tsx";
import { GridPair } from "../../../components/GridPair.tsx";
import { PrecedentCard } from "../../../components/PrecedentCard.tsx";
import { ProgressList } from "../../../components/ProgressList.tsx";
import { compact, duration, hhmmss } from "../../../lib/format.ts";
import { usePoll } from "../../../lib/poll.ts";
import { TONE_VAR, statusTone } from "../../../lib/status.ts";
import type { UnitPayload } from "../../../lib/types.ts";

const UNIT_POLL_MS = 3000;

const h2: React.CSSProperties = { fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-dim)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" };

export default function UnitPage() {
  const { key } = useParams<{ key: string }>();
  const unit = usePoll<UnitPayload>(`/api/unit/${key}`, UNIT_POLL_MS);
  const u = unit.data;
  const latestTask = u?.tasks.at(-1) ?? null;
  const status = u?.state ? (u.state.score === 1 ? "solved" : "merged") : (latestTask?.status ?? "open");
  const tone = statusTone(status, latestTask?.attempt ?? null, latestTask?.hint ?? null);
  const solved = u?.state ? u.state.score === 1 : null;
  const gateTask = u ? [...u.tasks].reverse().find((t) => t.gate || t.blockReason) ?? null : null;

  return (
    <main className="unit" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20, maxWidth: 1900, margin: "0 auto" }}>
      <header style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
        <Link href="/" style={{ color: "var(--fg-dim)", fontFamily: "var(--mono)", fontSize: 12 }}>
          stage
        </Link>
        <h1 style={{ fontFamily: "var(--mono)", fontSize: 22, margin: 0 }}>{key}</h1>
        <span style={{ fontFamily: "var(--mono)", color: TONE_VAR[tone] }}>{status}</span>
        {u?.name && u.name !== key ? <span style={{ color: "var(--fg-dim)" }}>{u.name}</span> : null}
        {latestTask ? (
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-dim)" }}>
            attempt {latestTask.attempt} of 5, {latestTask.worker ?? latestTask.status}
            {latestTask.hint ? `, planner: ${latestTask.hint}` : ""}
          </span>
        ) : null}
        {unit.error ? <span style={{ color: "var(--status-blocked)", fontSize: 12 }}>{unit.error}</span> : null}
        {unit.loading ? <span style={{ color: "var(--fg-dim)", fontSize: 12 }}>loading</span> : null}
      </header>

      <section aria-label="examples" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={h2}>examples{u?.latest?.program ? " with the latest program's output" : ""}</h2>
        {(u?.train ?? []).map((pair, i) => (
          <GridPair key={i} label={`example ${i + 1}`} input={pair.input} expected={pair.output} actual={u?.latest?.actual[i] ?? null} />
        ))}
        {(u?.test ?? []).map((t, i) => (
          <GridPair key={`t${i}`} label={`test ${i + 1}`} input={t.input} expected={null} actual={u?.latest?.actualTest[i] ?? null} />
        ))}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div>
            <h2 style={h2}>rule</h2>
            <p style={{ margin: 0, fontSize: 16 }}>{u?.latest?.rule ?? u?.state?.rule ?? <span style={{ color: "var(--fg-dim)" }}>no rule yet</span>}</p>
          </div>
          <CodeBlock label="program" code={u?.latest?.program ?? u?.state?.program ?? null} maxHeight={480} />
          <div>
            <h2 style={h2}>gate</h2>
            <GateResult gate={gateTask?.gate ?? null} blockReason={gateTask?.blockReason ?? null} solved={solved} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div>
            <h2 style={h2}>precedents given to this attempt</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(u?.latest?.precedents ?? []).map((p) => (
                <PrecedentCard key={p.id} precedent={p} />
              ))}
              {u && !(u.latest?.precedents.length ?? 0) ? <span style={{ color: "var(--fg-dim)", fontSize: 12 }}>none</span> : null}
            </div>
          </div>
          <div>
            <h2 style={h2}>refuted rules from earlier attempts</h2>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {(u?.latest?.refutedRules ?? []).map((r, i) => (
                <li key={i} style={{ color: "var(--status-retrying)" }}>
                  {r}
                </li>
              ))}
            </ul>
            {u && !(u.latest?.refutedRules.length ?? 0) ? <span style={{ color: "var(--fg-dim)", fontSize: 12 }}>none</span> : null}
          </div>
        </div>
      </section>

      <section aria-label="attempts">
        <h2 style={h2}>attempts</h2>
        <table style={{ fontFamily: "var(--mono)", fontSize: 12, width: "100%" }}>
          <thead>
            <tr>
              <th>attempt</th>
              <th>worker</th>
              <th>status</th>
              <th>outcome</th>
              <th>steps</th>
              <th>seconds</th>
              <th>tokens</th>
              <th>created</th>
              <th>rule / reason</th>
              <th>task</th>
            </tr>
          </thead>
          <tbody>
            {(u?.tasks ?? []).map((t) => {
              const ttone = statusTone(t.status, t.attempt, t.hint);
              return [
                <tr key={t.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td>{t.attempt}</td>
                  <td>{t.worker ?? "-"}</td>
                  <td style={{ color: TONE_VAR[ttone] }}>{t.status}</td>
                  <td>{t.outcome ?? (t.gate ? (t.gate.pass ? "pass" : "fail") : t.blockReason ? "block" : "-")}</td>
                  <td>{t.steps ?? t.step ?? "-"}</td>
                  <td>{duration(t.seconds)}</td>
                  <td>{t.tokens ? `${compact(t.tokens.in)} / ${compact(t.tokens.out)}` : "-"}</td>
                  <td>{hhmmss(t.createdAt)}</td>
                  <td style={{ fontFamily: "var(--sans)", maxWidth: 520 }}>
                    {t.rule ? <span>{t.rule}</span> : null}
                    {t.blockReason ? <span style={{ color: "var(--status-blocked)" }}> {t.blockReason}</span> : null}
                    {!t.blockReason && t.gate && !t.gate.pass && t.gate.reasons[0] ? <span style={{ color: "var(--fg-dim)" }}> {t.gate.reasons[0]}</span> : null}
                    {t.hint ? <span style={{ color: "var(--status-retrying)" }}> [{t.hint}]</span> : null}
                  </td>
                  <td>
                    <Link href={`/task/${t.id}`}>open</Link>
                  </td>
                </tr>,
                t.progress.length ? (
                  <tr key={`${t.id}-p`}>
                    <td colSpan={10} style={{ paddingLeft: 24, paddingBottom: 8 }}>
                      <details open={t.id === latestTask?.id && t.status === "claimed"}>
                        <summary style={{ cursor: "pointer", color: "var(--fg-dim)" }}>progress, {t.progress.length} lines</summary>
                        <ProgressList lines={t.progress} />
                      </details>
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
        {u && !u.tasks.length ? <span style={{ color: "var(--fg-dim)", fontSize: 12 }}>no attempts yet</span> : null}
      </section>
    </main>
  );
}
