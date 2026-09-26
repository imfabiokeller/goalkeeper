// One client per process, typed collection handles, and the index
// definitions. Every module gets its collections from here.

import { MongoClient, type Collection, type Db } from "mongodb";
import type { Goal, Input, Lock, Metrics, Source, State, Task } from "./types.ts";

export type Collections = {
  goal: Collection<Goal>;
  inputs: Collection<Input>;
  tasks: Collection<Task>;
  state: Collection<State>;
  sources: Collection<Source>;
  locks: Collection<Lock>;
  metrics: Collection<Metrics>;
};

let client: MongoClient | null = null;

export function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`missing env ${name}`);
  return v;
}

export async function connect(): Promise<{ db: Db; c: Collections; client: MongoClient }> {
  if (!client) {
    client = new MongoClient(env("MONGODB_URI"), {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
      appName: `goalkeeper-${process.env.ROLE ?? "cli"}`,
    });
    await client.connect();
  }
  const db = client.db(env("MONGODB_DB", "goalkeeper"));
  return { db, client, c: collections(db) };
}

export function collections(db: Db): Collections {
  return {
    goal: db.collection<Goal>("goal"),
    inputs: db.collection<Input>("inputs"),
    tasks: db.collection<Task>("tasks"),
    state: db.collection<State>("state"),
    sources: db.collection<Source>("sources"),
    locks: db.collection<Lock>("locks"),
    metrics: db.collection<Metrics>("metrics"),
  };
}

export async function close(): Promise<void> {
  await client?.close();
  client = null;
}

// Regular indexes. The Atlas Search (`txt`) and Vector Search (`vec`)
// indexes on `sources` are created by ensureSearchIndexes below and need
// an Atlas cluster.
export async function ensureIndexes(c: Collections): Promise<void> {
  await c.tasks.createIndexes([
    { key: { status: 1, priority: -1, createdAt: 1 }, name: "claim" },
    { key: { worker: 1, heartbeat: 1 }, name: "reaper" },
    { key: { key: 1, status: 1 }, name: "busy" },
  ]);
  await c.inputs.createIndexes([{ key: { scheduled: 1, key: 1 }, name: "scheduled" }]);
  await c.state.createIndexes([{ key: { version: 1 }, name: "version" }]);
  await c.sources.createIndexes([
    { key: { key: 1, kind: 1, createdAt: -1 }, name: "pinned" },
    { key: { createdAt: -1 }, name: "recent" },
  ]);
}

export const EMBEDDING_DIMENSIONS = 1024; // voyage-3.5

export async function ensureSearchIndexes(c: Collections): Promise<void> {
  const existing = new Set<string>();
  for await (const ix of c.sources.listSearchIndexes()) existing.add(ix.name);
  if (!existing.has("txt")) {
    await c.sources.createSearchIndex({
      name: "txt",
      type: "search",
      definition: {
        mappings: {
          dynamic: false,
          fields: {
            text: { type: "string" },
            enrichment: { type: "document", fields: { gist: { type: "string" } } },
            kind: { type: "token" },
            key: { type: "token" },
          },
        },
      },
    });
  }
  if (!existing.has("vec")) {
    await c.sources.createSearchIndex({
      name: "vec",
      type: "vectorSearch",
      definition: {
        fields: [
          { type: "vector", path: "enrichment.embedding", numDimensions: EMBEDDING_DIMENSIONS, similarity: "cosine" },
          { type: "filter", path: "kind" },
          { type: "filter", path: "key" },
        ],
      },
    });
  }
}
