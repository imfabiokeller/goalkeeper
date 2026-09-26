// Pure helpers behind the stage cards and the expanded card: the agent
// name, the per pair verdicts, the note and footer lines, the control
// line. No React, no fetch; the pages hand these the payloads.

import { diffCells } from "./arc.tsx";
import type { ActualOutput, CardStatus, Grid, Precedent, StageCard, UnitPayload } from "./types.ts";

// "w-06" reads "agent 6"; our ids like "w-2196so" read "agent 96so" (last four).
export function agentName(worker: string | null | undefined): string {
  if (!worker) return "an agent";
  const m = /^w-0*([0-9a-z]+)$/i.exec(worker);
  if (!m) return `agent ${worker}`;
  const id = m[1]!;
  return `agent ${id.length > 4 ? id.slice(-4) : id}`;
}

export const ATTEMPTS_MAX = 5;
export const STEPS_MAX = 20;

export type PairState = "match" | "differ" | "none";

export type PairVerdict = { state: PairState; differing: number; actual: Grid | null; expected: Grid; input: Grid };

export function pairVerdicts(train: UnitPayload["train"], actual: ActualOutput[] | null | undefined): PairVerdict[] {
  return train.map((p, i) => {
    const a = actual?.[i] ?? null;
    if (!a || !a.ok) return { state: "none", differing: 0, actual: null, expected: p.output, input: p.input };
    const differing = diffCells(a.output, p.output).length;
    return { state: differing === 0 ? "match" : "differ", differing, actual: a.output, expected: p.output, input: p.input };
  });
}

// The pair to show on a card: the first failing pair, else pair 1.
export function shownPair(pairs: PairVerdict[]): number {
  const i = pairs.findIndex((p) => p.state === "differ");
  return i === -1 ? 0 : i;
}

export const STATUS_LABEL: Record<CardStatus, string> = {
  solved: "Solved",
  working: "Working",
  resumed: "Resumed",
  retrying: "Retrying",
  merged: "Passed examples",
  stopped: "Agent stopped",
  blocked: "Blocked",
};

// The note under the grids: what the pairs say, in plain words.
export function noteLine(card: StageCard, pairs: PairVerdict[]): string {
  const n = pairs.length;
  const matched = pairs.filter((p) => p.state === "match").length;
  const tried = pairs.filter((p) => p.state !== "none").length;
  if (card.status === "stopped") return `${agentName(card.worker)} stopped at step ${card.step ?? 0} · puzzle back in the queue`;
  if (card.status === "resumed") return `${agentName(card.lastWorker)} died · picked up again, nothing lost`;
  if (card.status === "solved") return `all ${n} pairs match · hidden test passed`;
  if (card.status === "merged") return `all ${n} pairs match · hidden test not passed`;
  if (card.status === "blocked") return card.reason ? `blocked · ${card.reason}` : "blocked by its agent";
  if (tried === 0) {
    if (card.lastTool === "search_library" || card.lastTool === "read_source") return "reading the library";
    if (card.lastTool === "read_input") return "reading the puzzle";
    if (card.status === "retrying") return card.reason ?? `${card.attempt - 1} ${card.attempt - 1 === 1 ? "try" : "tries"} failed`;
    return "no program yet";
  }
  if (matched === n) return `all ${n} pairs match`;
  const firstBad = pairs.findIndex((p) => p.state === "differ");
  if (firstBad !== -1 && matched === 0) {
    const d = pairs[firstBad]!.differing;
    return `pair ${firstBad + 1} · ${d} ${d === 1 ? "cell differs" : "cells differ"}`;
  }
  return `${matched} of ${n} pairs match`;
}

export function noteColor(status: CardStatus): string {
  switch (status) {
    case "solved":
      return "var(--status-solved-text)";
    case "retrying":
      return "var(--status-retrying-text)";
    case "merged":
      return "var(--status-merged-text)";
    case "stopped":
    case "blocked":
      return "var(--status-blocked)";
    default:
      return "var(--fg)";
  }
}

