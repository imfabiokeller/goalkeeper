// npm run status: one screen of the run, for the operator. Read-only.

import { close, connect } from "../shared/db.ts";

const { c } = await connect();
try {
  const byStatus = await c.tasks.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray();
  const states = await c.state.countDocuments();
  const solved = await c.state.countDocuments({ score: 1 });
  const wrong = await c.state.countDocuments({ score: 0 });
  const unscored = states - solved - wrong;
  const alive = await c.tasks.distinct("worker", { status: "claimed", heartbeat: { $gte: new Date(Date.now() - 30_000) } });
  const dead = await c.tasks.distinct("worker", { status: "claimed", heartbeat: { $lt: new Date(Date.now() - 30_000) } });
  const cost = await c.sources.aggregate([{ $group: { _id: null, cost: { $sum: "$tokens.cost" }, tokens: { $sum: "$tokens.in" }, n: { $sum: 1 } } }]).toArray();
  const turn = await c.sources.findOne({ kind: "planner-turn" }, { sort: { createdAt: -1 }, projection: { createdAt: 1, text: 1 } });
  const lastGates = await c.sources.find({ kind: "gate" }, { sort: { createdAt: -1 }, limit: 5, projection: { key: 1, "raw.reasons": 1 } }).toArray();

  console.log(`tasks      ${byStatus.map((s) => `${s._id} ${s.n}`).join(", ")}`);
  console.log(`state      ${states} merged, ${solved} solved, ${wrong} wrong on test, ${unscored} unscored`);
  console.log(`workers    ${alive.length} alive (${alive.join(" ")})${dead.length ? `, ${dead.length} stale (${dead.join(" ")})` : ""}`);
  const t = cost[0];
  if (t) console.log(`library    ${t.n} sources, ${t.tokens} tokens in, $${Number(t.cost).toFixed(3)}`);
  console.log(`planner    last turn ${turn ? `${Math.round((Date.now() - turn.createdAt.getTime()) / 1000)} s ago` : "never"}`);
  for (const g of lastGates) console.log(`gate fail  ${g.key} ${String((g.raw as { reasons?: string[] }).reasons?.[0] ?? "").slice(0, 100)}`);
} finally {
  await close();
}
