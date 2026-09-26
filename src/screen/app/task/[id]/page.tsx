"use client";

// The task page: one iteration end to end. The context as sections, the
// tool transcript step by step, the proposal, the gate, what happened
// next, the live progress, and the token counts next to the global
// counter. Layout only.

import Link from "next/link";
import { useParams } from "next/navigation";
import { CodeBlock } from "../../../components/CodeBlock.tsx";
import { GateResult } from "../../../components/GateResult.tsx";
import { ProgressList } from "../../../components/ProgressList.tsx";
import { compact, hhmmss, oneLine } from "../../../lib/format.ts";
import { usePoll } from "../../../lib/poll.ts";
import { TONE_VAR, statusTone } from "../../../lib/status.ts";
import { contextSections, inputMessages, stepLines } from "../../../lib/transcript.ts";
import type { StagePayload, TaskPayload } from "../../../lib/types.ts";

const TASK_POLL_MS = 3000;
const STAGE_POLL_MS = 10_000;
const ARG_CHARS = 300;
const RESULT_CHARS = 600;

const h2: React.CSSProperties = { fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-dim)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" };

export default function TaskPage() {
  const { id } = useParams<{ id: string }>();
  const poll = usePoll<TaskPayload>(`/api/task/${id}`, TASK_POLL_MS);
  const stage = usePoll<StagePayload>("/api/stage", STAGE_POLL_MS);
  const t = poll.data?.task ?? null;
  const run = poll.data?.run ?? null;
  const next = poll.data?.next ?? null;
  const raw = run?.raw ?? {};
  const sections = [...contextSections(raw.system as string | null), ...inputMessages(raw.messages)];
  const contextTotal = sections.reduce((n, s) => n + s.tokens, 0);
  const steps = stepLines(raw.steps);
  const proposal = (t?.proposal ?? raw.proposal ?? null) as { rule?: unknown; program?: unknown } | null;
  const briefing = raw.briefing as { text?: string; cited?: string[]; tokens?: { in: number; out: number } } | null | undefined;
  const tone = t ? statusTone(t.status, t.attempt, t.hint) : "open";
  const globalContext = stage.data?.metrics.totals?.contextLast20Avg ?? null;

  return (
    <main className="task" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20, maxWidth: 1400, margin: "0 auto" }}>
      <header style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
        <Link href="/" style={{ color: "var(--fg-dim)", fontFamily: "var(--mono)", fontSize: 12 }}>
          stage
        </Link>
        {t ? (
          <Link href={`/unit/${t.key}`} style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-dim)" }}>
            puzzle {t.key}
          </Link>
        ) : null}
        <h1 style={{ fontFamily: "var(--mono)", fontSize: 18, margin: 0 }}>task {id}</h1>
        {t ? (
          <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
            attempt {t.attempt}, {t.worker ?? t.lastWorker ?? "no worker"}, <span style={{ color: TONE_VAR[tone] }}>{t.status}</span>
            {t.hint ? <span style={{ color: "var(--status-retrying)" }}>, planner: {t.hint}</span> : null}
            {t.diedAt ? <span style={{ color: "var(--status-blocked)" }}>, worker died at {hhmmss(t.diedAt)}</span> : null}
          </span>
        ) : null}
        {poll.error ? <span style={{ color: "var(--status-blocked)", fontSize: 12 }}>{poll.error}</span> : null}
        {poll.loading ? <span style={{ color: "var(--fg-dim)", fontSize: 12 }}>loading</span> : null}
      </header>

      <section aria-label="tokens" style={{ display: "flex", gap: 24, fontFamily: "var(--mono)", fontSize: 12, flexWrap: "wrap" }}>
        <span>
          context assembled <b>{compact(typeof raw.contextTokens === "number" ? raw.contextTokens : contextTotal || null)}</b> tokens
        </span>
        <span>
          global counter (last 20 requests) <b>{compact(globalContext)}</b>
        </span>
        {run ? (
          <span>
            run in <b>{compact(run.tokens.in)}</b>, out <b>{compact(run.tokens.out)}</b>, ${run.tokens.cost.toFixed(4)}
          </span>
        ) : null}
        {briefing?.tokens ? <span>briefing in {compact(briefing.tokens.in)}, out {compact(briefing.tokens.out)}</span> : null}
        {stage.data?.metrics.totals ? <span style={{ color: "var(--fg-dim)" }}>library {compact(stage.data.metrics.totals.libraryTokens)} tokens</span> : null}
        {run?.truncated ? <span style={{ color: "var(--fg-dim)" }}>raw record clipped for the wire</span> : null}
      </section>

      <section aria-label="context">
        <h2 style={h2}>what the worker saw: {sections.length} sections, about {compact(contextTotal)} tokens</h2>
        {!run ? <span style={{ color: "var(--fg-dim)", fontSize: 12 }}>{t?.status === "claimed" ? "the run is still going; the record lands when it ends" : "no run record for this task"}</span> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {sections.map((s, i) => (
            <details key={i} open={i < 2} style={{ border: "1px solid var(--line)", borderRadius: 2, padding: "4px 8px" }}>
              <summary style={{ cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12 }}>
                {s.label} <span style={{ color: "var(--fg-dim)" }}>{s.chars} chars, ~{s.tokens} tokens</span>
              </summary>
              <pre style={{ margin: "6px 0 2px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.4, fontFamily: "var(--sans)" }}>{s.text}</pre>
            </details>
          ))}
        </div>
      </section>

      <section aria-label="transcript">
        <h2 style={h2}>transcript: {steps.length} steps</h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {steps.map((s) => (
            <li key={s.n} data-step={s.n} style={{ borderLeft: "2px solid var(--line)", paddingLeft: 10, fontSize: 12 }}>
              <div style={{ fontFamily: "var(--mono)", color: "var(--fg-dim)" }}>
                step {s.n}: {s.calls.map((c) => c.name).join(", ") || "text"} <span>({s.finishReason}, in {compact(s.usage.in)}, out {compact(s.usage.out)})</span>
              </div>
              {s.text ? <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>{s.text}</p> : null}
              {s.calls.map((c, i) => (
                <div key={`c${i}`} style={{ fontFamily: "var(--mono)", wordBreak: "break-word" }}>
                  <span style={{ color: "var(--accent)" }}>{c.name}</span> {oneLine(c.input, ARG_CHARS)}
                </div>
              ))}
              {s.results.map((r, i) => (
                <div key={`r${i}`} style={{ fontFamily: "var(--mono)", wordBreak: "break-word", color: "var(--fg-dim)" }}>
                  <span style={{ color: r.ok === null ? "var(--fg-dim)" : r.ok ? "var(--status-merged)" : "var(--status-retrying)" }}>
                    {r.name} {r.ok === null ? "" : r.ok ? "pass" : "fail"}
                  </span>{" "}
                  {r.reasons.length ? (
                    <ul style={{ margin: "2px 0", paddingLeft: 18, fontFamily: "var(--sans)", color: "var(--fg)" }}>
                      {r.reasons.map((x, j) => (
                        <li key={j}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    oneLine(r.output, RESULT_CHARS)
                  )}
                </div>
              ))}
            </li>
          ))}
        </ol>
        {run && !steps.length ? <span style={{ color: "var(--fg-dim)", fontSize: 12 }}>no steps recorded</span> : null}
      </section>

      <section aria-label="proposal" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 24 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={h2}>proposal</h2>
          {proposal ? (
            <>
              <p style={{ margin: "0 0 8px" }}>{typeof proposal.rule === "string" ? proposal.rule : <span style={{ color: "var(--fg-dim)" }}>no rule</span>}</p>
              <CodeBlock code={typeof proposal.program === "string" ? proposal.program : null} maxHeight={420} />
            </>
          ) : (
            <span style={{ color: "var(--fg-dim)", fontSize: 12 }}>{t?.blockReason ? `blocked: ${t.blockReason}` : "no proposal"}</span>
          )}
        </div>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h2 style={h2}>gate</h2>
            <GateResult gate={t?.gate ?? (raw.gate as TaskPayload["task"]["gate"]) ?? null} blockReason={t?.blockReason ?? null} />
          </div>
          <div>
            <h2 style={h2}>what happened next</h2>
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <span>
                task status <span style={{ color: TONE_VAR[tone] }}>{t?.status ?? "-"}</span>
                {t?.hint ? <span style={{ color: "var(--status-retrying)" }}> ({t.hint})</span> : null}
              </span>
              {next ? (
                <span>
                  next attempt {next.attempt} ({next.status}
                  {next.hint ? `, ${next.hint}` : ""}) at {hhmmss(next.createdAt)}: <Link href={`/task/${next.id}`}>open</Link>
                </span>
              ) : (
                <span style={{ color: "var(--fg-dim)" }}>no later attempt on this puzzle</span>
              )}
              {run ? <span style={{ color: "var(--fg-dim)" }}>run record {hhmmss(run.createdAt)}, outcome {String(raw.outcome ?? "-")}</span> : null}
              {run?.enrichment ? <span style={{ fontFamily: "var(--sans)" }}>{run.enrichment.gist}</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="progress">
        <h2 style={h2}>live progress ({t?.progress.length ?? 0} lines, step {t?.step ?? "-"})</h2>
        <ProgressList lines={t?.progress ?? []} />
      </section>
    </main>
  );
}
