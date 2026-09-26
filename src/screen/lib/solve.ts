// One solved puzzle for the library's selected-solve panel: every attempt
// with where its tokens went (read, think plus write, test runs) and the
// context sections it was built from, the records its last attempt read
// (cited precedents plus its own refuted tries) and the later runs on
// other puzzles that read one of this key's records.

import { ObjectId } from "mongodb";
import type { Collections } from "../../shared/db.ts";
import { contextSections } from "./transcript.ts";
import { citedIds } from "./unit.ts";
import type { Grid, SolveAttempt, SolvePayload, SolvePrecedent } from "./types.ts";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

type RunDoc = {
  _id: ObjectId;
  taskId: ObjectId | null;
  createdAt: Date;
  tokens: { in: number; out: number };
  raw: {
    worker?: string;
    system?: string;
    steps?: Array<{ toolCalls?: Array<{ name?: string }> }>;
    outcome?: string;
    gate?: { pass?: boolean; reasons?: string[] } | null;
    contextTokens?: number | null;
    briefing?: { cited?: string[] } | null;
    blockReason?: string;
    failReason?: string;
    proposal?: { rule?: unknown } | null;
  };
};

type CitedDoc = {
  _id: ObjectId;
  kind: string;
  key: string | null;
  createdAt: Date;
  enrichment?: { gist?: string } | null;
  raw?: { gate?: { pass?: boolean; reasons?: string[] } | null; reasons?: string[]; proposal?: { rule?: unknown } | null; attempt?: number };
};

// The system prompt's headings as short labels for the breakdown.
export function sectionLabel(heading: string): string {
  const h = heading.toLowerCase();
  if (h.startsWith("you are")) return "instructions";
  if (h.startsWith("goal")) return "goal";
  if (h.startsWith("lessons")) return "lessons digest";
  if (h.startsWith("task")) return "task";
  if (h.startsWith("current state")) return "own tries";
  if (h.startsWith("library")) return "precedents";
  if (h.startsWith("input")) return "puzzle";
  if (h.startsWith("how to")) return "how to work";
  return heading.split(" ").slice(0, 2).join(" ").toLowerCase();
}

export function testRuns(steps: RunDoc["raw"]["steps"]): number {
  let n = 0;
  for (const s of steps ?? []) for (const t of s.toolCalls ?? []) if (t.name === "try_submit") n++;
  return n;
}

