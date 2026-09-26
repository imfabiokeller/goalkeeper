// Context assembly: pure. Pinned material (goal, task, state, last
// failures) plus the library briefing (grounded sentences and the records
// it cites, context-expanded) into a system prompt and the opening
// messages of the run. Without a briefing the top expanded hits go in
// directly. Every part is capped so the whole stays under 20k tokens for
// the largest fixture input (60k characters).

import type { ModelMessage } from "ai";
import type { Passage } from "./retrieve.ts";
import type { Briefing } from "./synthesize.ts";
import type { Goal, Input, Source, State, Task } from "../shared/types.ts";

export const PAGE_CHARS = 6000;
export const MAX_PASSAGES = 4; // raw hits shown when there is no briefing
export const MAX_CITED = 8; // records a briefing can bring along
export const EXCERPT_CHARS = 1500; // context expansion per record
export const BRIEFING_CHARS = 4000;
export const GIST_CHARS = 300;
export const MAX_FAILURES = 3;
export const MAX_REASON_CHARS = 400;
export const MAX_STATE_CHARS = 4000;
export const MAX_GOAL_LINE_CHARS = 600;
export const MAX_LESSONS_CHARS = 2000; // the digest is capped at this size where it is computed
// Hard ceiling on the system prompt so the estimate can never exceed 20k
// tokens even if a cap above is raised carelessly.
export const MAX_SYSTEM_CHARS = 64_000;

export type AssembleArgs = {
  goal: Goal;
  task: Pick<Task, "key" | "criteria" | "attempt" | "hint">;
  input: Pick<Input, "key" | "name" | "text"> & Partial<Pick<Input, "chars">>;
  state: Pick<State, "data" | "stateVersion" | "version"> | null;
  failures: Array<Pick<Source, "raw" | "createdAt">>;
  passages: Passage[]; // the retrieved, expanded hits
  briefing?: Briefing | null; // synthesized from the hits; null or absent means show the hits
  lessons?: string | null; // metrics.lessons.text, the digest of recent gate verdicts; absent means skip
  page?: number; // 0-based page of the input to pin, default 0
};

export type Assembled = { system: string; messages: ModelMessage[]; contextTokens: number };

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// Reasons of a gate source: `raw.reasons`, or `raw.gate.reasons`.
export function failureReasons(source: Pick<Source, "raw">): string[] {
  const raw = source.raw ?? {};
  const direct = raw.reasons;
  if (Array.isArray(direct)) return direct.filter((r): r is string => typeof r === "string");
  const gate = raw.gate;
  if (gate && typeof gate === "object" && Array.isArray((gate as { reasons?: unknown }).reasons)) {
    return ((gate as { reasons: unknown[] }).reasons).filter((r): r is string => typeof r === "string");
  }
  return [];
}

// The hypothesis a failed proposal stated, if the proposal shape has a
// string field named `rule`: gate sources carry the proposal in
// `raw.proposal`. Pinned as refuted so the next attempt does not retry it.
export function failureRule(source: Pick<Source, "raw">): string | null {
  const proposal = source.raw?.proposal;
  if (!proposal || typeof proposal !== "object") return null;
  const rule = (proposal as { rule?: unknown }).rule;
  return typeof rule === "string" && rule.trim() ? rule.trim() : null;
}

export function inputPage(text: string, offset: number, size = PAGE_CHARS): { text: string; offset: number; total: number; next: number | null } {
  const start = Math.max(0, Math.min(offset, text.length));
  const end = Math.min(text.length, start + size);
  return { text: text.slice(start, end), offset: start, total: text.length, next: end < text.length ? end : null };
}

