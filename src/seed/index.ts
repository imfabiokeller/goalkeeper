// npm run seed -- --db live
//
// The goal at version 1 (only if absent) and every input from usecase/,
// all scheduled. Idempotent.

import { parseArgs } from "node:util";
import type { AnyBulkWriteOperation, Collection, Db, Document } from "mongodb";
import { close, connect, ensureIndexes, type Collections } from "../shared/db.ts";
import { goalFromLens } from "../shared/goal.ts";
import type { Input } from "../shared/types.ts";
import { loadInputs, readLens } from "./inputs.ts";

const BATCH = 50;

async function inBatches<T extends Document>(col: Collection<T>, ops: AnyBulkWriteOperation<T>[]): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH) {
    await col.bulkWrite(ops.slice(i, i + BATCH), { ordered: false });
  }
}

// Upsert by _id. Text and metadata are refreshed, `scheduled`,
// `scheduledBy` and `createdAt` are only set when the document is new.
export async function upsertInputs(c: Collections, inputs: Input[]): Promise<void> {
  const ops: AnyBulkWriteOperation<Input>[] = inputs.map((i) => {
    const { _id, scheduled, scheduledBy, createdAt, ...rest } = i;
    return {
      updateOne: {
        filter: { _id },
        update: { $set: rest, $setOnInsert: { scheduled, scheduledBy, createdAt } },
        upsert: true,
      },
    };
  });
  await inBatches(c.inputs, ops);
}

async function seedLive(c: Collections, db: Db): Promise<void> {
  const existing = await c.goal.findOne({ _id: "goal" });
  if (existing) {
    console.log(`goal: kept version ${existing.version} (${existing.history.length} history entries)`);
  } else {
    await c.goal.insertOne(goalFromLens(await readLens()));
    console.log("goal: inserted version 1");
  }
  const inputs = await loadInputs();
  await upsertInputs(c, inputs);
  await printCounts(c, db);
}

async function printCounts(c: Collections, db: Db): Promise<void> {
  for (const name of Object.keys(c)) {
    console.log(`${name.padEnd(10)} ${await db.collection(name).countDocuments()}`);
  }
  const scheduled = await c.inputs.countDocuments({ scheduled: true });
  console.log(`inputs scheduled: ${scheduled}`);
  const byStatus = await db.collection("tasks").aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray();
  if (byStatus.length) console.log(`tasks by status: ${byStatus.map((s) => `${s._id} ${s.n}`).join(", ")}`);
}

const { values } = parseArgs({ options: { db: { type: "string" } }, strict: true });
if (values.db !== "live") {
  console.error("usage: npm run seed -- --db live");
  process.exit(2);
}
console.log(`seeding into database ${process.env.MONGODB_DB ?? "goalkeeper"}`);

const { c, db } = await connect();
try {
  await seedLive(c, db);
} finally {
  await close();
}
