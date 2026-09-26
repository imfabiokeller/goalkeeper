"use client";

// The expanded card, the mockup's overlay body: every pair with the
// agent's try, the rule, the precedents with their gist, the control
// comparison, what it read, the attempts, and the link to the task.
// Used by the stage overlay (?open=key) and the standalone /unit/[key].

import Link from "next/link";
import { agentName, controlOutcome, controlTries, pairVerdicts, precedentKind, shortGist, type ControlResult } from "../lib/cards.ts";
import { compact, hhmm } from "../lib/format.ts";
import { contextSections } from "../lib/transcript.ts";
import type { CardStatus, StageCard, TaskPayload, UnitPayload, UnitTask } from "../lib/types.ts";
import { Arrow, Cells, Dot, NoGrid, Thumb } from "./Cells.tsx";
import { Chip } from "./Chip.tsx";

// The card status of a unit on its own, when the stage did not hand one over.
export function unitCardStatus(u: UnitPayload, resumedWithin = 120_000, now = Date.now()): CardStatus {
  if (u.state) return u.state.score === 1 ? "solved" : "merged";
  const t = u.tasks.at(-1);
  if (!t) return "working";
  if (t.status === "claimed") return "working";
  if (t.status === "blocked" || t.status === "parked") return "blocked";
  if (t.status === "open" && (t.hint || (t.gate && !t.gate.pass) || t.attempt > 1)) return "retrying";
  void resumedWithin;
  void now;
  return "working";
}

function attemptRow(t: UnitTask, solvedKey: boolean, isLast: boolean): { out: string; why: string; c: string; w: string } {
  const w = agentName(t.worker);
  if (t.status === "claimed") return { out: "working", why: `step ${t.step ?? 0} of 20`, c: "#5b7cfa", w };
  if (t.status === "merged") return solvedKey && isLast ? { out: "solved", why: "hidden test passed", c: "#4a8f67", w } : { out: "passed examples", why: "wrong on the hidden test", c: "#2f8f8a", w };
  if (t.status === "blocked" || t.status === "parked") return { out: "gave up", why: t.blockReason ?? "", c: "#f07178", w };
  if (t.gate && !t.gate.pass) return { out: "failed", why: t.gate.reasons[0] ?? "", c: "#c29a3a", w };
  if (t.hint) return { out: "reopened", why: t.hint, c: "#c29a3a", w };
  return { out: t.status, why: "", c: "#8f8f8f", w };
}

const H: React.CSSProperties = { fontSize: 15, color: "#e6e6e6" };
const SUB: React.CSSProperties = { fontSize: 13, color: "var(--fg-dimmer)" };

