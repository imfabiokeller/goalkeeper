// Crowd requests: one model call each, validated before any write. The
// source is claimed first (handled false to true in one findOneAndUpdate)
// so two planners never double-handle; the outcome and reason are written
// on the source at the end of every path.

import { ObjectId } from "mongodb";
import type { Collections } from "../shared/db.ts";
import { CrowdOutcome, type Goal, type Source, type Tokens } from "../shared/types.ts";
import { insertTaskIfIdle } from "./emit.ts";
import { readLessons } from "./lessons.ts";
import { structured } from "./model.ts";
import { writeError } from "./sources.ts";

export type Decide = (prompt: string) => Promise<CrowdOutcome>;

export const LIST_CAP = 400;

export function aiDecide(tokens?: Tokens): Decide {
  return (prompt) => structured(CrowdOutcome, prompt, tokens);
}

export type ClassifyResult = {
  sourceId: Source["_id"];
  outcome: CrowdOutcome["outcome"];
  reason: string;
};

export function buildPrompt(
  goal: Goal,
  requestText: string,
  unscheduled: { key: string; name: string }[],
  stateKeys: string[],
  lessons?: string | null,
): string {
  const lines: string[] = [];
  lines.push("You triage one request from the crowd for a fleet of workers pursuing a goal.");
  lines.push("");
  lines.push(`GOAL (version ${goal.version}): ${goal.statement}`);
  lines.push("Criteria:");
  for (const cr of goal.criteria) lines.push(`- ${cr.id}: ${cr.text}`);
  lines.push("Guidelines:");
  for (const g of goal.guidelines) lines.push(`- ${g}`);
  lines.push("Out of scope:");
  for (const o of goal.outOfScope) lines.push(`- ${o}`);
  if (lessons) {
    lines.push("");
    lines.push(lessons);
  }
  lines.push("");
  lines.push("REQUEST:");
  lines.push(requestText.slice(0, 4000));
  lines.push("");
  lines.push(`UNSCHEDULED INPUT KEYS (${unscheduled.length}, work not yet queued; a "task" outcome must name one of these):`);
  for (const u of unscheduled) lines.push(`- ${u.key}: ${u.name}`);
  lines.push("");
  lines.push(`MERGED STATE KEYS (${stateKeys.length}, work already done; a "recheck" outcome must name one of these):`);
  for (const k of stateKeys) lines.push(`- ${k}`);
  lines.push("");
  lines.push("Decide exactly one outcome:");
  lines.push('- "task": the request asks for an unscheduled unit; give its key.');
  lines.push('- "recheck": the request doubts a merged unit; give its key and the doubt as reason.');
  lines.push('- "proposal": the request suggests a rule that would apply to every unit; give the guideline in one sentence.');
  lines.push('- "parked": anything else (out of scope, unclear, a key that is not listed); give the reason.');
  return lines.join("\n");
}

export async function classify(
  c: Collections,
  goal: Goal,
  request: Source,
  decide?: Decide,
  tokens?: Tokens,
  lessons?: string | null, // undefined: read the metrics doc; null: none
): Promise<ClassifyResult | null> {
  // Claim the source. Whoever loses this race skips the request.
  const claimed = await c.sources.findOneAndUpdate(
    { _id: request._id, kind: "crowd-request", handled: false },
    { $set: { handled: true } },
  );
  if (!claimed) return null;

  const unscheduled = await c.inputs
    .find({ scheduled: false }, { projection: { key: 1, name: 1 }, sort: { key: 1 }, limit: LIST_CAP })
    .map((i) => ({ key: i.key, name: i.name }))
    .toArray();
  const stateKeys = await c.state
    .find({}, { projection: { key: 1 }, sort: { key: 1 }, limit: LIST_CAP })
    .map((s) => s.key)
    .toArray();
  const prompt = buildPrompt(goal, request.text, unscheduled, stateKeys, lessons === undefined ? await readLessons(c) : lessons);

  let outcome: CrowdOutcome;
  try {
    outcome = await (decide ?? aiDecide(tokens))(prompt);
    outcome = await validate(c, goal, outcome, new Set(unscheduled.map((u) => u.key)));
  } catch (err) {
    await writeError(c, "classify", err, { sourceId: request._id }, goal.version);
    const message = err instanceof Error ? err.message : String(err);
    outcome = { outcome: "parked", reason: `could not classify: ${message}` };
  }

  const reason = await apply(c, goal, request, outcome);
  await c.sources.updateOne({ _id: request._id }, { $set: { outcome: outcome.outcome, reason } });
  return { sourceId: request._id, outcome: outcome.outcome, reason };
}

