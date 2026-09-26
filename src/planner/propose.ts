// Propose: when three or more blocked tasks share a reason and no open
// question already cites one of them, ask the model for a guideline and
// put it in the inbox as an approval question. The goal itself is never
// touched here; only applyDiff after a human says yes.

import { ObjectId } from "mongodb";
import { z } from "zod";
import type { Collections } from "../shared/db.ts";
import type { Goal, Task, Tokens } from "../shared/types.ts";
import { readLessons } from "./lessons.ts";
import { structured } from "./model.ts";
import { normalizeReason, PREFIX_CHARS } from "./normalize.ts";
import { writeError } from "./sources.ts";

export const Guideline = z.object({ guideline: z.string() });
export type DecideGuideline = (prompt: string) => Promise<{ guideline: string }>;

export const MIN_GROUP = 3;
export { normalizeReason, PREFIX_CHARS };

export function aiDecideGuideline(tokens?: Tokens): DecideGuideline {
  return (prompt) => structured(Guideline, prompt, tokens);
}

export function groupBlocked(tasks: Task[]): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.blockReason) continue;
    const k = normalizeReason(t.blockReason);
    if (!k) continue;
    const g = groups.get(k) ?? [];
    g.push(t);
    groups.set(k, g);
  }
  return groups;
}

export function buildPrompt(goal: Goal, reasons: string[], lessons?: string | null): string {
  const lines: string[] = [];
  lines.push("Workers pursuing a goal got stuck on several units for the same reason.");
  lines.push("Write one guideline, a single sentence, that would let them proceed consistently.");
  lines.push("It must not contradict the criteria or the existing guidelines, and must not restate one of them.");
  lines.push("");
  lines.push(`GOAL (version ${goal.version}): ${goal.statement}`);
  lines.push("Criteria:");
  for (const cr of goal.criteria) lines.push(`- ${cr.id}: ${cr.text}`);
  lines.push("Existing guidelines:");
  for (const g of goal.guidelines) lines.push(`- ${g}`);
  lines.push("Out of scope:");
  for (const o of goal.outOfScope) lines.push(`- ${o}`);
  if (lessons) {
    lines.push("");
    lines.push(lessons);
  }
  lines.push("");
  lines.push(`BLOCK REASONS (${reasons.length}):`);
  for (const r of reasons) lines.push(`- ${r.slice(0, 500)}`);
  return lines.join("\n");
}

export async function propose(
  c: Collections,
  goal: Goal,
  decide?: DecideGuideline,
  tokens?: Tokens,
  lessons?: string | null, // undefined: read the metrics doc; null: none
): Promise<number> {
  const blocked = await c.tasks.find({ status: "blocked", blockReason: { $ne: null } }).toArray();
  const groups = [...groupBlocked(blocked).values()].filter((g) => g.length >= MIN_GROUP);
  if (groups.length === 0) return 0;
  if (lessons === undefined) lessons = await readLessons(c);

  const openQuestions = await c.questions.find({ status: "open" }).toArray();
  const cited = new Set(openQuestions.flatMap((q) => q.evidence.map((id) => id.toHexString())));
  const existingTexts = new Set([
    ...goal.guidelines.map((g) => g.trim()),
    ...openQuestions.map((q) => q.proposedDiff.text.trim()),
  ]);

  let created = 0;
  for (const group of groups) {
    if (group.some((t) => cited.has(t._id.toHexString()))) continue;
    const reasons = group.map((t) => t.blockReason as string);
    let text: string;
    try {
      text = (await (decide ?? aiDecideGuideline(tokens))(buildPrompt(goal, reasons, lessons))).guideline.trim();
    } catch (err) {
      await writeError(c, "propose", err, { taskIds: group.map((t) => t._id) }, goal.version);
      continue;
    }
    if (!text || existingTexts.has(text)) {
      await writeError(c, "propose", new Error(text ? "duplicate guideline" : "empty guideline"), { text }, goal.version);
      continue;
    }
    existingTexts.add(text);
    await c.questions.insertOne({
      _id: new ObjectId(),
      kind: "approval",
      question: `${group.length} tasks are blocked because: ${reasons[0].slice(0, 200)}. Adopt this guideline?`,
      proposedDiff: { op: "add-guideline", text },
      evidence: group.map((t) => t._id),
      status: "open",
      answeredBy: null,
      answeredAt: null,
      createdAt: new Date(),
    });
    created += 1;
  }
  return created;
}