export function Expanded({ card, unit, control, task, onClose, contextAvg }: { card: StageCard | null; unit: UnitPayload | null; control: ControlResult | undefined; task: TaskPayload | null; onClose?: () => void; contextAvg: number | null }) {
  if (!unit) {
    return (
      <div style={{ padding: 30, color: "var(--fg-dimmer)" }}>
        {card?.key ?? ""} loading
      </div>
    );
  }
  const status = card?.status ?? unitCardStatus(unit);
  const last = unit.tasks.at(-1) ?? null;
  const attempt = card?.attempt ?? last?.attempt ?? 1;
  const worker = card?.worker ?? last?.worker ?? null;
  const pairs = pairVerdicts(unit.train, unit.latest?.actual);
  const rule = unit.state?.rule ?? unit.latest?.rule ?? null;
  const ruleLabel = status === "solved" || status === "merged" ? "Rule" : "Current hypothesis";
  const precedents = unit.latest?.precedents ?? [];
  const refuted = unit.latest?.refutedRules ?? [];
  const sections = contextSections(typeof task?.run?.raw.system === "string" ? task.run.raw.system : null).filter((s) => s.label !== "preamble");
  const readTokens = typeof task?.run?.raw.contextTokens === "number" ? task.run.raw.contextTokens : sections.reduce((n, s) => n + s.tokens, 0);
  const ctrl = controlOutcome(control);
  const ours = (() => {
    const matched = pairs.filter((p) => p.state === "match").length;
    if (status === "solved") return { text: `Solved on attempt ${attempt}`, c: "#6fbf8e" };
    if (status === "merged") return { text: "All pairs right · wrong on the hidden test", c: "#5fb8b3" };
    if (status === "retrying") return { text: `${Math.max(1, attempt - 1)} ${attempt - 1 === 1 ? "try" : "tries"} failed · attempt ${attempt} next`, c: "#d9b45a" };
    if (status === "stopped") return { text: "Its agent stopped · back in the queue", c: "#f07178" };
    if (status === "blocked") return { text: "Its agent gave up", c: "#f07178" };
    if (!pairs.some((p) => p.state !== "none")) return { text: "Still reading its lessons", c: "#ededed" };
    return { text: `${matched} of ${pairs.length} pairs right, still working`, c: "#ededed" };
  })();
  const tryDots = (n: number, c: string, total = 5) => Array.from({ length: total }, (_, i) => (i < n ? { c, b: c } : { c: "transparent", b: "#333333" }));
  const oursTries = unit.tasks.map((t) => {
    const r = attemptRow(t, status === "solved", t.id === last?.id);
    return { c: r.c, b: r.c };
  });
  const ctrlN = controlTries(control);
  const ctrlTries = tryDots(ctrlN, control?.score === 1 || control?.solvedAt2 ? "#4a8f67" : "#c29a3a");
  const cmpNote =
    control === undefined || control === null
      ? "Same puzzle, same model: the difference is the library and the tools. The control has not reached this puzzle yet."
      : status === "solved" && !(control.score === 1 || control.solvedAt2)
        ? `goalkeeper solved it on attempt ${attempt}; the control starts every try from a blank page.`
        : "Same puzzle, same model: the difference is the library and the tools.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 30, fontWeight: 500 }}>{unit.key}</span>
          <Chip status={status} size="lg" />
          <span style={{ fontSize: 16, color: "var(--fg-dimmer)" }}>
            attempt {attempt}
            {attempt <= 5 ? " of 5" : ""}
          </span>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 40, height: 40, borderRadius: 10, background: "transparent", border: "1px solid #333", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#ededed" strokeWidth="1.6">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        ) : (
          <Link href="/" style={{ fontSize: 14, color: "var(--fg-dim)", textDecoration: "none" }}>
            back to the stage
          </Link>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 40 }}>
        <div style={{ width: 600, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, minHeight: 0, overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "56px 1fr 24px 1fr 1fr", gap: 12, fontSize: 13, color: "var(--fg-dimmer)" }}>
            <span />
            <span>example</span>
            <span />
            <span>expected</span>
            <span>agent’s try</span>
          </div>
          {pairs.map((p, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "56px 1fr 24px 1fr 1fr", gap: 12, alignItems: "center", paddingBottom: 12, borderBottom: "1px solid #161616" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 14, color: "var(--fg-dim)" }}>pair {i + 1}</span>
                <Dot state={p.state} size={10} />
              </div>
              <Cells grid={p.input} box={103} max={16} />
              <Arrow width={24} />
              <Cells grid={p.expected} box={103} max={16} />
              {p.actual ? <Cells grid={p.actual} diff={p.expected} box={103} max={16} /> : <NoGrid box={103} fontSize={13} />}
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
            <span style={SUB}>{ruleLabel}</span>
            <span style={{ fontSize: 20, lineHeight: 1.3, fontWeight: 500 }}>{rule ?? "No rule yet. The agent is still reading."}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={H}>{status === "retrying" ? "Carrying forward what went wrong" : "Learning from other puzzles"}</span>
              <span style={SUB}>most similar first</span>
            </div>
            {status === "retrying"
              ? refuted.map((r, j) => (
                  <div key={`r${j}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", border: "1px solid #2e2612", borderRadius: 10, background: "#050505" }}>
                    <Thumb grid={unit.train[0]?.output ?? null} cell={6} tone="#2e2612" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                      <span style={{ fontSize: 15, color: "#a1a1a1", textDecoration: "line-through", textDecorationColor: "#6b5a2a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r}</span>
                      <span style={SUB}>
                        <span style={{ color: "#d9b45a" }}>a dead end</span> · its own earlier try
                      </span>
                    </div>
                  </div>
                ))
              : null}
            {precedents.map((p) => {
              const worked = precedentKind(p) === "worked";
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", border: `1px solid ${worked ? "#1d3527" : "#2e2612"}`, borderRadius: 10, background: "#050505" }}>
                  <Thumb grid={p.thumb} cell={6} tone={worked ? "#1d3527" : "#2e2612"} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 15, color: worked ? "#ededed" : "#a1a1a1", textDecoration: worked ? "none" : "line-through", textDecorationColor: "#6b5a2a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shortGist(p.gist)}</span>
                    <span style={SUB}>
                      <span style={{ color: worked ? "#6fbf8e" : "#d9b45a" }}>{worked ? "a rule that worked" : "a dead end"}</span> · found by {agentName(p.worker)}
                      {p.key ? ` on puzzle ${p.key}` : ""}
                      {p.at ? ` at ${hhmm(p.at)}` : ""}
                      {p.score !== null ? ` · ${p.score.toFixed(2)}` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
            {!precedents.length && !(status === "retrying" && refuted.length) ? <span style={SUB}>{status === "working" || status === "resumed" ? "still pulling lessons from the library" : "this attempt read no precedents"}</span> : null}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 22, minHeight: 0, overflow: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, border: "1px solid #1f1f1f", borderRadius: 14, background: "#050505", padding: "18px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 17, fontWeight: 500 }}>Compared with the control</span>
              <span style={SUB}>same puzzle, same model, same two attempts on the hidden test · the control agent has no library and never runs its program</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, border: "1px solid #1f2a23", borderRadius: 10, background: "#08100b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 16, borderTop: "2px solid #6fbf8e" }} />
                  <span style={{ fontSize: 14, color: "#ededed" }}>goalkeeper · with the library</span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {pairs[0]?.actual ? <Cells grid={pairs[0].actual} diff={pairs[0].expected} box={79} max={12} /> : <NoGrid box={79} text="no try yet" />}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 15, lineHeight: 1.35, color: ours.c }}>{ours.text}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[...oursTries, ...tryDots(0, "", 5)].slice(0, 5).map((d, i) => (
                        <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: d.c, boxShadow: `inset 0 0 0 1px ${d.b}` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--fg-dimmer)" }}>
                      read {precedents.length} {precedents.length === 1 ? "lesson" : "lessons"}
                      {readTokens ? ` · ${compact(readTokens)} tokens this try` : contextAvg ? ` · ${compact(contextAvg)} tokens a try` : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, border: "1px solid #1f1f1f", borderRadius: 10, background: "#0a0a0a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 16, borderTop: "2px dashed #8f8f8f" }} />
                  <span style={{ fontSize: 14, color: "#a1a1a1" }}>control · no library</span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <NoGrid box={79} text={control ? "no grid kept" : "no try yet"} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 15, lineHeight: 1.35, color: "#a1a1a1" }}>{ctrl.text}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {ctrlTries.map((d, i) => (
                        <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: d.c, boxShadow: `inset 0 0 0 1px ${d.b}` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--fg-dimmer)" }}>{ctrl.sub ?? "reads only the puzzle"}</span>
                  </div>
                </div>
              </div>
            </div>
            <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--fg-dim)" }}>{cmpNote}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={H}>What it read</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--fg-dimmer)" }}>{task?.run ? `${readTokens.toLocaleString("en-US")} tokens · built fresh` : last?.status === "claimed" ? "written when the attempt ends" : "no run recorded"}</span>
            </div>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              {sections.map((s) => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 16, color: /library|precedent|lesson/i.test(s.label) ? "#e6e6e6" : "#a1a1a1" }}>{compact(s.tokens)}</span>
                  <span style={{ fontSize: 12, color: "var(--fg-dimmer)" }}>
                    {s.label
                      .replace(/\s*\(.*\)$/, "")
                      .replace(/,\s*characters.*$/i, "")
                      .replace(/\s+for\s+[0-9a-f]{8}$/i, "")
                      .replace(/^input text$/i, "the puzzle")
                      .replace(/^library records$/i, "from the library")
                      .toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 14, color: "var(--fg-dim)" }}>Attempts</span>
            {unit.tasks.map((t) => {
              const r = attemptRow(t, status === "solved", t.id === last?.id);
              return (
                <Link key={t.id} href={`/task/${t.id}`} style={{ display: "grid", gridTemplateColumns: "24px 110px 1fr", gap: 12, alignItems: "center", padding: "7px 0", borderBottom: "1px solid #161616", textDecoration: "none" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--fg-dimmer)" }}>{t.attempt}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--fg-dim)" }}>{r.w}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, minWidth: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: r.c, flexShrink: 0 }} />
                    <span>{r.out}</span>
                    <span style={{ color: "var(--fg-dimmer)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.why}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {last ? (
            <Link href={`/task/${last.id}`} style={{ marginTop: "auto", alignSelf: "flex-start", height: 42, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", border: "1px solid #333", borderRadius: 10, textDecoration: "none", fontSize: 15 }}>
              See everything {agentName(worker)} read and did, step by step
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#ededed" strokeWidth="1.6">
                <path d="M4 8h8M9 5l3 3-3 3" />
              </svg>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
