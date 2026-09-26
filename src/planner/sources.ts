// Append-only writes to the library from the planner: error sources,
// answer sources, the planner-turn source. Never edits an existing raw.

import { ObjectId } from "mongodb";
import type { Collections } from "../shared/db.ts";
import type { Source, SourceKind, Tokens } from "../shared/types.ts";

export const ZERO_TOKENS: Tokens = { in: 0, out: 0, cost: 0 };

export function addTokens(into: Tokens, more: Partial<Tokens>): Tokens {
  into.in += more.in ?? 0;
  into.out += more.out ?? 0;
  into.cost += more.cost ?? 0;
  return into;
}

export async function writeSource(
  c: Collections,
  kind: SourceKind,
  raw: Record<string, unknown>,
  opts: { taskId?: ObjectId | null; key?: string | null; version?: number; tokens?: Tokens; text?: string } = {},
): Promise<ObjectId> {
  const doc: Source = {
    _id: new ObjectId(),
    kind,
    taskId: opts.taskId ?? null,
    key: opts.key ?? null,
    version: opts.version ?? 0,
    raw,
    text: opts.text ?? flatten(raw),
    enrichment: null,
    tokens: opts.tokens ?? { ...ZERO_TOKENS },
    createdAt: new Date(),
  };
  await c.sources.insertOne(doc);
  return doc._id;
}

export async function writeError(
  c: Collections,
  step: string,
  err: unknown,
  extra: Record<string, unknown> = {},
  version = 0,
): Promise<ObjectId> {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  return writeSource(c, "error", { step, message, stack, ...extra }, { version, text: `${step}: ${message}` });
}

// Flatten a raw document into one string for the text index. Keeps it
// bounded so a huge transcript does not become a huge index entry.
export function flatten(raw: unknown, cap = 20_000): string {
  const parts: string[] = [];
  const walk = (v: unknown): void => {
    if (v === null || v === undefined) return;
    if (typeof v === "string") parts.push(v);
    else if (typeof v === "number" || typeof v === "boolean") parts.push(String(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v instanceof Date || v instanceof ObjectId) parts.push(v.toString());
    else if (typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(raw);
  return parts.join(" ").slice(0, cap);
}
