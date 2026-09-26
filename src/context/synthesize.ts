// Briefing synthesis with citations (docs/DESIGN.md section 3, step 6):
// one cheap model call turns the expanded hits into at most twelve
// sentences, every one ending with citations like [<sourceId>]. `ground`
// is pure and drops every sentence whose citations are not all in the
// retrieved set, so the briefing can only say what the library says.
// Synthesis never throws: any failure yields null and the caller falls
// back to the raw hits.

import { generateText, type LanguageModel } from "ai";
import { enrichModel } from "../shared/llm.ts";
import type { Goal, Task } from "../shared/types.ts";
import type { Passage } from "./retrieve.ts";

export const MAX_SENTENCES = 12;
export const BRIEFING_EXCERPT_CHARS = 1500;

export type Briefing = {
  text: string; // grounded sentences, in order
  cited: Passage[]; // only the hits the grounded briefing cites, in hit order
  tokens: { in: number; out: number };
};

export type SynthesizeArgs = {
  goal: Pick<Goal, "statement" | "criteria">;
  task: Pick<Task, "key" | "criteria">;
  hits: Passage[];
  model?: LanguageModel;
};

// Ids inside one or more [..] groups: "[a]", "[a][b]", "[a, b]".
export function citationsOf(sentence: string): string[] {
  const ids: string[] = [];
  for (const m of sentence.matchAll(/\[([^\]]+)\]/g)) {
    for (const id of m[1].split(/[,\s]+/)) if (id) ids.push(id);
  }
  return ids;
}

// Split into sentences: after a citation group, or after . ! ? before the
// next sentence start. A chunk that is only citations belongs to the
// sentence before it.
export function sentencesOf(text: string): string[] {
  const chunks = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=\])\s+(?=[^[])|(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const chunk of chunks) {
    if (/^(\[[^\]]+\]\s*)+[.!?]?$/.test(chunk) && out.length) out[out.length - 1] += " " + chunk;
    else out.push(chunk);
  }
  return out;
}

export function ground(briefing: string, allowedIds: Iterable<string>): { text: string; citedIds: string[] } {
  const allowed = new Set(allowedIds);
  const kept: string[] = [];
  const cited = new Set<string>();
  for (const sentence of sentencesOf(briefing)) {
    const ids = citationsOf(sentence);
    if (ids.length === 0 || !ids.every((id) => allowed.has(id))) continue;
    kept.push(sentence);
    for (const id of ids) cited.add(id);
    if (kept.length >= MAX_SENTENCES) break;
  }
  return { text: kept.join(" "), citedIds: [...cited] };
}

export function briefingPrompt(args: SynthesizeArgs): { system: string; prompt: string } {
  const criteria = args.task.criteria
    .map((id) => args.goal.criteria.find((c) => c.id === id))
    .filter((c): c is Goal["criteria"][number] => Boolean(c))
    .map((c) => `- ${c.id}: ${c.text}`)
    .join("\n");
  const hits = args.hits
    .map((h) => `[${h.id}] ${h.kind}${h.key ? ` on ${h.key}` : ""}${h.gist ? `\ngist: ${h.gist}` : ""}\nrecord: ${h.excerpt.slice(0, BRIEFING_EXCERPT_CHARS)}`)
    .join("\n\n");
  return {
    system:
      "You write a briefing for a worker about to extract one unit under a shared goal, from records of earlier runs on other units. " +
      `At most ${MAX_SENTENCES} sentences. Every sentence states one thing the records show that generalizes (a convention, a trap, a fix that passed the gate) and ends with the ids of the records that show it, like [<id>] or [<id>][<id>], before the period. ` +
      "Use only the ids given. Never invent a record, never restate the goal, never give values for the worker's own unit. If nothing generalizes, answer with an empty line.",
    prompt: `Goal: ${args.goal.statement}\n\nCriteria of the task:\n${criteria}\n\nThe worker's unit: ${args.task.key}\n\nRecords:\n\n${hits}`,
  };
}

export async function synthesize(args: SynthesizeArgs): Promise<Briefing | null> {
  if (args.hits.length === 0) return null;
  try {
    const { system, prompt } = briefingPrompt(args);
    const result = await generateText({ model: args.model ?? enrichModel(), system, prompt, maxOutputTokens: 1200 });
    const grounded = ground(result.text, args.hits.map((h) => h.id));
    if (!grounded.text) return null;
    const citedIds = new Set(grounded.citedIds);
    return {
      text: grounded.text,
      cited: args.hits.filter((h) => citedIds.has(h.id)),
      tokens: { in: result.totalUsage.inputTokens ?? 0, out: result.totalUsage.outputTokens ?? 0 },
    };
  } catch {
    return null;
  }
}
