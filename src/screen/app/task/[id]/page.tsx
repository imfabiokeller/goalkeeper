"use client";

// The task page: one attempt end to end, in the mockup's system. What
// the agent read (sections with tokens each), what it did (the tool
// steps as a vertical timeline with verdict chips and reasons), the
// proposal, the gate, what happened next, and the live progress. Same
// data wiring as before, no new numbers.

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { ProgressList } from "../../../components/ProgressList.tsx";
import { agentLabel, compact, hhmm, hhmmss, oneLine } from "../../../lib/format.ts";
import { usePoll } from "../../../lib/poll.ts";
import { contextSections, inputMessages, stepLines } from "../../../lib/transcript.ts";
import type { StagePayload, TaskPayload } from "../../../lib/types.ts";

const TASK_POLL_MS = 3000;
const STAGE_POLL_MS = 10_000;
const ARG_CHARS = 240;
const RESULT_CHARS = 400;
const MAX_ATTEMPTS = 5;
const FONTS = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap";

type ChipTone = "solved" | "working" | "retry" | "passed" | "dead" | "plain";

const CHIP: Record<ChipTone, { color: string; border: string; bg: string }> = {
  solved: { color: "var(--gk-solved)", border: "var(--gk-solved-bd)", bg: "var(--gk-solved-bg)" },
  working: { color: "var(--gk-working)", border: "#1c2350", bg: "#07091a" },
  retry: { color: "var(--gk-retry)", border: "var(--gk-retry-bd)", bg: "var(--gk-retry-bg)" },
  passed: { color: "var(--gk-passed)", border: "var(--gk-passed-bd)", bg: "var(--gk-passed-bg)" },
  dead: { color: "var(--gk-dead)", border: "var(--gk-dead-bd)", bg: "var(--gk-dead-bg)" },
  plain: { color: "var(--gk-dim)", border: "var(--gk-line-strong)", bg: "transparent" },
};

function Chip({ tone, children, pulse = false, style }: { tone: ChipTone; children: ReactNode; pulse?: boolean; style?: CSSProperties }) {
  const c = CHIP[tone];
  return (
    <span className="gk-chip" style={{ color: c.color, borderColor: c.border, background: c.bg, ...style }}>
      <span className={pulse ? "pulse" : undefined} style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
      {children}
    </span>
  );
}

// The task's state in one chip: what the stage calls it.
function taskChip(t: TaskPayload["task"], outcome: string | null): { tone: ChipTone; label: string; pulse: boolean } {
  if (t.diedAt && t.status === "open") return { tone: "dead", label: "Agent stopped", pulse: false };
  if (t.status === "merged") return { tone: "solved", label: "Solved", pulse: false };
  if (t.status === "claimed") return t.lastWorker && t.diedAt ? { tone: "working", label: "Resumed", pulse: true } : { tone: "working", label: "Working", pulse: true };
  if (t.status === "blocked") return { tone: "dead", label: "Blocked", pulse: false };
  if (t.status === "parked") return { tone: "plain", label: "Parked", pulse: false };
  if (outcome === "fail" || t.gate?.pass === false) return { tone: "retry", label: "Retrying", pulse: false };
  return { tone: "plain", label: t.status, pulse: false };
}

function Card({ title, sub, children, style }: { title: string; sub?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <section className="gk-card" style={style} aria-label={title}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span className="gk-title">{title}</span>
        {sub ? <span className="gk-sub">{sub}</span> : null}
      </div>
      {children}
    </section>
  );
}

