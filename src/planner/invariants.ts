// npm run invariants: the checks that must hold on a live database.
// Prints every violation and exits 1 if there is any.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Collections } from "../shared/db.ts";
import { close, connect } from "../shared/db.ts";

export const HEARTBEAT_MAX_MS = 90_000;
export const ANSWERS_DIR = new URL("../../usecase/answers/", import.meta.url).pathname;
// A needle shorter than this matches by accident (a 1x1 grid is "[[3]]").
export const MIN_NEEDLE_CHARS = 8;

// The strings a leaked test output would show up as: the compact JSON of
// each grid, and the grid as rows of digits like the puzzle text renders
// them. Returns [] when the folder is absent (the fixture has not landed).
export function answerNeedles(dir = ANSWERS_DIR): { key: string; needle: string }[] {
  if (!existsSync(dir)) return [];
  const out: { key: string; needle: string }[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const key = file.slice(0, -".json".length);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(join(dir, file), "utf8"));
    } catch {
      continue;
    }
    const grids: unknown[] = Array.isArray(parsed) && parsed.every((g) => Array.isArray(g) && Array.isArray(g[0])) ? parsed : [parsed];
    for (const grid of grids) {
      if (!Array.isArray(grid)) continue;
      const json = JSON.stringify(grid);
      const rows = grid.map((row) => (Array.isArray(row) ? row.join("") : String(row))).join("\n");
      for (const needle of [json, rows]) if (needle.length >= MIN_NEEDLE_CHARS) out.push({ key, needle });
    }
  }
  return out;
}

const compact = (s: string) => s.replace(/\s+/g, "");

function leaks(text: string | null | undefined, needles: { key: string; needle: string }[]): string | null {
  if (!text) return null;
  const flat = compact(text);
  for (const n of needles) {
    if (n.needle.includes("\n") ? text.includes(n.needle) : flat.includes(compact(n.needle))) return n.key;
  }
  return null;
}

export async function checkInvariants(c: Collections, now = new Date(), needles = answerNeedles()): Promise<string[]> {
  const violations: string[] = [];

  const solvedButOpen = await c.state
    .aggregate<{ _id: string }>([
      { $match: { score: 1 } },
      {
        $lookup: {
          from: "tasks",
          let: { key: "$key" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$key", "$$key"] }, { $eq: ["$status", "open"] }] } } }, { $limit: 1 }],
          as: "open",
        },
      },
      { $match: { open: { $not: { $size: 0 } } } },
      { $project: { _id: 1 } },
    ])
    .toArray();
  for (const s of solvedButOpen) violations.push(`state ${s._id} scored 1 but has an open task`);

  const badScores = await c.state.find({ score: { $exists: true, $nin: [null, 0, 1] } }, { projection: { score: 1 } }).toArray();
  for (const s of badScores) violations.push(`state ${s._id} has score ${JSON.stringify(s.score)}, not null, 0 or 1`);

  if (needles.length) {
    for await (const t of c.tasks.find({ hint: { $type: "string" } }, { projection: { key: 1, hint: 1 } })) {
      const key = leaks(t.hint, needles);
      if (key) violations.push(`task ${t._id.toHexString()} (${t.key}) hint contains the answer of ${key}`);
    }
    for await (const s of c.sources.find({}, { projection: { kind: 1, key: 1, text: 1 } })) {
      const key = leaks(s.text, needles);
      if (key) violations.push(`source ${s._id.toHexString()} (${s.kind}, ${s.key ?? "no key"}) contains the answer of ${key}`);
    }
  }

  const dupClaims = await c.tasks
    .aggregate<{ _id: string; n: number }>([
      { $match: { status: "claimed" } },
      { $group: { _id: "$key", n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();
  for (const d of dupClaims) violations.push(`key ${d._id} has ${d.n} claimed tasks`);

  const orphanStates = await c.state
    .aggregate<{ _id: string }>([
      {
        $lookup: {
          from: "tasks",
          let: { key: "$key" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$key", "$$key"] }, { $eq: ["$status", "merged"] }] } } }, { $limit: 1 }],
          as: "merged",
        },
      },
      { $match: { merged: { $size: 0 } } },
      { $project: { _id: 1 } },
    ])
    .toArray();
  for (const s of orphanStates) violations.push(`state ${s._id} has no merged task`);

  const goal = await c.goal.findOne({ _id: "goal" });
  if (!goal) violations.push("no goal document");
  else {
    const ids = goal.criteria.map((cr) => cr.id);
    const bad = await c.tasks.find({ criteria: { $elemMatch: { $nin: ids } } }, { projection: { key: 1, criteria: 1 } }).toArray();
    for (const t of bad) violations.push(`task ${t._id.toHexString()} (${t.key}) cites unknown criteria ${t.criteria.filter((x) => !ids.includes(x)).join(", ")}`);
  }

  const stale = await c.tasks
    .find({ status: "claimed", heartbeat: { $lt: new Date(now.getTime() - HEARTBEAT_MAX_MS) } }, { projection: { key: 1, worker: 1, heartbeat: 1 } })
    .toArray();
  for (const t of stale) violations.push(`task ${t._id.toHexString()} (${t.key}) claimed by ${t.worker} with heartbeat ${t.heartbeat?.toISOString()}`);

  return violations;
}

if (import.meta.main) {
  const { c } = await connect();
  const violations = await checkInvariants(c);
  for (const v of violations) console.error(`violation: ${v}`);
  console.log(violations.length ? `${violations.length} violations` : "invariants clean");
  await close();
  process.exit(violations.length ? 1 : 0);
}
