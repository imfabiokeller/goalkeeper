// The lessons digest: what the gate's verdicts say about the last few
// hours, as counts derived from the raw record. Recomputed by every
// planner run, stored on the metrics singleton, pinned into every worker
// and planner prompt. It never replaces the record: every number here can
// be recomputed from tasks, gate sources and goal.history.
//
// Sources of truth per field:
// - firstTryPass: merged tasks in the window, attempt 1 over all.
// - checks: per check kind, fails and passes over every gate verdict in
//   the window (gate sources for failed attempts, the task's own gate for
//   merges, which write no gate source).
// - reasons: gate failure reasons, grouped by normalizeReason.
// - blocked: block reasons of blocked tasks, grouped the same way.
// - recentGuidelines: the last approved diffs in goal.history and how
//   many tasks each reopened (tasks now at that version but created
//   before it existed).

import type { Collections } from "../shared/db.ts";
import type { Goal, Lessons, Source, Task } from "../shared/types.ts";
import { failureReasons } from "../context/assemble.ts";
import { normalizeReason } from "./normalize.ts";

export const WINDOW_MS = 3 * 60 * 60_000;
export const MAX_REASONS = 12;
export const MAX_BLOCKED = 8;
export const MAX_GUIDELINES = 3;
export const MAX_EXAMPLE_KEYS = 3;
export const MAX_TEXT_CHARS = 2000;
export const REASON_CHARS = 160;

type Group = { text: string; count: number; keys: string[] };

export type LessonsRecords = {
  tasks: Pick<Task, "_id" | "key" | "status" | "attempt" | "gate" | "blockReason" | "version" | "createdAt" | "updatedAt">[];
  gates: Pick<Source, "taskId" | "key" | "raw" | "createdAt">[]; // sources of kind "gate"
  goal: Pick<Goal, "criteria" | "history"> | null;
};

function groupReasons(items: { reason: string; key: string | null }[]): Map<string, Group> {
  const groups = new Map<string, Group>();
  for (const { reason, key } of items) {
    const k = normalizeReason(reason);
    if (!k) continue;
    const g = groups.get(k) ?? { text: reason.replace(/\s+/g, " ").trim().slice(0, REASON_CHARS), count: 0, keys: [] };
    g.count += 1;
    if (key && !g.keys.includes(key) && g.keys.length < MAX_EXAMPLE_KEYS) g.keys.push(key);
    groups.set(k, g);
  }
  return groups;
}

function topGroups(groups: Map<string, Group>, cap: number): Group[] {
  return [...groups.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text)).slice(0, cap);
}

function gateChecks(raw: Record<string, unknown>): Record<string, { pass: boolean }> | null {
  const gate = raw.gate;
  if (!gate || typeof gate !== "object") return null;
  const checks = (gate as { checks?: unknown }).checks;
  if (!checks || typeof checks !== "object") return null;
  return checks as Record<string, { pass: boolean }>;
}

