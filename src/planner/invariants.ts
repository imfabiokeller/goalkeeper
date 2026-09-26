// npm run invariants: the checks that must hold on a live database.
// Prints every violation and exits 1 if there is any.

import type { Collections } from "../shared/db.ts";
import { close, connect } from "../shared/db.ts";

export const HEARTBEAT_MAX_MS = 90_000;

export async function checkInvariants(c: Collections, now = new Date()): Promise<string[]> {
  const violations: string[] = [];

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