// One plain line per step: what the agent did, not the payload.
function stepTitle(s: { calls: Array<{ name: string; input: unknown }>; results: Array<{ output: unknown }> }): string {
  const c = s.calls[0];
  if (!c) return "thinking";
  const input = (c.input ?? {}) as Record<string, unknown>;
  if (c.name === "read_input") {
    const off = Number(input.offset ?? 0) || 0;
    return off ? `read the puzzle from character ${off.toLocaleString("en-US")}` : "read the puzzle";
  }
  if (c.name === "search_library") {
    const out = s.results[0]?.output as { passages?: unknown[] } | undefined;
    const n = Array.isArray(out?.passages) ? out.passages.length : null;
    return `searched the library for "${String(input.query ?? "").slice(0, 80)}"${n !== null ? ` · ${n} records` : ""}`;
  }
  if (c.name === "read_state") return "read the current state";
  if (c.name === "try_submit") {
    const rule = (input.proposal as { rule?: unknown } | undefined)?.rule;
    return typeof rule === "string" ? `tested a draft: "${rule.slice(0, 120)}"` : "tested a draft";
  }
  if (c.name === "submit") return "handed it in";
  if (c.name === "block") return `gave up: ${String(input.reason ?? "").slice(0, 120)}`;
  return c.name;
}

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
  const contextTokens = typeof raw.contextTokens === "number" ? raw.contextTokens : contextTotal || null;
  const steps = stepLines(raw.steps);
  const proposal = (t?.proposal ?? raw.proposal ?? null) as { rule?: unknown; program?: unknown } | null;
  const gate = t?.gate ?? (raw.gate as TaskPayload["task"]["gate"]) ?? null;
  const outcome = typeof raw.outcome === "string" ? raw.outcome : null;
  const chip = t ? taskChip(t, outcome) : null;
  const agent = agentLabel(t?.worker ?? t?.lastWorker);
  const libraryTokens = stage.data?.metrics.totals?.libraryTokens ?? null;

  return (
    <main className="gk" style={{ padding: "30px 36px", maxWidth: 1480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <link rel="stylesheet" href={FONTS} />
      <header style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <Link href="/" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
          goalkeeper
        </Link>
        <span style={{ fontSize: 22, color: "#333" }}>/</span>
        {t ? (
          <Link href={`/unit/${t.key}`} className="gk-mono" style={{ fontSize: 22, fontWeight: 500 }}>
            {t.key}
          </Link>
        ) : (
          <span className="gk-mono" style={{ fontSize: 22, color: "var(--gk-dim)" }}>
            task
          </span>
        )}
        {chip ? (
          <Chip tone={chip.tone} pulse={chip.pulse} style={{ height: 28, fontSize: 13, padding: "0 12px" }}>
            {chip.label}
          </Chip>
        ) : null}
        {t ? (
          <span style={{ fontSize: 16, color: "var(--gk-dimmer)" }}>
            attempt {t.attempt} of {MAX_ATTEMPTS} · {agent}
            {t.diedAt ? ` · stopped at ${hhmm(t.diedAt)}` : ""}
          </span>
        ) : null}
        {poll.error ? <Chip tone="dead">{poll.error}</Chip> : null}
        {poll.loading ? <span className="gk-label">loading</span> : null}
        <span style={{ flex: 1 }} />
        {t ? (
          <Link href={`/unit/${t.key}`} className="gk-button" style={{ height: 40 }}>
            Puzzle {t.key}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#ededed" strokeWidth="1.6" aria-hidden>
              <path d="M4 8h8M9 5l3 3-3 3" />
            </svg>
          </Link>
        ) : null}
      </header>

      {t?.hint ? (
        <p style={{ margin: 0, fontSize: 15, color: "var(--gk-retry)" }}>
          <span style={{ color: "var(--gk-dimmer)" }}>From the planner: </span>
          {t.hint}
        </p>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)", gap: 24, alignItems: "start" }}>
        <Card
          title="What it read"
          sub={
            run ? (
              <>
                {contextTokens === null ? "-" : contextTokens.toLocaleString("en-US")} tokens · built fresh
                {libraryTokens !== null ? ` · library ${compact(libraryTokens)}` : ""}
              </>
            ) : null
          }
        >
          {!run ? (
            <span className="gk-label">{t?.status === "claimed" ? "the run is still going; the record lands when it ends" : "no run record for this task"}</span>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {sections.map((s, i) => (
              <details key={i} style={{ borderBottom: "1px solid var(--gk-line-soft)" }}>
                <summary style={{ cursor: "pointer", listStyle: "none", display: "grid", gridTemplateColumns: "72px 1fr", gap: 14, alignItems: "baseline", padding: "8px 0" }}>
                  <span className="gk-mono" style={{ fontSize: 16, color: s.tokens > 0 ? "var(--gk-fg)" : "var(--gk-dimmer)" }}>
                    {s.tokens.toLocaleString("en-US")}
                  </span>
                  <span style={{ fontSize: 14, color: "var(--gk-dim)" }}>{s.label}</span>
                </summary>
                <pre className="gk-pre" style={{ margin: "0 0 10px", maxHeight: 360, fontFamily: "var(--gk-sans)", fontSize: 13, color: "var(--gk-dim)" }}>
                  {s.text}
                </pre>
              </details>
            ))}
          </div>
          {run?.truncated ? <span className="gk-label">raw record clipped for the wire</span> : null}
        </Card>

        <Card title="What it did" sub={run ? `${steps.length} steps · ${compact(run.tokens.in)} in · ${compact(run.tokens.out)} out` : null}>
          {run && !steps.length ? <span className="gk-label">no steps recorded</span> : null}
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
            {steps.map((s, i) => {
              const verdict = s.results.find((r) => r.ok !== null) ?? null;
              const tone: ChipTone = verdict ? (verdict.ok ? "passed" : "retry") : s.calls.some((c) => c.name === "block") ? "dead" : "plain";
              const last = i === steps.length - 1;
              return (
                <li key={s.n} data-step={s.n} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", marginTop: 8, background: CHIP[tone].color, boxShadow: `0 0 0 3px ${CHIP[tone].bg}`, flexShrink: 0 }} />
                    {!last ? <span style={{ width: 1, flex: 1, background: "var(--gk-line)", marginTop: 4 }} /> : null}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: last ? 0 : 16, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, color: "var(--gk-fg)" }}>{stepTitle(s)}</span>
                      {verdict ? <Chip tone={tone}>{verdict.ok ? "passed every pair" : "not yet"}</Chip> : null}
                      <span className="gk-sub">step {s.n}</span>
                    </div>
                    {s.text ? (
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--gk-dim)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>{oneLine(s.text, 400)}</p>
                    ) : null}
                    {s.results.map((r, j) =>
                      r.reasons.length ? (
                        <ul key={`r${j}`} style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "var(--gk-fg)", display: "flex", flexDirection: "column", gap: 2 }}>
                          {r.reasons.slice(0, 3).map((x, k) => (
                            <li key={k}>{x}</li>
                          ))}
                        </ul>
                      ) : null,
                    )}
                    {s.calls.length ? (
                      <details style={{ fontSize: 12 }}>
                        <summary style={{ cursor: "pointer", color: "var(--gk-dimmer)" }}>raw</summary>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6 }}>
                          {s.calls.map((c, j) => (
                            <span key={`c${j}`} className="gk-mono" style={{ color: "var(--gk-dimmer)", wordBreak: "break-word" }}>
                              {c.name}({oneLine(c.input, ARG_CHARS)})
                            </span>
                          ))}
                          {s.results.map((r, j) => (
                            <span key={`o${j}`} className="gk-mono" style={{ color: "var(--gk-dimmer)", wordBreak: "break-word" }}>
                              {oneLine(r.output, RESULT_CHARS)}
                            </span>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: 24, alignItems: "start" }}>
        <Card title={gate?.pass ? "Rule" : "Proposal"} sub={proposal ? "the rule and the program it submitted" : null}>
          {proposal ? (
            <>
              <span style={{ fontSize: 20, lineHeight: 1.3, fontWeight: 500 }}>{typeof proposal.rule === "string" ? proposal.rule : <span style={{ color: "var(--gk-dimmer)" }}>no rule sentence</span>}</span>
              <pre className="gk-pre" style={{ maxHeight: 460 }}>
                {typeof proposal.program === "string" ? proposal.program : "no program"}
              </pre>
            </>
          ) : (
            <span className="gk-label">{t?.blockReason ? `blocked: ${t.blockReason}` : t?.status === "claimed" ? "nothing submitted yet" : "no proposal"}</span>
          )}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Card title="Gate" sub="deterministic, the same checks for every agent">
            {!gate && t?.blockReason ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <Chip tone="dead">blocked</Chip>
                <span>{t.blockReason}</span>
              </div>
            ) : !gate ? (
              <span className="gk-label">no verdict yet</span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <Chip tone={gate.pass ? "solved" : "retry"}>{gate.pass ? "pass" : "fail"}</Chip>
                </div>
                {Object.entries(gate.checks ?? {}).map(([kind, c]) => (
                  <div key={kind} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12, alignItems: "baseline", padding: "6px 0", borderTop: "1px solid var(--gk-line-soft)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c.pass ? "var(--gk-solved)" : "var(--gk-retry)" }} />
                      <span className="gk-mono">{kind}</span>
                    </span>
                    <span style={{ fontSize: 14, color: c.pass ? "var(--gk-dimmer)" : "var(--gk-fg)" }}>{c.reasons.join("; ") || (c.pass ? "ok" : "failed")}</span>
                  </div>
                ))}
                {!Object.keys(gate.checks ?? {}).length && gate.reasons.length ? <span style={{ fontSize: 14 }}>{gate.reasons.join("; ")}</span> : null}
              </div>
            )}
          </Card>

          <Card title="What happened next">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              {run?.enrichment ? <span style={{ color: "var(--gk-dim)", lineHeight: 1.45 }}>{run.enrichment.gist}</span> : null}
              {t?.status === "merged" ? <span style={{ color: "var(--gk-solved)" }}>Solved. Its rule is now in the library for every agent.</span> : null}
              {t?.status === "claimed" ? <span style={{ color: "var(--gk-working)" }}>{agent} is still working on it.</span> : null}
              {next ? (
                <Link href={`/task/${next.id}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: next.status === "merged" ? "var(--gk-solved)" : next.status === "claimed" ? "var(--gk-working)" : "var(--gk-retry)" }} />
                  <span>
                    attempt {next.attempt} started at {hhmm(next.createdAt)}
                    {next.hint ? `, with what went wrong` : ""}
                  </span>
                  <span className="gk-sub">open</span>
                </Link>
              ) : t && t.status !== "claimed" && t.status !== "merged" ? (
                <span style={{ color: "var(--gk-dimmer)" }}>no later attempt on this puzzle yet</span>
              ) : null}
              {run ? (
                <span className="gk-sub">
                  record written {hhmmss(run.createdAt)}
                  {outcome ? ` · ${outcome}` : ""} · <Link href={`/library/${run.id}`}>library entry</Link>
                </span>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <Card title="Live progress" sub={t ? `${t.progress.length} lines · step ${t.step ?? "-"}` : null}>
        <ProgressList lines={t?.progress ?? []} />
      </Card>
    </main>
  );
}
