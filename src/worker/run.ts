// The agent loop: one generateText call with tools and a step budget. The
// terminal outcome (submit or block) is recorded in a closure by the tool
// itself, so the loop stops on the first of them and the caller reads a
// plain value. The model is injectable so tests use a mock.

import { generateText, hasToolCall, stepCountIs, tool, type LanguageModel, type ModelMessage, type StepResult } from "ai";
import { z } from "zod";
import { inputPage, PAGE_CHARS } from "../context/assemble.ts";
import type { Passage } from "../context/retrieve.ts";
import { workerModel } from "../shared/llm.ts";
import { BlockArgs, SubmitArgs, type GateResult } from "../shared/types.ts";

export const MAX_STEPS = 20;

export type RunOutcome =
  | { type: "submit"; proposal: Record<string, unknown> }
  | { type: "block"; reason: string }
  | { type: "fail"; reason: string };

export type RunCtx = {
  system: string;
  messages: ModelMessage[];
  inputText: string;
  readState: (key: string) => Promise<unknown | null>;
  search: (query: string) => Promise<Passage[]>;
  // The gate on a draft: same checks, same input and state as the real
  // gate after submit. Records nothing.
  dryRun: (proposal: Record<string, unknown>) => GateResult;
  model?: LanguageModel;
  abortSignal?: AbortSignal;
  maxSteps?: number;
};

export type StepRecord = {
  text: string;
  toolCalls: Array<{ name: string; input: unknown }>;
  toolResults: Array<{ name: string; output: unknown }>;
  finishReason: string;
  usage: { in: number; out: number };
};

export type RunResult = {
  outcome: RunOutcome;
  steps: StepRecord[];
  messages: ModelMessage[]; // the assistant and tool messages the run produced
  usage: { in: number; out: number };
  finishReason: string;
};

const RESULT_CHARS = 2000; // how much of a tool output the run record keeps

function truncate(v: unknown): unknown {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (s === undefined) return v;
  return s.length > RESULT_CHARS ? s.slice(0, RESULT_CHARS) + "…" : v;
}

function recordStep(step: StepResult<never, never>): StepRecord {
  return {
    text: step.text,
    toolCalls: step.toolCalls.map((t) => ({ name: t.toolName, input: t.input })),
    toolResults: step.toolResults.map((t) => ({ name: t.toolName, output: truncate(t.output) })),
    finishReason: step.finishReason,
    usage: { in: step.usage.inputTokens ?? 0, out: step.usage.outputTokens ?? 0 },
  };
}

export async function runTask(ctx: RunCtx): Promise<RunResult> {
  let outcome: RunOutcome | null = null;

  const tools = {
    read_input: tool({
      description: `Read a page of the input text: ${PAGE_CHARS} characters from offset, with the total length.`,
      inputSchema: z.object({ offset: z.number().int().min(0).default(0) }),
      execute: async ({ offset }) => inputPage(ctx.inputText, offset),
    }),
    read_state: tool({
      description: "The merged proposal for a key, or null if nothing is merged yet.",
      inputSchema: z.object({ key: z.string() }),
      execute: async ({ key }) => ({ key, state: await ctx.readState(key) }),
    }),
    search_library: tool({
      description: "Search the shared library of past runs and gate results for precedents. Returns gists and excerpts.",
      inputSchema: z.object({ query: z.string().min(1) }),
      execute: async ({ query }) => {
        const passages = await ctx.search(query);
        return { passages: passages.map((p) => ({ kind: p.kind, key: p.key, gist: p.gist, excerpt: p.excerpt })) };
      },
    }),
    try_submit: tool({
      description:
        "Test a draft proposal against the gate: runs the same deterministic checks submit will face and returns { pass, reasons, checks }. " +
        "Records nothing, so call it as often as needed; fix the draft until it passes, then call submit with the passing draft.",
      inputSchema: SubmitArgs,
      execute: async ({ proposal }) => {
        const r = ctx.dryRun(proposal);
        return { pass: r.pass, reasons: r.reasons, checks: r.checks };
      },
    }),
    submit: tool({
      description:
        "Submit the finished proposal for this task; the gate runs on it and the outcome is recorded. Call it once, as the last step, after try_submit passes.",
      inputSchema: SubmitArgs,
      execute: async ({ proposal }) => {
        if (outcome) return "already recorded";
        outcome = { type: "submit", proposal };
        return "recorded";
      },
    }),
    block: tool({
      description:
        "Give up on this task with a short reason a human can act on (missing data, ambiguity, out of scope). Only after several refuted attempts. Call it once, as the last step.",
      inputSchema: BlockArgs,
      execute: async ({ reason }) => {
        if (outcome) return "already recorded";
        outcome = { type: "block", reason };
        return "recorded";
      },
    }),
  };

  const result = await generateText({
    model: ctx.model ?? workerModel(),
    system: ctx.system,
    messages: ctx.messages,
    tools,
    stopWhen: [stepCountIs(ctx.maxSteps ?? MAX_STEPS), hasToolCall("submit"), hasToolCall("block")],
    maxOutputTokens: 4000, // a proposal plus reasoning, never the model's default ceiling
    abortSignal: ctx.abortSignal,
  });

  const steps = result.steps.map((s) => recordStep(s as unknown as StepResult<never, never>));
  return {
    outcome: outcome ?? { type: "fail", reason: "no submit or block within the step budget" },
    steps,
    messages: result.response.messages,
    usage: { in: result.totalUsage.inputTokens ?? 0, out: result.totalUsage.outputTokens ?? 0 },
    finishReason: result.finishReason,
  };
}
