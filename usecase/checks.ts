// Deterministic checks for the ARC use case. Plain code, no model. Each
// check takes (proposal, input, state) and returns pass or fail with
// reasons that name the pair and the first difference. Programs run only
// in usecase/sandbox.ts. Runs on Node 24 with no build step:
//   node usecase/check-samples.ts

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_PROGRAM_CHARS, runProgram, type Grid } from "./sandbox.ts";

export type Proposal = {
  key: string; // the ARC task id, equals the task key
  rule: string; // one sentence, the hypothesis in words
  program: string; // JavaScript defining transform(grid), under 8000 chars
};

export type Pair = { input: Grid; output: Grid };

// What the gate hands a check: the harness fields plus the index entry's
// extra fields (meta) spread flat. train and test come from inputs.json.
export type Input = {
  key: string;
  name: string;
  text: string;
  train: Pair[];
  test: { input: Grid }[];
  [extra: string]: unknown;
};

export type State = { merged: Record<string, unknown> };

export type CheckResult = { pass: boolean; reasons: string[] };
export type CheckKind = "schema" | "reproduces" | "general";
export type Check = (proposal: unknown, input: Input, state: State) => CheckResult;
export type ScoreFn = (proposal: unknown, input: Input) => 0 | 1;

export const CHECK_KINDS: CheckKind[] = ["schema", "reproduces", "general"];
const ALLOWED_KEYS = ["key", "rule", "program"];
const MAX_SIDE = 30;
const DEFINES_TRANSFORM = /(\bfunction\s+transform\s*\(|\b(?:const|let|var)\s+transform\s*=)/;

const ANSWERS_DIR = join(dirname(fileURLToPath(import.meta.url)), "answers");

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function size(g: Grid): string {
  return `${g.length}x${g[0]?.length ?? 0}`;
}

function isPairList(v: unknown): v is Pair[] {
  return Array.isArray(v) && v.every((p) => isRecord(p) && Array.isArray(p.input) && Array.isArray(p.output));
}

// A grid the puzzle accepts: 1 to 30 rows of equal length 1 to 30, every
// cell an integer 0 to 9. Returns the first problem or null.
export function gridProblem(v: unknown): string | null {
  if (!Array.isArray(v)) return `output is not a grid (got ${v === undefined ? "undefined" : typeof v})`;
  if (v.length < 1 || v.length > MAX_SIDE) return `output has ${v.length} rows, sides must be 1 to ${MAX_SIDE}`;
  const width = Array.isArray(v[0]) ? v[0].length : -1;
  for (let i = 0; i < v.length; i++) {
    const row: unknown = v[i];
    if (!Array.isArray(row)) return `output row ${i} is not an array`;
    if (row.length !== width) return `output rows have different lengths (row 0 has ${width}, row ${i} has ${row.length})`;
    for (let j = 0; j < row.length; j++) {
      const c: unknown = row[j];
      if (typeof c !== "number" || !Number.isInteger(c) || c < 0 || c > 9) return `output cell (${i},${j}) is ${JSON.stringify(c)}, cells must be integers 0 to 9`;
    }
  }
  if (width < 1 || width > MAX_SIDE) return `output has ${width} columns, sides must be 1 to ${MAX_SIDE}`;
  return null;
}

// The first difference between an output and the expected grid, or null.
export function firstDifference(got: unknown, expected: Grid): string | null {
  if (!Array.isArray(got) || !got.every((r) => Array.isArray(r))) return `expected ${size(expected)}, got ${got === undefined ? "undefined" : Array.isArray(got) ? "a flat array" : typeof got}`;
  const g = got as unknown[][];
  const gw = g[0]?.length ?? 0;
  if (g.length !== expected.length || gw !== (expected[0]?.length ?? 0) || g.some((r) => r.length !== gw)) {
    return `expected ${size(expected)}, got ${g.some((r) => r.length !== gw) ? "ragged rows" : size(g as Grid)}`;
  }
  for (let i = 0; i < expected.length; i++) {
    for (let j = 0; j < expected[i]!.length; j++) {
      const a = g[i]![j];
      const b = expected[i]![j];
      if (a !== b) return `cell (${i},${j}) is ${JSON.stringify(a)}, expected ${b}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------- schema

export const schema: Check = (proposal, input, state) => {
  const reasons: string[] = [];
  if (!isRecord(proposal)) return { pass: false, reasons: ["proposal is not an object"] };
  const p = proposal;

  for (const k of Object.keys(p)) if (!ALLOWED_KEYS.includes(k)) reasons.push(`unknown field "${k}"; the proposal has exactly key, rule and program`);
  for (const k of ALLOWED_KEYS) if (!(k in p)) reasons.push(`missing field "${k}"`);

  if (typeof p.key !== "string" || p.key !== input.key) reasons.push(`key must equal the task key "${input.key}", got ${JSON.stringify(p.key)}`);
  if ("rule" in p && (typeof p.rule !== "string" || p.rule.trim().length === 0)) reasons.push("rule must be a non-empty sentence");
  if ("program" in p) {
    if (typeof p.program !== "string" || p.program.trim().length === 0) reasons.push("program must be a non-empty string of JavaScript");
    else {
      if (p.program.length >= MAX_PROGRAM_CHARS) reasons.push(`program is ${p.program.length} characters; the limit is under ${MAX_PROGRAM_CHARS}`);
      if (!DEFINES_TRANSFORM.test(p.program)) reasons.push("program does not define transform(grid)");
    }
  }
  if (typeof p.key === "string" && state.merged[p.key]) reasons.push(`key "${p.key}" is already merged; a unit is never merged twice`);

  return { pass: reasons.length === 0, reasons };
};

// ------------------------------------------------------------ reproduces

export const reproduces: Check = (proposal, input) => {
  if (!isRecord(proposal)) return { pass: false, reasons: ["proposal is not an object"] };
  const program = proposal.program;
  if (typeof program !== "string") return { pass: false, reasons: ["program is not a string"] };
  if (!isPairList(input.train) || input.train.length === 0) return { pass: false, reasons: ["input has no example pairs"] };
  const reasons: string[] = [];
  input.train.forEach((pair, i) => {
    const r = runProgram(program, pair.input);
    if (!r.ok) {
      reasons.push(`pair ${i + 1}: ${r.error}`);
      return;
    }
    const diff = firstDifference(r.output, pair.output);
    if (diff) reasons.push(`pair ${i + 1}: ${diff}`);
  });
  return { pass: reasons.length === 0, reasons };
};

// --------------------------------------------------------------- general

// Every way an example output could be pasted into a program: as JSON, as
// digit rows, as the digits alone. Whitespace is ignored on both sides.
function literalForms(g: Grid): string[] {
  const rows = g.map((r) => r.join(""));
  const forms = [JSON.stringify(g), rows.join(","), rows.join("|"), rows.join(";")];
  if (g.length * (g[0]?.length ?? 0) >= 6) forms.push(rows.join(""));
  return forms.map((s) => s.replace(/\s+/g, ""));
}

export function hardcodedOutputs(program: string, train: Pair[]): number[] {
  const flat = program.replace(/\s+/g, "");
  const hits: number[] = [];
  train.forEach((pair, i) => {
    if (literalForms(pair.output).some((f) => flat.includes(f))) hits.push(i + 1);
  });
  return hits;
}

export const general: Check = (proposal, input) => {
  if (!isRecord(proposal)) return { pass: false, reasons: ["proposal is not an object"] };
  const program = proposal.program;
  if (typeof program !== "string") return { pass: false, reasons: ["program is not a string"] };
  const reasons: string[] = [];
  const train = isPairList(input.train) ? input.train : [];
  for (const i of hardcodedOutputs(program, train)) reasons.push(`pair ${i}: the program contains the example output as a literal; state the rule instead of memorizing`);
  const tests = Array.isArray(input.test) ? input.test : [];
  if (tests.length === 0) reasons.push("input has no test input");
  tests.forEach((t, i) => {
    const label = tests.length > 1 ? `test input ${i + 1}` : "test input";
    if (!isRecord(t) || !Array.isArray(t.input)) {
      reasons.push(`${label}: missing`);
      return;
    }
    const r = runProgram(program, t.input as Grid);
    if (!r.ok) {
      reasons.push(`${label}: ${r.error}`);
      return;
    }
    const problem = gridProblem(r.output);
    if (problem) reasons.push(`${label}: ${problem}`);
  });
  return { pass: reasons.length === 0, reasons };
};

// ----------------------------------------------------------------- score

// The hidden metric: the program on every test input against
// usecase/answers/<key>.json. Read here and nowhere else. Never throws.
export const score: ScoreFn = (proposal, input) => {
  try {
    if (!isRecord(proposal) || typeof proposal.program !== "string") return 0;
    if (!/^[a-z0-9]+$/i.test(input.key)) return 0;
    const answers = JSON.parse(readFileSync(join(ANSWERS_DIR, `${input.key}.json`), "utf8")) as { outputs: Grid[] };
    const tests = Array.isArray(input.test) ? input.test : [];
    if (!Array.isArray(answers.outputs) || answers.outputs.length !== tests.length || tests.length === 0) return 0;
    for (let i = 0; i < tests.length; i++) {
      const r = runProgram(proposal.program, tests[i]!.input);
      if (!r.ok) return 0;
      if (firstDifference(r.output, answers.outputs[i]!) !== null) return 0;
    }
    return 1;
  } catch {
    return 0;
  }
};

export const checks: Record<CheckKind, Check> = { schema, reproduces, general };

export function runAll(proposal: unknown, input: Input, state: State): Record<CheckKind, CheckResult> {
  return {
    schema: schema(proposal, input, state),
    reproduces: reproduces(proposal, input, state),
    general: general(proposal, input, state),
  };
}
