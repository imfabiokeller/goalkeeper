// Runs every sample proposal in usecase/samples through the three checks
// and compares the outcome with what the sample says to expect.
//   node usecase/check-samples.ts
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAll, type CheckKind, type Input, type State } from "./checks.ts";

type Sample = {
  note: string;
  input: string; // key of the input the proposal is about
  merged?: string[]; // keys already in state before this proposal
  expect: Record<CheckKind, boolean>;
  proposal: unknown;
};
type IndexEntry = { key: string; company: string; ticker: string; filedAt: string; file: string };

const here = dirname(fileURLToPath(import.meta.url));
const index: IndexEntry[] = JSON.parse(readFileSync(join(here, "inputs.json"), "utf8"));
const byKey = new Map(index.map((e) => [e.key, e]));

export function loadInput(key: string): Input {
  const e = byKey.get(key);
  if (!e) throw new Error(`no input with key ${key}`);
  return { key, company: e.company, ticker: e.ticker, filedAt: e.filedAt, text: readFileSync(join(here, e.file), "utf8") };
}

const dir = join(here, "samples");
let failures = 0;
for (const name of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const sample: Sample = JSON.parse(readFileSync(join(dir, name), "utf8"));
  const input = loadInput(sample.input);
  const state: State = { merged: {} };
  for (const k of sample.merged ?? []) state.merged[k] = { key: k } as never;
  const results = runAll(sample.proposal, input, state);
  console.log(`\n${name}: ${sample.note}`);
  for (const kind of ["schema", "grounded", "consistent"] as const) {
    const r = results[kind];
    const ok = r.pass === sample.expect[kind];
    if (!ok) failures++;
    console.log(`  ${ok ? "ok " : "BAD"} ${kind.padEnd(10)} ${r.pass ? "pass" : "fail"} (expected ${sample.expect[kind] ? "pass" : "fail"})`);
    for (const reason of r.reasons) console.log(`      - ${reason}`);
  }
}
console.log(failures === 0 ? "\nall samples behave as expected" : `\n${failures} check(s) did not behave as expected`);
process.exitCode = failures === 0 ? 0 : 1;
