// The baseline: the same cheap model, one shot, no harness. One
// generateText call per puzzle with no tools, no retries, no feedback and
// no library; the answer goes through the same gate and the same score()
// as a worker's proposal. The number this prints is the dashed line
// "same model, single shot" on the stage view's curve. Node 24, no build:
//   node --env-file=.env usecase/tools/baseline.ts --n 40 --concurrency 5 --out usecase/tools/baseline.json
// --keys a,b,c picks puzzles by hand; --attempts 2 takes two independent
// samples per puzzle (ARC's official rule: solved if either is right).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { CHECK_KINDS, checks, score, type CheckKind, type Input, type State } from "../checks.ts";
import { costUsd, workerModel, workerProviderOptions } from "../../src/shared/llm.ts";

const usecase = join(dirname(fileURLToPath(import.meta.url)), "..");

export const MAX_OUTPUT_TOKENS = 8000;

export const SYSTEM =
  "You solve ARC puzzles. A puzzle is a few example pairs (input grid, output grid) and one test input; the same hidden rule maps every input to its output. " +
  "Grids are rows of digits 0 to 9, one row per line. Sizes are given; the output size can differ from the input size. " +
  "Reply with a JSON object with two fields. " +
  '"rule": the rule in one sentence. ' +
  '"program": JavaScript source in a fenced code block (```javascript ... ```) that defines function transform(grid) taking a 2D array of integers 0 to 9 and returning the output as a 2D array of integers 0 to 9. ' +
  "No imports, no I/O, no comments needed, under 8000 characters. Never copy an example output into the program: state the rule as code so it works on the test input too.";

const Answer = z.object({
  rule: z.string().describe("The rule in one sentence."),
  program: z.string().describe("JavaScript defining function transform(grid), in a fenced code block."),
});

export type IndexEntry = { key: string; name: string; file: string; chars: number; [extra: string]: unknown };

export type SampleResult = {
  gatePass: boolean;
  checks: Record<CheckKind, boolean>;
  firstReason: string | null;
  score: 0 | 1;
  tokensIn: number;
  tokensOut: number;
  seconds: number;
  error?: string;
  rule?: string;
};

export type PuzzleResult = SampleResult & { key: string; attempts?: SampleResult[]; solvedAt2?: boolean };

export type Report = {
  puzzles: PuzzleResult[];
  totals: {
    n: number;
    attempts: number;
    gatePassRate: number;
    solveRate: number;
    solveRateAt2?: number;
    errors: number;
    tokens: { in: number; out: number };
    costUsd: number;
    model: string;
    seconds: number;
    finishedAt: string;
  };
};

// ------------------------------------------------------------ puzzles

export function loadIndex(): IndexEntry[] {
  return JSON.parse(readFileSync(join(usecase, "inputs.json"), "utf8")) as IndexEntry[];
}

export function readPuzzleText(entry: IndexEntry): string {
  return readFileSync(join(usecase, entry.file), "utf8");
}

// The check input the gate builds: the index entry's extra fields (the
// grids) spread flat, then the harness fields. Same shape as src/gate/gate.ts.
export function checkInput(entry: IndexEntry, text: string): Input {
  const { key, name, file: _file, chars: _chars, ...meta } = entry;
  return { ...meta, key, name, text } as Input;
}

// N keys spread over the sorted set: every k-th, deterministic.
export function pickKeys(all: string[], n: number): string[] {
  const sorted = [...all].sort();
  if (n >= sorted.length) return sorted;
  const step = Math.floor(sorted.length / n);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(sorted[i * step]!);
  return out;
}

// The program field as source: a fenced block is unwrapped if the model
// followed the format, and left alone otherwise.
export function unfence(program: string): string {
  const m = /```[a-zA-Z]*\s*\n([\s\S]*?)\n?```/.exec(program);
  return (m ? m[1]! : program).trim();
}

// ------------------------------------------------------------ one shot

export function judge(proposal: unknown, input: Input): Pick<SampleResult, "gatePass" | "checks" | "firstReason" | "score"> {
  const state: State = { merged: {} };
  const results = {} as Record<CheckKind, boolean>;
  let firstReason: string | null = null;
  for (const kind of CHECK_KINDS) {
    let pass = false;
    let reasons: string[] = [];
    try {
      const r = checks[kind](proposal, input, state);
      pass = r.pass;
      reasons = r.reasons;
    } catch (err) {
      reasons = [`check ${kind} threw: ${err instanceof Error ? err.message : String(err)}`];
    }
    results[kind] = pass;
    if (!pass && firstReason === null) firstReason = reasons[0] ?? `${kind} failed`;
  }
  const gatePass = CHECK_KINDS.every((k) => results[k]);
  return { gatePass, checks: results, firstReason, score: gatePass ? score(proposal, input) : 0 };
}

export async function sampleOnce(entry: IndexEntry, text: string, model: LanguageModel): Promise<SampleResult> {
  const t0 = Date.now();
  const failed = (partial: Partial<SampleResult>): SampleResult => ({
    gatePass: false,
    checks: { schema: false, reproduces: false, general: false },
    firstReason: null,
    score: 0,
    tokensIn: 0,
    tokensOut: 0,
    seconds: (Date.now() - t0) / 1000,
    ...partial,
  });
  try {
    const result = await generateText({
      model,
      providerOptions: workerProviderOptions(),
      output: Output.object({ schema: Answer, name: "answer" }),
      system: SYSTEM,
      prompt: text,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });
    const tokensIn = result.totalUsage.inputTokens ?? 0;
    const tokensOut = result.totalUsage.outputTokens ?? 0;
    const proposal = { key: entry.key, rule: result.output.rule, program: unfence(result.output.program) };
    return { ...judge(proposal, checkInput(entry, text)), tokensIn, tokensOut, seconds: (Date.now() - t0) / 1000, rule: proposal.rule };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failed({ error: message, firstReason: `provider error: ${message}` });
  }
}