// Turn an outcome that does not pass the checks in docs/PLANNER.md into a
// parked outcome with the reason. Never throws for a bad model answer.
async function validate(
  c: Collections,
  goal: Goal,
  outcome: CrowdOutcome,
  unscheduledKeys: Set<string>,
): Promise<CrowdOutcome> {
  const parked = (why: string): CrowdOutcome => ({ outcome: "parked", reason: `could not classify: ${why}` });
  switch (outcome.outcome) {
    case "task": {
      if (unscheduledKeys.has(outcome.key)) return outcome;
      // The prompt list is capped; check the database before giving up.
      const input = await c.inputs.findOne({ _id: outcome.key }, { projection: { scheduled: 1 } });
      if (input && !input.scheduled) return outcome;
      return parked(input ? `input ${outcome.key} is already scheduled` : `no input with key ${outcome.key}`);
    }
    case "recheck": {
      const state = await c.state.findOne({ _id: outcome.key }, { projection: { _id: 1 } });
      if (!state) return parked(`no state with key ${outcome.key}`);
      if (!outcome.reason.trim()) return parked("recheck without a reason");
      return outcome;
    }
    case "proposal": {
      const text = outcome.guideline.trim();
      if (!text) return parked("empty guideline");
      if (goal.guidelines.some((g) => g.trim() === text)) return parked("guideline already exists");
      return { outcome: "proposal", guideline: text };
    }
    case "parked":
      return outcome.reason.trim() ? outcome : parked("no reason given");
  }
}

// Apply the validated outcome. Returns the reason written on the source.
async function apply(c: Collections, goal: Goal, request: Source, outcome: CrowdOutcome): Promise<string> {
  const by = `crowd:${request._id.toHexString()}`;
  switch (outcome.outcome) {
    case "task": {
      await c.inputs.updateOne(
        { _id: outcome.key, scheduled: false },
        { $set: { scheduled: true, scheduledBy: by } },
      );
      const id = await insertTaskIfIdle(c, { key: outcome.key, goal, priority: 1, createdBy: by });
      return id ? `queued ${outcome.key} with priority` : `${outcome.key} scheduled; a task was already in flight`;
    }
    case "recheck": {
      const id = await insertTaskIfIdle(c, {
        key: outcome.key,
        goal,
        priority: 1,
        createdBy: by,
        hint: outcome.reason,
      });
      return id
        ? `recheck queued for ${outcome.key}: ${outcome.reason}`
        : `recheck for ${outcome.key} not queued, a task was already in flight: ${outcome.reason}`;
    }
    case "proposal": {
      await c.questions.insertOne({
        _id: new ObjectId(),
        kind: "approval",
        question: `A crowd request suggests a guideline: "${outcome.guideline}". Adopt it?`,
        proposedDiff: { op: "add-guideline", text: outcome.guideline },
        evidence: [],
        status: "open",
        answeredBy: null,
        answeredAt: null,
        createdAt: new Date(),
      });
      return `proposed guideline: ${outcome.guideline}`;
    }
    case "parked":
      return outcome.reason;
  }
}

// Handle up to `cap` unhandled crowd requests, oldest first.
export async function classifyPending(
  c: Collections,
  goal: Goal,
  cap = 10,
  decide?: Decide,
  tokens?: Tokens,
  lessons?: string | null,
): Promise<ClassifyResult[]> {
  const pending = await c.sources
    .find({ kind: "crowd-request", handled: false }, { sort: { createdAt: 1 }, limit: cap })
    .toArray();
  if (pending.length && lessons === undefined) lessons = await readLessons(c);
  const results: ClassifyResult[] = [];
  for (const request of pending) {
    const r = await classify(c, goal, request, decide, tokens, lessons);
    if (r) results.push(r);
  }
  return results;
}
