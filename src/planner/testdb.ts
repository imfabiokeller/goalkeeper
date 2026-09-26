// Test support: a real MongoDB from mongodb-memory-server, one per test
// file, plus fixture builders. Tests skip with a message when the binary
// cannot be downloaded (no network on this machine).

import { ObjectId } from "mongodb";
import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { collections, ensureIndexes, type Collections } from "../shared/db.ts";
import type { Goal, Input, Question, Source, State, Task } from "../shared/types.ts";

export type TestDb = { c: Collections; reset: () => Promise<void>; stop: () => Promise<void> };

export async function startTestDb(): Promise<TestDb | null> {
  let server: MongoMemoryServer;
  try {
    server = await MongoMemoryServer.create();
  } catch (err) {
    console.warn(`skipping planner tests: mongodb-memory-server could not start (${(err as Error).message})`);
    return null;
  }
  const client = new MongoClient(server.getUri());
  await client.connect();
  const db = client.db("goalkeeper-test");
  const c = collections(db);
  await ensureIndexes(c);
  return {
    c,
    reset: async () => {
      for (const col of Object.values(c)) await col.deleteMany({});
    },
    stop: async () => {
      await client.close();
      await server.stop();
    },
  };
}

export function goalFixture(over: Partial<Goal> = {}): Goal {
  return {
    _id: "goal",
    version: 1,
    statement: "Build a table of headline quarterly results from press releases.",
    criteria: [
      { id: "c1", kind: "all-units", text: "Every value is backed by a verbatim quote", check: { kind: "grounded", params: {} } },
      { id: "c2", kind: "all-units", text: "The figures agree with each other", check: { kind: "consistent", params: {} } },
    ],
    guidelines: ["Prefer GAAP figures over adjusted ones."],
    outOfScope: ["Guidance and forecasts."],
    proposalShape: "",
    history: [{ version: 1, at: new Date("2026-09-26T10:00:00Z"), by: "seed", diff: null }],
    ...over,
  };
}

export function inputFixture(key: string, over: Partial<Input> = {}): Input {
  return {
    _id: key,
    key,
    name: key.toUpperCase(),
    meta: {},
    text: `press release for ${key}`,
    chars: 20,
    scheduled: true,
    scheduledBy: "seed",
    createdAt: new Date(),
    ...over,
  };
}

export function taskFixture(key: string, over: Partial<Task> = {}): Task {
  const now = new Date();
  return {
    _id: new ObjectId(),
    key,
    criteria: ["c1", "c2"],
    version: 1,
    status: "open",
    priority: 0,
    attempt: 1,
    worker: null,
    heartbeat: null,
    proposal: null,
    gate: null,
    blockReason: null,
    hint: null,
    createdBy: "planner",
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

export function stateFixture(key: string, over: Partial<State> = {}): State {
  return {
    _id: key,
    key,
    version: 1,
    stateVersion: 1,
    data: { revenue: 1 },
    taskId: new ObjectId(),
    mergedAt: new Date(),
    ...over,
  };
}

export function crowdFixture(text: string, over: Partial<Source> = {}): Source {
  return {
    _id: new ObjectId(),
    kind: "crowd-request",
    taskId: null,
    key: null,
    version: 1,
    raw: { text },
    text,
    enrichment: null,
    tokens: { in: 0, out: 0, cost: 0 },
    handled: false,
    createdAt: new Date(),
    ...over,
  };
}

export function questionFixture(text: string, evidence: ObjectId[], over: Partial<Question> = {}): Question {
  return {
    _id: new ObjectId(),
    kind: "approval",
    question: `Adopt "${text}"?`,
    proposedDiff: { op: "add-guideline", text },
    evidence,
    status: "open",
    answeredBy: null,
    answeredAt: null,
    createdAt: new Date(),
    ...over,
  };
}