export async function buildSolve(c: Collections, key: string): Promise<SolvePayload | null> {
  const state = await c.state.findOne({ _id: key }, { projection: { key: 1, score: 1, scoredAt: 1, mergedAt: 1, "data.rule": 1, taskId: 1 } });
  if (!state) return null;

  const [runs, ownGates, input] = await Promise.all([
    c.sources
      .find(
        { key, kind: "worker-run" },
        { sort: { createdAt: 1 }, projection: { taskId: 1, createdAt: 1, tokens: 1, "raw.worker": 1, "raw.system": 1, "raw.steps.toolCalls.name": 1, "raw.outcome": 1, "raw.gate": 1, "raw.contextTokens": 1, "raw.briefing.cited": 1, "raw.blockReason": 1, "raw.failReason": 1, "raw.proposal.rule": 1 } },
      )
      .toArray() as unknown as Promise<RunDoc[]>,
    c.sources
      .find({ key, kind: "gate", "raw.gate.pass": false }, { sort: { createdAt: 1 }, projection: { createdAt: 1, "raw.proposal.rule": 1, "raw.attempt": 1, "raw.gate.reasons": 1 } })
      .toArray() as unknown as Promise<CitedDoc[]>,
    c.inputs.findOne({ _id: key }, { projection: { "meta.train": { $slice: 1 } } }),
  ]);

  const solvingTask = state.taskId ? String(state.taskId) : null;
  const attempts: SolveAttempt[] = runs.map((r, i) => {
    const sections = contextSections(r.raw.system).map((s) => ({ label: sectionLabel(s.label), tokens: s.tokens }));
    const ok = r.raw.gate?.pass === true;
    const reason = r.raw.gate?.reasons?.[0] ?? r.raw.blockReason ?? r.raw.failReason ?? null;
    const taskId = r.taskId ? r.taskId.toHexString() : null;
    return {
      n: i + 1,
      taskId,
      sourceId: r._id.toHexString(),
      who: r.raw.worker ?? null,
      at: r.createdAt.toISOString(),
      read: typeof r.raw.contextTokens === "number" ? r.raw.contextTokens : sections.reduce((a, s) => a + s.tokens, 0),
      write: r.tokens.out,
      tests: testRuns(r.raw.steps),
      total: r.tokens.in + r.tokens.out,
      ok,
      outcome: ok ? (taskId && taskId === solvingTask ? "solved" : "passed examples") : r.raw.outcome === "block" ? `blocked · ${reason ?? ""}`.trim() : (reason ?? "failed"),
      sections,
    };
  });

  // What the last attempt read: its cited records, resolved.
  const last = runs.at(-1);
  const ids = last ? citedIds(last.raw.briefing?.cited ?? null, last.raw.system) : [];
  const citedDocs = ids.length
    ? ((await c.sources
        .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { projection: { kind: 1, key: 1, createdAt: 1, "enrichment.gist": 1, "raw.gate.pass": 1, "raw.gate.reasons": 1, "raw.reasons": 1, "raw.proposal.rule": 1, "raw.attempt": 1 } })
        .toArray()) as unknown as CitedDoc[])
    : [];
  const byId = new Map(citedDocs.map((d) => [d._id.toHexString(), d]));
  // Its own refuted tries: rules the gate failed on this key, from the
  // gate verdicts and from earlier runs, without repeats.
  const read: SolvePrecedent[] = [];
  const ownRules = new Set<string>();
  for (const g of ownGates) {
    const rule = str(g.raw?.proposal?.rule);
    if (!rule || ownRules.has(rule)) continue;
    ownRules.add(rule);
    read.push({ id: g._id.toHexString(), key, gist: `its own attempt ${g.raw?.attempt ?? "?"}: ${rule}`, kind: "dead", at: g.createdAt.toISOString(), own: true });
  }
  runs.forEach((r, i) => {
    if (!last || r._id.equals(last._id) || r.raw.gate?.pass !== false) return;
    const rule = str(r.raw.proposal?.rule);
    if (!rule || ownRules.has(rule)) return;
    ownRules.add(rule);
    read.push({ id: r._id.toHexString(), key, gist: `its own attempt ${i + 1}: ${rule}`, kind: "dead", at: r.createdAt.toISOString(), own: true });
  });
  for (const id of ids) {
    const d = byId.get(id);
    if (!d || d.key === key) continue;
    const rule = str(d.raw?.proposal?.rule);
    const worked = d.kind === "worker-run" && d.raw?.gate?.pass === true;
    const reason = d.raw?.gate?.reasons?.[0] ?? d.raw?.reasons?.[0] ?? null;
    const gist = (rule ?? d.enrichment?.gist ?? reason ?? d.kind).replace(/\s+/g, " ");
    read.push({ id, key: d.key, gist, kind: worked ? "worked" : "dead", at: d.createdAt.toISOString(), own: false });
  }

  // Who read this key's records later: runs on other puzzles whose
  // briefing cites one of them, or whose system prompt lists it under
  // Library records (runs without a briefing).
  const ownIds = [...runs.map((r) => r._id.toHexString()), ...ownGates.map((g) => g._id.toHexString())];
  const used: SolvePayload["used"] = [];
  if (ownIds.length) {
    const readers = (await c.sources
      .find(
        {
          kind: "worker-run",
          key: { $ne: key },
          $or: [{ "raw.briefing.cited": { $in: ownIds } }, { "raw.briefing.cited.0": { $exists: false }, "raw.system": { $regex: `\\[(${ownIds.join("|")})\\] ` } }],
        },
        { sort: { createdAt: 1 }, projection: { key: 1, createdAt: 1 } },
      )
      .toArray()) as unknown as Array<{ _id: ObjectId; key: string | null; createdAt: Date }>;
    const keys = [...new Set(readers.flatMap((r) => (r.key ? [r.key] : [])))];
    const solvedKeys = new Set(keys.length ? (await c.state.find({ _id: { $in: keys }, score: 1 }, { projection: { key: 1 } }).toArray()).map((s) => s.key) : []);
    const seen = new Set<string>();
    for (const r of readers) {
      if (!r.key || seen.has(r.key)) continue;
      seen.add(r.key);
      used.push({ key: r.key, at: r.createdAt.toISOString(), solved: solvedKeys.has(r.key), sourceId: r._id.toHexString() });
    }
  }

  const train = (input?.meta as { train?: Array<{ input?: unknown }> } | undefined)?.train;
  const thumb = Array.isArray(train?.[0]?.input) ? (train[0].input as Grid) : null;
  const solving = attempts.find((a) => a.outcome === "solved") ?? attempts.at(-1) ?? null;

  return {
    key,
    at: (state.scoredAt ?? state.mergedAt).toISOString(),
    who: solving?.who ?? null,
    rule: str((state.data as { rule?: unknown } | null)?.rule),
    thumb,
    total: attempts.reduce((a, x) => a + x.total, 0),
    attempts,
    read,
    used,
  };
}
