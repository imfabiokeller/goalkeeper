// Writes to the library: one raw, append-only source per run, per gate
// failure and per error. Enrichment (gist, entities, labels, embedding) is
// computed inline and never blocks a write: any failure yields null and
// the planner backfill fills it in later.

import { generateText, Output, type LanguageModel, type ModelMessage } from "ai";
import { z } from "zod";
import { ObjectId } from "mongodb";
import type { Collections } from "../shared/db.ts";
import { costUsd, embedText, enrichModel } from "../shared/llm.ts";
import type { Enrichment, GateResult, Source, Task } from "../shared/types.ts";
import type { Briefing } from "../context/synthesize.ts";
import type { RunOutcome, StepRecord } from "./run.ts";

export type EnrichFn = (text: string) => Promise<Enrichment | null>;

export type EnrichOptions = {
  model?: LanguageModel;
  embed?: (text: string) => Promise<number[]>;
};

const EnrichmentShape = z.object({
  gist: z.string().describe("One or two sentences: what happened and what the next worker should learn from it."),
  entities: z.object({
    keys: z.array(z.string()).describe("Unit keys mentioned, like aapl-2026-07-30"),
    fields: z.array(z.string()).describe("Proposal fields mentioned, like revenue or dilutedEps"),
  }),
  labels: z.array(z.string()).describe("Short tags: pass, fail, blocked, table-scale, non-gaap, bank, fiscal-year, ..."),
});

const ENRICH_CHARS = 12_000;
const MAX_TEXT_CHARS = 60_000;

// One model call plus one embedding. Exported so the planner backfill uses
// the same enrichment as the worker. Never throws.
export async function enrich(text: string, opts: EnrichOptions = {}): Promise<Enrichment | null> {
  try {
    const { output } = await generateText({
      model: opts.model ?? enrichModel(),
      output: Output.object({ schema: EnrichmentShape, name: "enrichment" }),
      maxOutputTokens: 800,
      system:
        "You index records of an extraction pipeline for retrieval. Summarize the record for a future worker on a different unit: what was tried, what the gate said, what generalizes.",
      prompt: text.slice(0, ENRICH_CHARS),
    });
    const embedding = await (opts.embed ?? embedText)(`${output.gist}\n${text}`);
    return { ...output, embedding };
  } catch {
    return null;
  }
}

