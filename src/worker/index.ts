// npm run worker: loop forever over iterations. Idle means sleep 2 s.
// Every 20 iterations the spend (sum of sources.tokens.cost) is checked
// against BUDGET_USD; over budget, the worker stops claiming. SIGTERM
// finishes the current iteration, then exits.

import { hostname } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import { close, connect } from "../shared/db.ts";
import type { Collections } from "../shared/db.ts";
import { iteration } from "./loop.ts";

export function defaultWorkerId(): string {
  const host = hostname().replace(/[^a-z0-9]/gi, "").slice(-4).toLowerCase() || "node";
  const pair = Math.random().toString(36).slice(2, 4).padEnd(2, "0");
  return `w-${host}${pair}`;
}

export async function spentUsd(c: Collections): Promise<number> {
  const [row] = await c.sources.aggregate<{ cost: number }>([{ $group: { _id: null, cost: { $sum: "$tokens.cost" } } }]).toArray();
  return row?.cost ?? 0;
}

const ERROR_BACKOFF_MS = 10_000;
const IDLE_MS = 2000;
const BUDGET_EVERY = 20;

async function main(): Promise<void> {
  const workerId = process.env.WORKER_ID ?? defaultWorkerId();
  const budget = Number(process.env.BUDGET_USD ?? "Infinity");
  const { c } = await connect();
  console.log(`[${workerId}] started, budget ${Number.isFinite(budget) ? `$${budget}` : "unlimited"}`);

  let stopping = false;
  const stop = (signal: string) => {
    if (!stopping) console.log(`[${workerId}] ${signal}: finishing the current iteration`);
    stopping = true;
  };
  process.once("SIGTERM", () => stop("SIGTERM"));
  process.once("SIGINT", () => stop("SIGINT"));

  let n = 0;
  while (!stopping) {
    if (n % BUDGET_EVERY === 0 && Number.isFinite(budget)) {
      const spent = await spentUsd(c);
      if (spent >= budget) {
        console.log(`[${workerId}] budget exceeded: spent $${spent.toFixed(2)} of $${budget}, not claiming`);
        await sleep(30_000);
        continue;
      }
    }
    n += 1;
    const started = Date.now();
    const outcome = await iteration(c, workerId);
    if (outcome === "idle") {
      await sleep(IDLE_MS);
    } else if (outcome === "error") {
      // Back off so a dead provider does not burn attempts in a hot loop.
      console.log(`[${workerId}] error in ${((Date.now() - started) / 1000).toFixed(1)} s, backing off`);
      await sleep(ERROR_BACKOFF_MS);
    } else {
      console.log(`[${workerId}] ${outcome} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    }
  }
  await close();
  console.log(`[${workerId}] stopped`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
