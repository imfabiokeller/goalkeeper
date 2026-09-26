// Pure readers of a worker-run's raw record for the task page: the system
// prompt as labeled sections, the first user messages as text, the tool
// steps as a transcript, and the reasons a try_submit result carried.

import { estimateTokens } from "./format.ts";

export type ContextSection = { label: string; text: string; chars: number; tokens: number };

// "# Heading\nbody" blocks of the system prompt. Text before the first
// heading becomes "preamble".
export function contextSections(system: string | null | undefined): ContextSection[] {
  if (!system) return [];
  const parts = `\n${system.startsWith("# ") ? "" : "# preamble\n"}${system}`.split("\n# ").filter((p) => p.trim());
  return parts.map((p) => {
    const nl = p.indexOf("\n");
    const label = (nl === -1 ? p : p.slice(0, nl)).trim();
    const text = nl === -1 ? "" : p.slice(nl + 1).trimEnd();
    return { label, text, chars: text.length, tokens: estimateTokens(text) };
  });
}

type Part = { type?: string; text?: string; toolName?: string; input?: unknown; output?: unknown };
type Message = { role?: string; content?: string | Part[] };

// A model message's text: string content as is, parts joined, tool parts as one-line JSON.
export function messageText(m: unknown): string {
  const msg = m as Message;
  if (typeof msg?.content === "string") return msg.content;
  if (!Array.isArray(msg?.content)) return "";
  return msg.content
    .map((p) => {
      if (p.type === "text" && typeof p.text === "string") return p.text;
      if (p.type === "tool-call") return `[call ${p.toolName}] ${JSON.stringify(p.input)}`;
      if (p.type === "tool-result") return `[result ${p.toolName}] ${JSON.stringify(p.output)}`;
      return p.text ?? "";
    })
    .join("\n");
}

// The user messages the context assembled, before the model's first turn.
export function inputMessages(messages: unknown): ContextSection[] {
  if (!Array.isArray(messages)) return [];
  const out: ContextSection[] = [];
  for (const m of messages as Message[]) {
    if (m?.role === "assistant" || m?.role === "tool") break;
    const text = messageText(m);
    out.push({ label: `${m?.role ?? "message"} message`, text, chars: text.length, tokens: estimateTokens(text) });
  }
  return out;
}

export type StepLine = {
  n: number;
  text: string;
  calls: Array<{ name: string; input: unknown }>;
  results: Array<{ name: string; output: unknown; reasons: string[]; ok: boolean | null }>;
  finishReason: string;
  usage: { in: number; out: number };
};

type RawStep = { text?: unknown; toolCalls?: unknown; toolResults?: unknown; finishReason?: unknown; usage?: { in?: unknown; out?: unknown } };

// The reasons and verdict a tool result carried (try_submit and submit
// return the gate's verdict; other tools return whatever they return).
export function resultVerdict(output: unknown): { ok: boolean | null; reasons: string[] } {
  let o = output;
  if (typeof o === "string") {
    try {
      o = JSON.parse(o);
    } catch {
      return { ok: null, reasons: [] };
    }
  }
  if (!o || typeof o !== "object") return { ok: null, reasons: [] };
  const r = o as { ok?: unknown; pass?: unknown; reasons?: unknown; gate?: { pass?: unknown; reasons?: unknown } };
  const okRaw = typeof r.ok === "boolean" ? r.ok : typeof r.pass === "boolean" ? r.pass : typeof r.gate?.pass === "boolean" ? r.gate.pass : null;
  const list = Array.isArray(r.reasons) ? r.reasons : Array.isArray(r.gate?.reasons) ? r.gate.reasons : [];
  return { ok: okRaw, reasons: list.filter((x): x is string => typeof x === "string") };
}

export function stepLines(steps: unknown): StepLine[] {
  if (!Array.isArray(steps)) return [];
  return (steps as RawStep[]).map((s, i) => {
    const calls = Array.isArray(s.toolCalls) ? (s.toolCalls as Array<{ name?: unknown; input?: unknown }>) : [];
    const results = Array.isArray(s.toolResults) ? (s.toolResults as Array<{ name?: unknown; output?: unknown }>) : [];
    return {
      n: i + 1,
      text: typeof s.text === "string" ? s.text : "",
      calls: calls.map((c) => ({ name: String(c.name ?? "?"), input: c.input })),
      results: results.map((r) => ({ name: String(r.name ?? "?"), output: r.output, ...resultVerdict(r.output) })),
      finishReason: typeof s.finishReason === "string" ? s.finishReason : "",
      usage: { in: Number(s.usage?.in ?? 0) || 0, out: Number(s.usage?.out ?? 0) || 0 },
    };
  });
}