export function assemble(args: AssembleArgs): Assembled {
  const { goal, task, input, state, passages } = args;
  const page = args.page ?? 0;
  const parts: string[] = [];

  parts.push(
    "You are a worker on a shared goal. You turn one unit of work into a JSON proposal in the shape below and submit it. " +
      "A deterministic gate checks every proposal against the criteria; you can run that gate on a draft with try_submit as often as you like before you submit. " +
      "If you cannot make it pass, call block with the hypotheses you tried; the unit is reopened later once the library has grown. " +
      "You never ask a human.",
  );

  parts.push(`# Goal (version ${goal.version})\n${clip(goal.statement, 2000)}`);
  parts.push(
    "## Criteria (the gate checks these, deterministically)\n" +
      goal.criteria.map((c) => `- ${c.id} [${c.check.kind}]: ${clip(c.text, MAX_GOAL_LINE_CHARS)}`).join("\n"),
  );
  if (goal.guidelines.length) {
    parts.push("## Guidelines\n" + goal.guidelines.map((g) => `- ${clip(g, MAX_GOAL_LINE_CHARS)}`).join("\n"));
  }
  if (goal.outOfScope.length) {
    parts.push("## Out of scope\n" + goal.outOfScope.map((g) => `- ${clip(g, MAX_GOAL_LINE_CHARS)}`).join("\n"));
  }
  if (goal.proposalShape) {
    parts.push("## Proposal shape (submit exactly these fields, these names, these types)\n" + clip(goal.proposalShape, 3000));
  }

  // Derived from the gate's verdicts over the last hours: what fails, why,
  // and what got blocked. Counts, not rules; the goal above is the rule.
  if (args.lessons) {
    parts.push(
      "# Lessons from the record so far (counts derived from recent gate verdicts on all units; avoid the listed failure modes)\n" +
        clip(args.lessons, MAX_LESSONS_CHARS),
    );
  }

  const taskCriteria = task.criteria
    .map((id) => goal.criteria.find((c) => c.id === id))
    .map((c, i) => (c ? `${c.id}: ${clip(c.text, MAX_GOAL_LINE_CHARS)}` : `${task.criteria[i]}: (not in this goal version)`));
  parts.push(
    `# Task\nkey: ${task.key}\nunit: ${input.name}\nattempt: ${task.attempt}\ncriteria:\n` +
      taskCriteria.map((t) => `- ${t}`).join("\n") +
      (task.hint ? `\nHint from the planner: ${clip(task.hint, 4000)}` : ""),
  );

  if (state) {
    parts.push(
      `# Current state for ${task.key} (goal version ${state.version}, state version ${state.stateVersion})\n` +
        clip(JSON.stringify(state.data), MAX_STATE_CHARS),
    );
  } else {
    parts.push(`# Current state for ${task.key}\nnone merged yet`);
  }

  const failures = args.failures.slice(0, MAX_FAILURES);
  if (failures.length) {
    parts.push(
      "# Last gate failures on this key (fix these first; a rule marked refuted did not pass, do not retry it)\n" +
        failures
          .map((f) => {
            const rule = failureRule(f);
            const lines = rule ? [`  refuted: ${clip(rule, MAX_REASON_CHARS)}`] : [];
            lines.push(...failureReasons(f).slice(0, 8).map((r) => `  - ${clip(r, MAX_REASON_CHARS)}`));
            if (!lines.length) lines.push("  - (no reasons recorded)");
            return `- ${f.createdAt.toISOString()}\n${lines.join("\n")}`;
          })
          .join("\n"),
    );
  }

  const record = (p: Passage) => {
    const head = `[${p.id}] ${p.kind}${p.key ? ` on ${p.key}` : ""}`;
    const gist = p.gist ? `\ngist: ${clip(p.gist, GIST_CHARS)}` : "";
    return `${head}${gist}\nrecord: ${clip(p.excerpt.replace(/\s+/g, " "), EXCERPT_CHARS)}`;
  };
  const briefing = args.briefing && args.briefing.text ? args.briefing : null;
  if (briefing) {
    const cited = briefing.cited.slice(0, MAX_CITED);
    parts.push(
      "# Library briefing (what earlier runs on other units show; every sentence cites its records)\n" +
        clip(briefing.text, BRIEFING_CHARS) +
        (cited.length ? "\n\n## Cited records\n" + cited.map(record).join("\n\n") : ""),
    );
  } else {
    const shown = passages.slice(0, MAX_PASSAGES);
    if (shown.length) {
      parts.push(
        "# Library records (precedents from other units, retrieved; may or may not apply)\n" + shown.map(record).join("\n\n"),
      );
    }
  }

  const pg = inputPage(input.text, page * PAGE_CHARS);
  parts.push(
    `# Input text, characters ${pg.offset} to ${pg.offset + pg.text.length} of ${pg.total}${pg.next !== null ? ` (call read_input with offset ${pg.next} for the next page)` : " (complete)"}\n` +
      pg.text,
  );

  parts.push(
    "# How to work\n" +
      "1. Read the input. Call read_input({ offset }) to page through the rest when this page is not the whole input.\n" +
      "2. State the rule you believe explains the unit, in one sentence, then write the draft proposal that applies it. " +
      "Call read_state({ key }) or search_library({ query }) only if they help.\n" +
      "3. Test your draft with try_submit({ proposal }). It runs the gate and returns pass, reasons and the per-check verdicts; nothing is recorded.\n" +
      "4. If it fails, read the reasons, fix the draft (or state a different rule when the reasons refute this one) and test again. Repeat until try_submit passes.\n" +
      "5. Finish with exactly one call to submit({ proposal }) with the passing draft, or block({ reason }). Never both, never neither.\n" +
      "Never submit a draft that try_submit has not passed. Never retry a rule that is listed as refuted above. " +
      "Block only when three different rules have been refuted; until then, keep testing. " +
      "A block reason lists the hypotheses you tried and why each failed; the unit is reopened later once the library has grown. " +
      "The proposal's key equals the task key and its fields follow the proposal shape exactly.",
  );

  let system = parts.join("\n\n");
  if (system.length > MAX_SYSTEM_CHARS) system = system.slice(0, MAX_SYSTEM_CHARS);

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: `Work on ${task.key} (${input.name}). Read what you need, then call submit or block.`,
    },
  ];

  const contextTokens = estimateTokens(system + messages.map((m) => (typeof m.content === "string" ? m.content : "")).join(""));
  return { system, messages, contextTokens };
}