// The planner backfill's shape: enrich a whole source, throw when it
// cannot, so the planner records the failure instead of looping silently.
export async function enrichSource(source: Pick<Source, "_id" | "text">, fn: EnrichFn = enrich): Promise<Enrichment> {
  const enrichment = await fn(source.text);
  if (!enrichment) throw new Error(`enrichment failed for source ${String(source._id)}`);
  return enrichment;
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

function messageText(m: ModelMessage): string {
  if (typeof m.content === "string") return `${m.role}: ${m.content}`;
  const parts = m.content.map((p) => {
    switch (p.type) {
      case "text":
        return p.text;
      case "tool-call":
        return `call ${p.toolName}(${JSON.stringify(p.input)})`;
      case "tool-result":
        return `result ${p.toolName}: ${JSON.stringify(p.output)}`;
      case "reasoning":
        return p.text;
      default:
        return "";
    }
  });
  return `${m.role}: ${parts.filter(Boolean).join("\n")}`;
}

// The flattened text of a run: outcome first, then gate, then the steps,
// then the conversation. The text index and the enrichment read this.
export function flattenRun(args: {
  key: string;
  outcome: RunOutcome;
  gate: GateResult | null;
  steps: StepRecord[];
  messages: ModelMessage[];
}): string {
  const lines: string[] = [`key: ${args.key}`];
  switch (args.outcome.type) {
    case "submit":
      lines.push(`outcome: submit`, `proposal: ${JSON.stringify(args.outcome.proposal)}`);
      break;
    case "block":
      lines.push(`outcome: block`, `reason: ${args.outcome.reason}`);
      break;
    case "fail":
      lines.push(`outcome: fail`, `reason: ${args.outcome.reason}`);
  }
  if (args.gate) {
    lines.push(`gate: ${args.gate.pass ? "pass" : "fail"}`);
    for (const r of args.gate.reasons) lines.push(`gate reason: ${r}`);
  }
  args.steps.forEach((s, i) => {
    lines.push(`step ${i + 1} (${s.finishReason})`);
    if (s.text) lines.push(s.text);
    for (const t of s.toolCalls) lines.push(`call ${t.name}(${JSON.stringify(t.input)})`);
  });
  for (const m of args.messages) lines.push(messageText(m));
  return clip(lines.join("\n"), MAX_TEXT_CHARS);
}

export type WriteRunArgs = {
  task: Pick<Task, "_id" | "key" | "version">;
  system: string;
  messages: ModelMessage[]; // the opening messages
  responseMessages: ModelMessage[]; // what the run produced
  steps: StepRecord[];
  outcome: RunOutcome;
  gate: GateResult | null;
  usage: { in: number; out: number };
  contextTokens?: number;
  retrievalDegraded?: boolean;
  reranked?: boolean;
  briefing?: Briefing | null;
  worker: string;
  enrich?: EnrichFn;
};

export async function writeRun(c: Collections, args: WriteRunArgs): Promise<ObjectId> {
  const text = flattenRun({
    key: args.task.key,
    outcome: args.outcome,
    gate: args.gate,
    steps: args.steps,
    messages: args.responseMessages,
  });
  const enrichment = await (args.enrich ?? enrich)(text);
  const briefingTokens = args.briefing?.tokens ?? { in: 0, out: 0 };
  const raw: Record<string, unknown> = {
    worker: args.worker,
    system: args.system,
    messages: [...args.messages, ...args.responseMessages],
    steps: args.steps,
    outcome: args.outcome.type,
    gate: args.gate,
    contextTokens: args.contextTokens ?? null,
    retrievalDegraded: args.retrievalDegraded ?? false,
    reranked: args.reranked ?? false,
    briefing: args.briefing ? { text: args.briefing.text, cited: args.briefing.cited.map((p) => p.id), tokens: args.briefing.tokens } : null,
  };
  if (args.outcome.type === "submit") raw.proposal = args.outcome.proposal;
  else if (args.outcome.type === "block") raw.blockReason = args.outcome.reason;
  else raw.failReason = args.outcome.reason;

  const r = await c.sources.insertOne({
    _id: new ObjectId(),
    kind: "worker-run",
    taskId: args.task._id,
    key: args.task.key,
    version: args.task.version,
    raw,
    text,
    enrichment,
    tokens: {
      in: args.usage.in + briefingTokens.in,
      out: args.usage.out + briefingTokens.out,
      cost: costUsd("worker", args.usage.in, args.usage.out) + costUsd("enrich", briefingTokens.in, briefingTokens.out),
    },
    createdAt: new Date(),
  });
  return r.insertedId;
}

export async function writeGateSource(
  c: Collections,
  args: { task: Pick<Task, "_id" | "key" | "version" | "attempt">; gate: GateResult; proposal: unknown; worker: string; enrich?: EnrichFn },
): Promise<ObjectId> {
  const text = [
    `key: ${args.task.key}`,
    `gate: ${args.gate.pass ? "pass" : "fail"} on attempt ${args.task.attempt}`,
    ...args.gate.reasons.map((r) => `reason: ${r}`),
    `proposal: ${JSON.stringify(args.proposal)}`,
  ].join("\n");
  const enrichment = await (args.enrich ?? enrich)(text);
  const r = await c.sources.insertOne({
    _id: new ObjectId(),
    kind: "gate",
    taskId: args.task._id,
    key: args.task.key,
    version: args.task.version,
    raw: { worker: args.worker, attempt: args.task.attempt, gate: args.gate, reasons: args.gate.reasons, proposal: args.proposal },
    text: clip(text, MAX_TEXT_CHARS),
    enrichment,
    tokens: { in: 0, out: 0, cost: 0 },
    createdAt: new Date(),
  });
  return r.insertedId;
}

export async function writeErrorSource(
  c: Collections,
  args: { task: Pick<Task, "_id" | "key" | "version"> | null; worker: string; error: unknown; where: string },
): Promise<ObjectId> {
  const err = args.error instanceof Error ? args.error : new Error(String(args.error));
  const text = `error in ${args.where}${args.task ? ` on ${args.task.key}` : ""}: ${err.message}`;
  const r = await c.sources.insertOne({
    _id: new ObjectId(),
    kind: "error",
    taskId: args.task?._id ?? null,
    key: args.task?.key ?? null,
    version: args.task?.version ?? 0,
    raw: { worker: args.worker, where: args.where, message: err.message, stack: err.stack ?? null },
    text,
    enrichment: null,
    tokens: { in: 0, out: 0, cost: 0 },
    createdAt: new Date(),
  });
  return r.insertedId;
}