// The footer: one plain sentence about where this puzzle is.
export function footerLine(card: StageCard, pairs: PairVerdict[]): { text: string; color: string } {
  const who = agentName(card.worker);
  const matched = pairs.filter((p) => p.state === "match").length;
  switch (card.status) {
    case "solved":
      return { text: "Solved. Its rule is now in the library for every agent.", color: "var(--status-solved-text)" };
    case "merged":
      return { text: "Right on the examples · wrong on the hidden test", color: "var(--status-merged-text)" };
    case "retrying": {
      const failed = Math.max(1, card.attempt - 1);
      return { text: `${failed} ${failed === 1 ? "try" : "tries"} failed · the next agent starts with what went wrong`, color: "var(--status-retrying-text)" };
    }
    case "stopped":
      return { text: `${who} stopped · puzzle back in the queue, nothing lost`, color: "var(--status-blocked)" };
    case "blocked":
      return { text: `${who} gave up on it · ${card.reason ?? "no reason given"}`, color: "var(--status-blocked)" };
    case "resumed":
      return { text: `${agentName(card.lastWorker)} stopped · ${who} took over, nothing lost`, color: "var(--fg-dim)" };
    default: {
      if (card.lastTool === "submit") return { text: `${who} is handing it in`, color: "var(--fg-dim)" };
      if (card.lastTool === "try_submit") return { text: matched === pairs.length && pairs.length ? `${who} is about to hand it in` : `${who} is testing its program`, color: "var(--fg-dim)" };
      if (card.lastTool === "search_library" || card.lastTool === "read_source") return { text: `${who} is reading before it writes anything`, color: "var(--fg-dim)" };
      if (card.lastTool === "read_input") return { text: `${who} is reading the puzzle`, color: "var(--fg-dim)" };
      if (card.lastTool === "run_program") return { text: `${who} is running its program`, color: "var(--fg-dim)" };
      return { text: `${who} is thinking`, color: "var(--fg-dim)" };
    }
  }
}

export function stepLabel(card: StageCard): string {
  if (card.status === "solved" || card.status === "merged" || card.status === "blocked") return "done";
  if (card.status === "retrying") return "next";
  if (card.status === "stopped") return "";
  return `step ${card.step ?? 0} of ${STEPS_MAX}`;
}

// The control run's line for a card, from GET /api/baseline?key=.
export type ControlResult = {
  gatePass?: boolean | null;
  score?: number | null;
  solvedAt2?: boolean | null;
  firstReason?: string | null;
  attempts?: number | unknown[] | null; // the count, or one entry per try
  pairsOk?: number | null;
  pairs?: number | null;
} | null;

export function controlTries(ctrl: ControlResult | undefined): number {
  if (!ctrl) return 0;
  if (Array.isArray(ctrl.attempts)) return Math.max(1, ctrl.attempts.length);
  return typeof ctrl.attempts === "number" ? Math.max(1, ctrl.attempts) : 1;
}

export function controlLine(ctrl: ControlResult | undefined, pairs: number): string | null {
  if (ctrl === undefined || ctrl === null) return null;
  if (ctrl.score === 1 || ctrl.solvedAt2) return "control: solved";
  const tries = controlTries(ctrl);
  if (typeof ctrl.pairsOk === "number") return `control: ${ctrl.pairsOk} of ${ctrl.pairs ?? pairs} pairs`;
  if (ctrl.gatePass) return "control: passed examples, wrong on the test";
  return `control: not solved in ${tries}`;
}

export function controlOutcome(ctrl: ControlResult | undefined): { text: string; sub: string | null } {
  if (ctrl === undefined) return { text: "control has not tried this puzzle", sub: null };
  if (ctrl === null) return { text: "control has not tried this puzzle", sub: null };
  const tries = controlTries(ctrl);
  if (ctrl.score === 1 || ctrl.solvedAt2) return { text: "Solved", sub: `on try ${tries}` };
  if (ctrl.gatePass) return { text: "Right on the examples · wrong on the hidden test", sub: ctrl.firstReason ?? null };
  return { text: `Not solved after ${tries} ${tries === 1 ? "try" : "tries"}`, sub: ctrl.firstReason ?? null };
}

// A precedent's kind on screen: worked (a solved rule) or dead end.
export function precedentKind(p: Precedent): "worked" | "dead end" {
  if (p.kind === "planner-turn") return "worked";
  if (p.pass === true) return "worked";
  if (p.pass === false) return "dead end";
  if (p.kind === "error") return "dead end";
  return /\b(fail|refut|wrong|block|differ)/i.test(p.gist ?? "") ? "dead end" : "worked";
}

export function shortGist(gist: string | null, max = 140): string {
  if (!gist) return "no summary yet";
  const s = gist.replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