export async function samplePuzzle(entry: IndexEntry, model: LanguageModel, attempts: number): Promise<PuzzleResult> {
  const text = readPuzzleText(entry);
  const first = await sampleOnce(entry, text, model);
  if (attempts <= 1) return { key: entry.key, ...first };
  const rest: SampleResult[] = [];
  for (let i = 1; i < attempts; i++) rest.push(await sampleOnce(entry, text, model));
  const all = [first, ...rest];
  return {
    key: entry.key,
    ...first,
    tokensIn: all.reduce((s, a) => s + a.tokensIn, 0),
    tokensOut: all.reduce((s, a) => s + a.tokensOut, 0),
    seconds: all.reduce((s, a) => s + a.seconds, 0),
    attempts: all,
    solvedAt2: all.some((a) => a.score === 1),
  };
}

// ------------------------------------------------------------ the run

export type RunOptions = {
  keys: string[];
  concurrency: number;
  attempts: number;
  model: LanguageModel;
  modelName: string;
  onDone?: (r: PuzzleResult, done: number, total: number) => void;
};

async function pool<T, R>(items: T[], size: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(size, items.length)) }, lane));
  return out;
}

export async function runBaseline(opts: RunOptions): Promise<Report> {
  const index = loadIndex();
  const byKey = new Map(index.map((e) => [e.key, e]));
  const entries = opts.keys.map((k) => {
    const e = byKey.get(k);
    if (!e) throw new Error(`unknown puzzle key ${k}`);
    return e;
  });
  const t0 = Date.now();
  let done = 0;
  const puzzles = await pool(entries, opts.concurrency, async (e) => {
    const r = await samplePuzzle(e, opts.model, opts.attempts);
    done++;
    opts.onDone?.(r, done, entries.length);
    return r;
  });
  const n = puzzles.length;
  const tokens = {
    in: puzzles.reduce((s, p) => s + p.tokensIn, 0),
    out: puzzles.reduce((s, p) => s + p.tokensOut, 0),
  };
  const rate = (count: number) => (n === 0 ? 0 : count / n);
  const totals: Report["totals"] = {
    n,
    attempts: opts.attempts,
    gatePassRate: rate(puzzles.filter((p) => p.gatePass).length),
    solveRate: rate(puzzles.filter((p) => p.score === 1).length),
    errors: puzzles.filter((p) => p.error !== undefined).length,
    tokens,
    costUsd: costUsd("worker", tokens.in, tokens.out),
    model: opts.modelName,
    seconds: (Date.now() - t0) / 1000,
    finishedAt: new Date().toISOString(),
  };
  if (opts.attempts > 1) totals.solveRateAt2 = rate(puzzles.filter((p) => p.solvedAt2).length);
  return { puzzles, totals };
}

export function summary(r: Report): string {
  const t = r.totals;
  const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
  const at2 = t.solveRateAt2 === undefined ? "" : ` solve@2 ${pct(t.solveRateAt2)}`;
  return `baseline ${t.model}: n=${t.n} gate ${pct(t.gatePassRate)} solve ${pct(t.solveRate)}${at2} errors ${t.errors} tokens ${t.tokens.in}/${t.tokens.out} cost $${t.costUsd.toFixed(3)} in ${t.seconds.toFixed(0)}s`;
}

// ------------------------------------------------------------ cli

export function parseArgs(argv: string[]): { n: number; keys: string[] | null; concurrency: number; attempts: number; out: string } {
  const opts = { n: 40, keys: null as string[] | null, concurrency: 5, attempts: 1, out: join(usecase, "tools", "baseline.json") };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const v = () => {
      const x = argv[++i];
      if (x === undefined) throw new Error(`${a} needs a value`);
      return x;
    };
    if (a === "--n") opts.n = Number(v());
    else if (a === "--keys") opts.keys = v().split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--concurrency") opts.concurrency = Number(v());
    else if (a === "--attempts") opts.attempts = Number(v());
    else if (a === "--out") opts.out = v();
    else throw new Error(`unknown argument ${a}`);
  }
  for (const [k, x] of [["--n", opts.n], ["--concurrency", opts.concurrency], ["--attempts", opts.attempts]] as const) {
    if (!Number.isInteger(x) || x < 1) throw new Error(`${k} must be a positive integer`);
  }
  return opts;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const keys = args.keys ?? pickKeys(loadIndex().map((e) => e.key), args.n);
  const modelName = process.env.WORKER_MODEL ?? "deepseek/deepseek-v4-pro";
  console.log(`baseline: ${keys.length} puzzles, ${args.attempts} attempt(s) each, concurrency ${args.concurrency}, model ${modelName}`);
  const report = await runBaseline({
    keys,
    concurrency: args.concurrency,
    attempts: args.attempts,
    model: workerModel(),
    modelName,
    onDone: (r, done, total) => {
      const verdict = r.error ? `error: ${r.error.slice(0, 80)}` : r.score === 1 ? "solved" : r.gatePass ? "gate pass, wrong on test" : `gate fail: ${r.firstReason ?? ""}`.slice(0, 100);
      console.log(`[${done}/${total}] ${r.key} ${verdict} (${r.seconds.toFixed(0)}s)`);
    },
  });
  writeFileSync(args.out, JSON.stringify(report, null, 2) + "\n");
  console.log(summary(report));
  console.log(`wrote ${args.out}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
