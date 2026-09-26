// Fetches the 400 ARC-AGI-1 evaluation puzzles (fchollet/ARC-AGI,
// data/evaluation, Apache 2.0) and writes the use case fixture:
//   usecase/inputs/<id>.txt   the puzzle as text (examples plus test input)
//   usecase/inputs.json       the index with train/test grids as meta
//   usecase/answers/<id>.json the test outputs, read by score() only
// No dependencies, Node 24:
//   node usecase/tools/fetch-arc.ts

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Grid = number[][];
type Pair = { input: Grid; output: Grid };
type Puzzle = { train: Pair[]; test: Pair[] };

const usecase = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.github.com/repos/fchollet/ARC-AGI/contents/data/evaluation";
const RAW = "https://raw.githubusercontent.com/fchollet/ARC-AGI/master/data/evaluation";
const CHAR_LIMIT = 6000;

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const res = await fetch(url, { headers: { "user-agent": "goalkeeper-fetch-arc" } });
  if (!res.ok) {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return fetchJson<T>(url, attempt + 1);
    }
    throw new Error(`${url}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

function gridText(g: Grid): string {
  return g.map((row) => row.join(" ")).join("\n");
}

function size(g: Grid): string {
  return `${g.length}x${g[0]?.length ?? 0}`;
}

export function puzzleText(p: Puzzle): string {
  const parts: string[] = [];
  p.train.forEach((pair, i) => {
    parts.push(`Example ${i + 1} input (${size(pair.input)}):\n${gridText(pair.input)}`);
    parts.push(`Example ${i + 1} output (${size(pair.output)}):\n${gridText(pair.output)}`);
  });
  p.test.forEach((pair, i) => {
    const label = p.test.length > 1 ? `Test ${i + 1} input` : "Test input";
    parts.push(`${label} (${size(pair.input)}):\n${gridText(pair.input)}`);
  });
  return parts.join("\n\n") + "\n";
}

async function main(): Promise<void> {
  const listing = await fetchJson<{ name: string }[]>(API);
  const ids = listing
    .map((e) => e.name)
    .filter((n) => n.endsWith(".json"))
    .map((n) => n.slice(0, -5))
    .sort();
  console.log(`${ids.length} puzzles listed`);

  const inputsDir = join(usecase, "inputs");
  const answersDir = join(usecase, "answers");
  rmSync(inputsDir, { recursive: true, force: true });
  rmSync(answersDir, { recursive: true, force: true });
  mkdirSync(inputsDir, { recursive: true });
  mkdirSync(answersDir, { recursive: true });

  const index: unknown[] = [];
  const over: string[] = [];
  const CONCURRENCY = 8;
  const puzzles = new Map<string, Puzzle>();
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const got = await Promise.all(batch.map((id) => fetchJson<Puzzle>(`${RAW}/${id}.json`)));
    batch.forEach((id, j) => puzzles.set(id, got[j]!));
    process.stdout.write(`\r${puzzles.size}/${ids.length} fetched`);
  }
  console.log();

  for (const id of ids) {
    const p = puzzles.get(id)!;
    const text = puzzleText(p);
    if (text.length > CHAR_LIMIT) over.push(`${id} (${text.length})`);
    writeFileSync(join(inputsDir, `${id}.txt`), text);
    writeFileSync(join(answersDir, `${id}.json`), JSON.stringify({ outputs: p.test.map((t) => t.output) }) + "\n");
    index.push({
      key: id,
      name: id,
      file: `inputs/${id}.txt`,
      chars: text.length,
      train: p.train.map((t) => ({ input: t.input, output: t.output })),
      test: p.test.map((t) => ({ input: t.input })),
    });
  }
  writeFileSync(join(usecase, "inputs.json"), JSON.stringify(index) + "\n");
  console.log(`wrote ${index.length} inputs, ${over.length} over ${CHAR_LIMIT} chars${over.length ? ": " + over.join(", ") : ""}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
