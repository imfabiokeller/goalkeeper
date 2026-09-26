// Test harness: one memory MongoDB per test file, a fresh empty database
// before every test, and a skip with a message when there is no binary.

import { afterAll, beforeAll, test } from "vitest";
import type { Collections } from "../shared/db.ts";
import { startTestDb, type TestDb } from "./testdb.ts";

export function withDb(): (name: string, fn: (c: Collections) => Promise<void>) => void {
  let db: TestDb | null = null;
  beforeAll(async () => {
    db = await startTestDb();
  }, 180_000);
  afterAll(async () => {
    await db?.stop();
  });
  return (name, fn) =>
    test(name, async (ctx) => {
      if (!db) return ctx.skip();
      await db.reset();
      await fn(db.c);
    });
}
