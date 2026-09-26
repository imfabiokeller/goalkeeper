// The live input loader: usecase/inputs.json plus the text files it points
// at, as validated `Input` documents. Pure apart from reading the folder.

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Input } from "../shared/types.ts";

export const SCHEDULED_COUNT = 400; // all puzzles, no reserve

export const USECASE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../usecase");

// Only the fields the harness reads are named; everything else in an
// entry is domain data and lands in `meta` untouched.
const IndexEntry = z
  .object({
    key: z.string().min(1),
    name: z.string().min(1).optional(),
    file: z.string().min(1),
    source: z.string().optional(),
    chars: z.number().int().optional(),
  })
  .passthrough();
export type IndexEntry = z.infer<typeof IndexEntry>;

const HARNESS_FIELDS = new Set(["key", "name", "file", "source", "chars", "text"]);

export function entryName(e: IndexEntry): string {
  return e.name ?? e.key;
}

export function entryMeta(e: IndexEntry): Record<string, unknown> {
  return Object.fromEntries(Object.entries(e).filter(([k]) => !HARNESS_FIELDS.has(k)));
}

export async function readIndex(usecaseDir: string = USECASE_DIR): Promise<IndexEntry[]> {
  const raw = JSON.parse(await readFile(join(usecaseDir, "inputs.json"), "utf8"));
  return z.array(IndexEntry).parse(raw);
}

export async function readLens(usecaseDir: string = USECASE_DIR): Promise<unknown> {
  return JSON.parse(await readFile(join(usecaseDir, "lens.json"), "utf8"));
}

// The first SCHEDULED_COUNT entries in file order are scheduled by the
// seed, the rest are the reserve that crowd requests can light up.
export async function loadInputs(usecaseDir: string = USECASE_DIR, now: Date = new Date()): Promise<Input[]> {
  const index = await readIndex(usecaseDir);
  const out: Input[] = [];
  for (const [i, e] of index.entries()) {
    const text = await readFile(join(usecaseDir, e.file), "utf8");
    out.push(
      Input.parse({
        _id: e.key,
        key: e.key,
        name: entryName(e),
        meta: entryMeta(e),
        source: e.source,
        text,
        chars: text.length,
        scheduled: i < SCHEDULED_COUNT,
        scheduledBy: i < SCHEDULED_COUNT ? "seed" : null,
        createdAt: now,
      }),
    );
  }
  return out;
}
