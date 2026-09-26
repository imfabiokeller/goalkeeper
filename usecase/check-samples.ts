// Runs every sample proposal in usecase/samples through the three checks
// and score(), and compares the outcome with what the sample says to expect.
//   node usecase/check-samples.ts
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHECK_KINDS, runAll, score, type CheckKind, type Input, type State } from "./checks.ts";

type Sample = {
  note: string;
  input: string; // key of the puzzle the proposal is about
  merged?: string[]; // keys already in state before this proposal
  expect: Record<CheckKind, boolean>;
  score?: 0 | 1; // what score() should return, when the sample says
  proposal: unknown;
};
type IndexEntry = { key: string; name: string; file: string; [extra: string]: unknown };

const here = dirname(fileURLToPath(import.meta.url));
const index: IndexEntry[] = JSON.parse(readFileSync(join(here, "inputs.json"), "utf8"));
const byKey = new Map(index.map((e) => [e.key, e]));

export function loadInput(key: string): Input {
  const e = byKey.get(key);
  if (!e) throw new Error(`no input with key ${key}`);
  const { key: _key, name, file, chars: _chars, ...meta } = e;
  return { ...meta, key, name, text: readFileSync(join(here, file), "utf8") } as Input;
}

const dir = join(here, "samples");
let failures = 0;
for (const name of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const sample: Sample = JSON.parse(readFileSync(join(dir, name), "utf8"));
  const input = loadInput(sample.input);
  const state: State = { merged: {} };
  for (const k of sample.merged ?? []) state.merged[k] = { key: k };
  const results = runAll(sample.proposal, input, state);
  console.log(`\n${name}: ${sample.note}`);
  for (const kind of CHECK_KINDS) {
    const r = results[kind];
    const ok = r.pass === sample.expect[kind];
    if (!ok) failures++;
    console.log(`  ${ok ? "ok " : "BAD"} ${kind.padEnd(10)} ${r.pass ? "pass" : "fail"} (expected ${sample.expect[kind] ? "pass" : "fail"})`);
    for (const reason of r.reasons) console.log(`      - ${reason}`);
  }
  if (sample.score !== undefined) {
    const s = score(sample.proposal, input);
    const ok = s === sample.score;
    if (!ok) failures++;
    console.log(`  ${ok ? "ok " : "BAD"} ${"score".padEnd(10)} ${s} (expected ${sample.score})`);
  }
}
console.log(failures === 0 ? "\nall samples behave as expected" : `\n${failures} check(s) did not behave as expected`);
process.exitCode = failures === 0 ? 0 : 1;