// Pure: the digest from records already read. `since` defaults to three
// hours before `now`; records outside the window are ignored here so the
// caller can pass coarse query results.
export function lessonsFrom(records: LessonsRecords, now: Date, since = new Date(now.getTime() - WINDOW_MS)): Lessons {
  const inWindow = (d: Date) => d.getTime() >= since.getTime() && d.getTime() <= now.getTime();
  // Oldest first, so example keys and group texts do not depend on the
  // order the records were read in.
  const tasks = records.tasks
    .filter((t) => (t.status === "merged" || t.status === "blocked") && inWindow(t.updatedAt))
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  const gates = records.gates.filter((g) => inWindow(g.createdAt)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const merged = tasks.filter((t) => t.status === "merged");
  const firstTryPass = merged.length ? merged.filter((t) => t.attempt === 1).length / merged.length : null;

  // Per check kind. Merged tasks write no gate source, so their own gate
  // counts unless a passing gate source for that task is in the record.
  const checkTally = new Map<string, { fails: number; passes: number }>();
  const tally = (checks: Record<string, { pass: boolean }>) => {
    for (const [kind, c] of Object.entries(checks)) {
      const t = checkTally.get(kind) ?? { fails: 0, passes: 0 };
      if (c.pass) t.passes += 1;
      else t.fails += 1;
      checkTally.set(kind, t);
    }
  };
  const passedByTask = new Set<string>();
  for (const g of gates) {
    const checks = gateChecks(g.raw);
    if (!checks) continue;
    tally(checks);
    const pass = (g.raw.gate as { pass?: unknown }).pass === true;
    if (pass && g.taskId) passedByTask.add(g.taskId.toHexString());
  }
  for (const t of merged) {
    if (!t.gate || passedByTask.has(t._id.toHexString())) continue;
    tally(t.gate.checks);
  }
  const criterionOf = (kind: string) => records.goal?.criteria.find((cr) => cr.check.kind === kind)?.id ?? "";
  const checks = [...checkTally.entries()]
    .map(([kind, t]) => ({ kind, criterion: criterionOf(kind), fails: t.fails, passes: t.passes }))
    .sort((a, b) => b.fails - a.fails || a.passes - b.passes || a.kind.localeCompare(b.kind));

  const reasons = topGroups(
    groupReasons(gates.flatMap((g) => failureReasons(g).map((reason) => ({ reason, key: g.key })))),
    MAX_REASONS,
  );
  const blocked = topGroups(
    groupReasons(
      tasks.filter((t) => t.status === "blocked" && t.blockReason).map((t) => ({ reason: t.blockReason as string, key: t.key })),
    ),
    MAX_BLOCKED,
  );

  const recentGuidelines = (records.goal?.history ?? [])
    .filter((h) => h.diff !== null)
    .sort((a, b) => b.version - a.version)
    .slice(0, MAX_GUIDELINES)
    .map((h) => ({
      version: h.version,
      text: h.diff?.text ?? "",
      resolved: records.tasks.filter((t) => t.version === h.version && t.createdAt.getTime() < h.at.getTime()).length,
    }));

  const lessons: Omit<Lessons, "text"> = {
    at: now,
    window: { tasks: tasks.length, since },
    firstTryPass,
    checks,
    reasons,
    blocked,
    recentGuidelines,
  };
  return { ...lessons, text: renderLessons(lessons) };
}

// Pure: the digest as plain text for prompts, at most MAX_TEXT_CHARS.
// Sections are added in order of usefulness and trimmed from the end
// until the block fits, so the pass rate and worst checks always survive.
export function renderLessons(l: Omit<Lessons, "text">): string {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const hours = Math.round(((l.at.getTime() - l.window.since.getTime()) / 3_600_000) * 10) / 10;
  const eg = (keys: string[]) => (keys.length ? ` (e.g. ${keys.join(", ")})` : "");
  const merged = l.firstTryPass === null ? "no merges yet" : `first-try pass rate ${pct(l.firstTryPass)}`;

  const head = [`Lessons from the record so far (last ${hours} h, ${l.window.tasks} tasks finished, ${merged})`];
  if (l.checks.length) {
    head.push(
      "Checks, worst first: " +
        l.checks.map((c) => `${c.kind}${c.criterion ? ` [${c.criterion}]` : ""} ${c.fails} fails / ${c.passes} passes`).join("; "),
    );
  }
  const sections: string[][] = [];
  if (l.reasons.length) sections.push(["Top gate failure reasons:", ...l.reasons.map((r) => `- ${r.count}x ${r.text}${eg(r.keys)}`)]);
  if (l.blocked.length) sections.push(["Blocked, grouped by reason:", ...l.blocked.map((r) => `- ${r.count}x ${r.text}${eg(r.keys)}`)]);
  if (l.recentGuidelines.length) {
    sections.push([
      "Recent guidelines (approved by a human):",
      ...l.recentGuidelines.map((g) => `- v${g.version}: ${g.text} (reopened ${g.resolved} tasks)`),
    ]);
  }

  const render = (secs: string[][]) => [...head, ...secs.flat()].join("\n");
  let text = render(sections);
  // Drop the last line of the longest section until it fits.
  while (text.length > MAX_TEXT_CHARS && sections.some((s) => s.length > 1)) {
    const longest = sections.reduce((a, b) => (b.join("\n").length > a.join("\n").length ? b : a));
    longest.pop();
    if (longest.length === 1) sections.splice(sections.indexOf(longest), 1);
    text = render(sections);
  }
  return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
}

// Read the records for the window and compute. One query per collection,
// coarse on time; lessonsFrom does the exact filtering.
export async function computeLessons(c: Collections, goal: Goal | null, now = new Date()): Promise<Lessons> {
  const since = new Date(now.getTime() - WINDOW_MS);
  const [tasks, gates] = await Promise.all([
    c.tasks
      .find(
        { $or: [{ status: { $in: ["merged", "blocked"] }, updatedAt: { $gte: since } }, { version: { $gt: 1 } }] },
        { projection: { key: 1, status: 1, attempt: 1, gate: 1, blockReason: 1, version: 1, createdAt: 1, updatedAt: 1 } },
      )
      .toArray(),
    c.sources
      .find({ kind: "gate", createdAt: { $gte: since } }, { projection: { taskId: 1, key: 1, raw: 1, createdAt: 1 } })
      .toArray(),
  ]);
  return lessonsFrom({ tasks, gates, goal }, now, since);
}

// The digest text from the metrics singleton, or null when there is none
// yet. One findOne with a projection; callers pin the text as-is.
export async function readLessons(c: Collections): Promise<string | null> {
  const m = await c.metrics.findOne({ _id: "metrics" }, { projection: { "lessons.text": 1 } });
  const text = m?.lessons?.text;
  return typeof text === "string" && text.length ? text : null;
}
