// Realistic fakes for the dev database, so the screen can be built before
// the workers run. Everything is derived from a seeded PRNG and a fixed
// `now`, so two runs with the same arguments produce the same documents.
// Every document is validated with its Zod schema before it is returned.

import { ObjectId } from "mongodb";
import { lessonsFrom } from "../planner/lessons.ts";
import { EMBEDDING_DIMENSIONS } from "../shared/db.ts";
import { goalFromLens } from "../shared/goal.ts";
import {
  Goal,
  Input,
  Lock,
  Metrics,
  Question,
  Source,
  State,
  Task,
  type GateResult,
  type Tokens,
} from "../shared/types.ts";
import type { z } from "zod";
import { MetricsMinute, SolveBucket } from "../shared/types.ts";

type Minute = z.infer<typeof MetricsMinute>;
import { rng, type Rng } from "./rng.ts";

export type DevData = {
  goal: Goal;
  inputs: Input[];
  tasks: Task[];
  state: State[];
  sources: Source[];
  questions: Question[];
  locks: Lock[];
  metrics: Metrics;
};

export const WORKERS = Array.from({ length: 20 }, (_, i) => `w-${String(i + 1).padStart(2, "0")}`);
export const CRITERIA = ["c1", "c2", "c3"];
export const CHECKS = ["reproduces", "general", "schema"] as const;

const MINUTE = 60_000;

export const APPROVED_GUIDELINE = "When every example output has the same size, build a grid of that size first and fill it; size failures are the most common failure.";
export const REJECTED_GUIDELINE = "After three failed hypotheses, submit the program that reproduces the most pairs.";
export const OPEN_GUIDELINE = "Try the eight flips and rotations before writing a bespoke rule; a quarter of the puzzles are symmetries of the input.";

const V1_BLOCK_REASONS = [
  "Three hypotheses tried (mirror, crop to bounding box, recolor by count); every output size differs from the input and no rule fits all pairs",
  "Output size varies per pair (3x3, 5x5, 4x4) and does not follow from any object count in the input; size rule unclear",
  "Pairs 1 and 2 fit a flood fill of enclosed regions, pair 3 does not; no single rule found in three hypotheses",
  "Output size is 1x1 in every pair but the color is neither the most nor the least frequent; three hypotheses failed",
];

const V2_BLOCK_REASONS = [
  "Rule needs object tracking across a 30x30 grid; three hypotheses (gravity, component sort, symmetry completion) all fail pair 2",
  "Every hypothesis reproduces the size but the cell rule depends on a diagonal pattern not stated in any example",
  "Program times out on the test input at 1 s; the flood fill over 900 cells recurses too deep",
  "Pairs disagree: the same input pattern maps to different colors in pair 1 and pair 3; three hypotheses tried",
  "The test input has a color that appears in no example; no rule covers it after three hypotheses",
];

const PARK_REASONS = [
  "Using a frontier model is out of scope: only cheap open-weight models on the allowed list",
  "ARC-AGI-2 puzzles are outside the loaded set; out of scope",
  "Revealing a test output is out of scope: the hidden answer never reaches a worker or the screen",
  "Ranking workers or models is out of scope",
  "Request names no puzzle in the loaded set: nothing to schedule",
  "Changing how puzzles are scored is out of scope",
];

const CROWD_REQUESTS: { text: string; outcome: "task" | "recheck" | "proposal" | "parked"; reason: string }[] = [
  { text: "add puzzle 0a1d4ef5", outcome: "task", reason: "0a1d4ef5 is in the reserve and not merged; queued with priority" },
  { text: "do the small puzzles next", outcome: "task", reason: "14 puzzles under 500 characters in the reserve; queued with priority" },
  { text: "try the ones with 3x3 outputs", outcome: "task", reason: "9 puzzles with 3x3 outputs in the reserve; queued with priority" },
  { text: "add 833dafe3 and 2072aba6", outcome: "task", reason: "two puzzles in the reserve; queued with priority" },
  { text: "can you queue the symmetry puzzles", outcome: "task", reason: "11 puzzles with mirrored outputs in the reserve; queued with priority" },
  { text: "60c09cac looks hardcoded, check it again", outcome: "recheck", reason: "60c09cac is merged; recheck queued" },
  { text: "recheck 66e6c45b, the program only handles 4x4", outcome: "recheck", reason: "66e6c45b is merged; recheck queued" },
  { text: "00576224 passes the examples but the test input has a new color", outcome: "recheck", reason: "00576224 is merged; recheck queued" },
  { text: "always check output size first", outcome: "proposal", reason: "guideline change; proposed to the inbox" },
  { text: "submit the best partial program after three tries", outcome: "proposal", reason: "guideline change; proposed to the inbox" },
  { text: "use GPT for the hard ones", outcome: "parked", reason: PARK_REASONS[0]! },
  { text: "solve ARC-2", outcome: "parked", reason: PARK_REASONS[1]! },
  { text: "show me the answer for 66e6c45b", outcome: "parked", reason: PARK_REASONS[2]! },
  { text: "which worker is best", outcome: "parked", reason: PARK_REASONS[3]! },
];

const UNHANDLED_REQUESTS = ["add 4cd1b7b2", "rank puzzles by difficulty", "do the 30x30 ones"];

// Rule and program pairs a worker could plausibly submit. The rule is what
// the library indexes; the program is real JavaScript in the sandbox shape.
const PROGRAMS: { rule: string; program: string; query: string }[] = [
  {
    rule: "Mirror the grid left to right.",
    program: "function transform(grid) {\n  return grid.map((row) => [...row].reverse());\n}",
    query: "mirror flip horizontal",
  },
  {
    rule: "Scale the grid up by two: every cell becomes a 2x2 block of its color.",
    program: "function transform(grid) {\n  const out = [];\n  for (const row of grid) {\n    const r = row.flatMap((c) => [c, c]);\n    out.push(r, [...r]);\n  }\n  return out;\n}",
    query: "upscale block size doubles",
  },
  {
    rule: "Keep every other row and column, starting from the first.",
    program: "function transform(grid) {\n  return grid.filter((_, i) => i % 2 === 0).map((row) => row.filter((_, j) => j % 2 === 0));\n}",
    query: "downsample half size",
  },
  {
    rule: "Tile the input three by three, flipping the middle band left to right.",
    program: "function transform(grid) {\n  const flipped = grid.map((row) => [...row].reverse());\n  const band = (g) => g.map((row) => [...row, ...row, ...row]);\n  return [...band(grid), ...band(flipped), ...band(grid)];\n}",
    query: "tile repeat pattern alternating",
  },
  {
    rule: "Crop to the bounding box of the non-black cells.",
    program: "function transform(grid) {\n  let r0 = grid.length, r1 = -1, c0 = grid[0].length, c1 = -1;\n  grid.forEach((row, i) => row.forEach((c, j) => { if (c) { r0 = Math.min(r0, i); r1 = Math.max(r1, i); c0 = Math.min(c0, j); c1 = Math.max(c1, j); } }));\n  return grid.slice(r0, r1 + 1).map((row) => row.slice(c0, c1 + 1));\n}",
    query: "bounding box crop object",
  },
  {
    rule: "Swap the two most frequent non-black colors.",
    program: "function transform(grid) {\n  const count = new Map();\n  for (const row of grid) for (const c of row) if (c) count.set(c, (count.get(c) || 0) + 1);\n  const [a, b] = [...count.entries()].sort((x, y) => y[1] - x[1]).map((e) => e[0]);\n  return grid.map((row) => row.map((c) => (c === a ? b : c === b ? a : c)));\n}",
    query: "swap colors recolor",
  },
  {
    rule: "Fill every enclosed black region with the color of its border.",
    program: "function transform(grid) {\n  const h = grid.length, w = grid[0].length;\n  const out = grid.map((row) => [...row]);\n  const seen = grid.map((row) => row.map(() => false));\n  const fill = (i, j) => {\n    const stack = [[i, j]]; const cells = []; let border = 0; let open = false;\n    while (stack.length) {\n      const [y, x] = stack.pop();\n      if (y < 0 || x < 0 || y >= h || x >= w) { open = true; continue; }\n      if (seen[y][x]) continue;\n      if (grid[y][x]) { border = grid[y][x]; continue; }\n      seen[y][x] = true; cells.push([y, x]);\n      stack.push([y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]);\n    }\n    if (!open) for (const [y, x] of cells) out[y][x] = border;\n  };\n  for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) if (!grid[i][j] && !seen[i][j]) fill(i, j);\n  return out;\n}",
    query: "flood fill enclosed region border color",
  },
  {
    rule: "Rotate the grid a quarter turn clockwise.",
    program: "function transform(grid) {\n  const h = grid.length, w = grid[0].length;\n  const out = [];\n  for (let j = 0; j < w; j++) { const row = []; for (let i = h - 1; i >= 0; i--) row.push(grid[i][j]); out.push(row); }\n  return out;\n}",
    query: "rotate quarter turn",
  },
];

// ------------------------------------------------------------ helpers

function oid(r: Rng, at: Date): ObjectId {
  // Timestamp prefix so ids sort with creation time, random tail from the PRNG.
  const secs = Math.floor(at.getTime() / 1000).toString(16).padStart(8, "0");
  return new ObjectId(secs + r.hex(16));
}

function embedding(r: Rng): number[] {
  const out = new Array<number>(EMBEDDING_DIMENSIONS);
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) out[i] = Math.round((r.next() * 2 - 1) * 1e4) / 1e5;
  return out;
}

function tokens(r: Rng, kind: "run" | "gate" | "planner" | "small"): Tokens {
  const inn =
    kind === "run" ? r.int(8_000, 18_000) : kind === "gate" ? 0 : kind === "planner" ? r.int(1_500, 4_000) : r.int(40, 300);
  const out = kind === "run" ? r.int(300, 1_200) : kind === "gate" ? 0 : kind === "planner" ? r.int(100, 600) : r.int(0, 80);
  return { in: inn, out, cost: Math.round((inn * 3e-6 + out * 15e-6) * 1e6) / 1e6 };
}

// -------------------------------------------------------- proposals

export type Proposal = {
  key: string;
  rule: string;
  program: string;
  [extra: string]: unknown;
};

type Grid = number[][];

function pairs(input: Input): { input: Grid; output: Grid }[] {
  const train = input.meta.train;
  return Array.isArray(train) ? (train as { input: Grid; output: Grid }[]) : [];
}

function sizeOf(g: Grid | undefined): string {
  return g ? `${g.length}x${g[0]?.length ?? 0}` : "3x3";
}

// A plausible passing proposal for a puzzle, shaped like usecase/samples/01
// and 02: one of the stock rules, picked per key.
export function fakeProposal(r: Rng, input: Input): Proposal {
  const t = r.pick(PROGRAMS);
  return { key: input.key, rule: t.rule, program: t.program };
}

// A proposal that fails one named check, with the reasons the gate would give.
export function fakeFailingProposal(
  r: Rng,
  input: Input,
  check: (typeof CHECKS)[number],
): { proposal: Proposal; reasons: string[] } {
  const p = fakeProposal(r, input);
  const train = pairs(input);
  if (check === "reproduces") {
    const n = Math.max(1, train.length);
    const pair = r.int(1, n);
    const expected = train[pair - 1]?.output;
    const got = train[pair - 1]?.input;
    const sizeFail = r.chance(0.6) && sizeOf(expected) !== sizeOf(got);
    const reasons = sizeFail
      ? [`pair ${pair}: expected ${sizeOf(expected)}, got ${sizeOf(got)}`]
      : [`pair ${pair}: cell (${r.int(0, 4)},${r.int(0, 4)}) is ${r.int(1, 9)}, expected ${r.int(0, 9)}`];
    if (r.chance(0.4) && n > 1) reasons.push(`pair ${(pair % n) + 1}: cell (${r.int(0, 4)},${r.int(0, 4)}) is ${r.int(1, 9)}, expected 0`);
    return { proposal: p, reasons };
  }
  if (check === "general") {
    if (r.chance(0.5)) {
      const literal = JSON.stringify(train[0]?.output ?? [[0, 0], [0, 0]]);
      p.rule = "Look the answer up from the examples.";
      p.program = `function transform(grid) {\n  const known = { "${train.length}": ${literal} };\n  return known[String(grid.length)] || grid;\n}`;
      return { proposal: p, reasons: [`pair 1: the program contains the example output as a literal; state the rule instead of memorizing`] };
    }
    p.program = "function transform(grid) {\n  const out = grid.map((row) => [...row]);\n  let i = 0;\n  while (i < grid.length) { if (grid[i].some((c) => c === 5)) i = 0; else i++; }\n  return out;\n}";
    return { proposal: p, reasons: [`test input: timeout: program ran longer than 1000 ms`] };
  }
  const kind = r.pick(["notransform", "extra", "long"] as const);
  if (kind === "notransform") {
    p.program = p.program.replace("function transform", "function solve");
    return { proposal: p, reasons: ["program does not define transform(grid)"] };
  }
  if (kind === "extra") {
    p.notes = "tried mirror first";
    return { proposal: p, reasons: [`unknown field "notes"; the proposal has exactly key, rule and program`] };
  }
  const chars = r.int(4000, 5200);
  p.program = p.program + "\n" + "// ".repeat(Math.ceil((chars - p.program.length) / 3));
  return { proposal: p, reasons: [`program is ${p.program.length} characters; the limit is under 4000`] };
}

function gatePass(): GateResult {
  return { pass: true, reasons: [], checks: Object.fromEntries(CHECKS.map((c) => [c, { pass: true, reasons: [] }])) };
}

function gateFail(check: (typeof CHECKS)[number], reasons: string[]): GateResult {
  return {
    pass: false,
    reasons,
    checks: Object.fromEntries(CHECKS.map((c) => [c, c === check ? { pass: false, reasons } : { pass: true, reasons: [] }])),
  };
}

// ---------------------------------------------------------- sources

type SourceDraft = Omit<Source, "_id" | "enrichment"> & { labels?: string[]; fields?: string[] };

function enrich(r: Rng, gist: string, keys: string[], fields: string[], labels: string[]) {
  return { gist, entities: { keys, fields }, labels, embedding: embedding(r) };
}

function workerRun(
  r: Rng,
  task: Task,
  worker: string,
  at: Date,
  outcome: "merged" | "failed" | "blocked",
  proposal: Proposal | null,
  reason: string | null,
): Source {
  const steps = r.int(6, 19);
  const seconds = r.int(20, 75);
  const tools = ["read_input", "read_state", "search_library", "try_submit", "try_submit", "search_library"];
  const stepList = Array.from({ length: steps }, (_, i) => {
    const last = i === steps - 1;
    const tool = last ? (outcome === "blocked" ? "block" : "submit") : r.pick(tools);
    const args =
      tool === "read_input"
        ? { key: task.key, offset: i * 6000 }
        : tool === "read_state"
          ? { key: task.key }
          : tool === "search_library"
            ? { query: r.pick(PROGRAMS).query }
            : tool === "try_submit"
              ? { proposal: proposal ?? fakeProposal(r, { key: task.key, meta: {} } as Input) }
              : tool === "block"
                ? { reason }
                : { proposal };
    return { step: i + 1, tool, args, resultChars: tool === "submit" || tool === "block" ? 0 : r.int(400, 6000), tokens: r.int(300, 1500) };
  });
  type Message = { role: string; content: string; name?: string; toolCalls?: { name: string; args: unknown }[] };
  const messages: Message[] = [
    { role: "system", content: "You solve an ARC puzzle by writing transform(grid) that reproduces every example pair. Follow the goal and the guidelines exactly." },
    { role: "user", content: `Task ${task._id.toHexString()} on ${task.key} under goal version ${task.version}. Criteria ${task.criteria.join(", ")}.` },
    ...stepList.flatMap((s) => [
      { role: "assistant", content: "", toolCalls: [{ name: s.tool, args: s.args }] },
      { role: "tool", name: s.tool, content: s.tool === "submit" ? "submitted" : s.tool === "block" ? "blocked" : `[${s.resultChars} chars]` },
    ]),
  ];
  const text = messages.map((m) => `${m.role}: ${m.content || JSON.stringify(m.toolCalls)}`).join("\n");
  const gist =
    outcome === "merged"
      ? `${worker} solved ${task.key} in ${steps} steps: ${proposal ? proposal.rule : "?"}`
      : outcome === "failed"
        ? `${worker} submitted a program for ${task.key} after ${steps} steps; it did not pass the gate`
        : `${worker} blocked ${task.key} after ${steps} steps: ${reason}`;
  return Source.parse({
    _id: oid(r, at),
    kind: "worker-run",
    taskId: task._id,
    key: task.key,
    version: task.version,
    raw: { worker, attempt: task.attempt, seconds, steps: stepList, messages, proposal, outcome, reason },
    text,
    enrichment: enrich(r, gist, [task.key], proposal ? ["rule", "program"] : [], ["worker-run", outcome, ...(reason && /size/i.test(reason) ? ["size"] : [])]),
    tokens: tokens(r, "run"),
    createdAt: at,
  });
}

function gateSource(r: Rng, task: Task, at: Date, proposal: Proposal, gate: GateResult): Source {
  const failed = Object.entries(gate.checks).filter(([, c]) => !c.pass).map(([k]) => k);
  const gist = gate.pass
    ? `gate passed ${task.key}: reproduces, general, schema`
    : `gate failed ${task.key} on ${failed.join(", ")}: ${gate.reasons[0]}`;
  return Source.parse({
    _id: oid(r, at),
    kind: "gate",
    taskId: task._id,
    key: task.key,
    version: task.version,
    raw: { proposal, gate, checks: CHECKS },
    text: `${gist}\n${gate.reasons.join("\n")}\n${JSON.stringify(proposal)}`,
    enrichment: enrich(r, gist, [task.key], gate.reasons.map((x) => x.split(" ")[0]!), ["gate", gate.pass ? "pass" : "fail", ...failed]),
    tokens: tokens(r, "gate"),
    createdAt: at,
  });
}

function errorSource(r: Rng, task: Task, worker: string, at: Date): Source {
  const message = r.pick([
    "heartbeat older than 30 s, task returned to open by the reaper",
    "model request timed out after 120 s",
    "OpenRouter returned 429: rate limited",
    "iteration deadline of 4 minutes exceeded",
    "worker process received SIGKILL",
  ]);
  return Source.parse({
    _id: oid(r, at),
    kind: "error",
    taskId: task._id,
    key: task.key,
    version: task.version,
    raw: { worker, attempt: task.attempt, error: message, stack: `Error: ${message}\n    at run (src/worker/run.ts:88:11)` },
    text: `${worker} on ${task.key}: ${message}`,
    enrichment: enrich(r, `${worker} lost ${task.key}: ${message}`, [task.key], [], ["error", "requeue"]),
    tokens: tokens(r, "small"),
    createdAt: at,
  });
}

// ----------------------------------------------------------- tasks

type Phase = "v1" | "v2" | "crowd" | "recheck" | "parked";

function baseTask(r: Rng, key: string, version: number, createdAt: Date, createdBy: string, priority: 0 | 1): Task {
  return {
    _id: oid(r, createdAt),
    key,
    criteria: [...CRITERIA],
    version,
    status: "open",
    priority,
    attempt: 1,
    worker: null,
    heartbeat: null,
    proposal: null,
    gate: null,
    blockReason: null,
    hint: null,
    createdBy,
    createdAt,
    updatedAt: createdAt,
  };
}

type Outcome = "merged" | "open" | "claimed" | "blocked";

function pickOutcome(r: Rng, weights: Record<Outcome, number>): Outcome {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let x = r.next() * total;
  for (const [k, w] of Object.entries(weights) as [Outcome, number][]) {
    x -= w;
    if (x < 0) return k;
  }
  return "open";
}

// Runs a task through `attempt` attempts and sets its final status, writing
// the sources each attempt produced. `claimPool` hands out one worker per
// claimed task.
function playTask(
  r: Rng,
  task: Task,
  input: Input,
  outcome: Outcome,
  attempt: number,
  finishBy: Date,
  blockReasons: string[],
  claimPool: string[],
  sources: Source[],
  now: Date,
): Proposal | null {
  const start = task.createdAt.getTime();
  const span = Math.max(finishBy.getTime() - start, 2 * MINUTE);
  const step = span / attempt;
  let merged: Proposal | null = null;
  // A worker holds one task at a time: once every worker has a claim, the
  // task waits in the queue instead.
  if (outcome === "claimed" && claimPool.length === 0) outcome = "open";
  for (let a = 1; a <= attempt; a++) {
    const at = new Date(start + step * a);
    const worker = r.pick(WORKERS);
    task.attempt = a;
    task.updatedAt = at;
    const isLast = a === attempt;
    if (!isLast) {
      // A failed gate, a lost heartbeat or a version race reopened the task.
      const kind = r.pick(["gate", "gate", "gate", "gate", "error", "race"]);
      if (kind === "gate") {
        const check = r.pick(CHECKS);
        const { proposal, reasons } = fakeFailingProposal(r, input, check);
        sources.push(workerRun(r, task, worker, at, "failed", proposal, null));
        sources.push(gateSource(r, task, new Date(at.getTime() + 800), proposal, gateFail(check, reasons)));
        task.gate = gateFail(check, reasons);
        task.proposal = proposal;
      } else if (kind === "error") {
        sources.push(errorSource(r, task, worker, at));
      } else {
        task.hint = JSON.stringify(fakeProposal(r, input));
      }
      continue;
    }
    if (outcome === "open") {
      task.status = "open";
      task.worker = null;
      task.heartbeat = null;
    } else if (outcome === "claimed") {
      const w = claimPool.pop()!;
      task.status = "claimed";
      task.worker = w;
      task.heartbeat = new Date(now.getTime() - r.int(0, 12_000));
      task.updatedAt = new Date(task.heartbeat.getTime() - r.int(5_000, 90_000));
    } else if (outcome === "merged") {
      const proposal = fakeProposal(r, input);
      sources.push(workerRun(r, task, worker, at, "merged", proposal, null));
      sources.push(gateSource(r, task, new Date(at.getTime() + 800), proposal, gatePass()));
      task.status = "merged";
      task.worker = null;
      task.heartbeat = null;
      task.proposal = proposal;
      task.gate = gatePass();
      merged = proposal;
    } else {
      const reason = r.pick(blockReasons);
      if (r.chance(0.6)) {
        sources.push(workerRun(r, task, worker, at, "blocked", null, reason));
        task.blockReason = reason;
      } else {
        const check = r.pick(CHECKS);
        const { proposal, reasons } = fakeFailingProposal(r, input, check);
        sources.push(workerRun(r, task, worker, at, "failed", proposal, null));
        sources.push(gateSource(r, task, new Date(at.getTime() + 800), proposal, gateFail(check, reasons)));
        task.proposal = proposal;
        task.gate = gateFail(check, reasons);
        task.blockReason = `Gate failed twice on ${check}: ${reasons[0]}`;
      }
      task.status = "blocked";
      task.worker = null;
      task.heartbeat = null;
    }
  }
  return merged;
}

// ------------------------------------------------------------- main

export function makeDevData(inputs: Input[], lens: unknown, now: Date = new Date(), seed = 20260926): DevData {
  const r = rng(seed);
  const t = (minutesAgo: number, jitterMs = 0) => new Date(now.getTime() - minutesAgo * MINUTE - jitterMs);
  const t0 = t(90);
  const v2At = t(35);

  const scheduled = inputs.filter((i) => i.scheduled);
  const reserve = inputs.filter((i) => !i.scheduled);
  const byKey = new Map(inputs.map((i) => [i.key, i]));
  const tasks: Task[] = [];
  const sources: Source[] = [];
  const stateByKey = new Map<string, State>();
  const claimPool = r.shuffle(WORKERS);

  const merge = (task: Task, proposal: Proposal) => {
    const prev = stateByKey.get(task.key);
    stateByKey.set(
      task.key,
      State.parse({
        _id: task.key,
        key: task.key,
        version: task.version,
        stateVersion: (prev?.stateVersion ?? 0) + 1,
        data: proposal,
        taskId: task._id,
        mergedAt: task.updatedAt,
        // The planner's score step: a merged program solves the hidden test
        // about half the time at version 2, a third at version 1.
        score: r.chance(task.version === 2 ? 0.5 : 0.33) ? 1 : 0,
        scoredAt: new Date(task.updatedAt.getTime() + 1_500),
      }),
    );
  };

  // Crowd requests first: crowd tasks reference their source ids.
  const crowdSources: Source[] = CROWD_REQUESTS.map((req, i) => {
    const at = t(60 - i * 3.5, r.int(0, 20_000));
    return Source.parse({
      _id: oid(r, at),
      kind: "crowd-request",
      taskId: null,
      key: null,
      version: at < v2At ? 1 : 2,
      raw: { text: req.text, from: `phone-${r.hex(6)}`, classified: { outcome: req.outcome, reason: req.reason }, model: "llama-3.3-70b" },
      text: `${req.text}\n${req.outcome}: ${req.reason}`,
      enrichment: enrich(r, `crowd asked "${req.text}", ${req.outcome}`, [], [], ["crowd-request", req.outcome]),
      tokens: tokens(r, "small"),
      handled: true,
      outcome: req.outcome,
      reason: req.reason,
      createdAt: at,
    });
  });
  const unhandled: Source[] = UNHANDLED_REQUESTS.map((text, i) => {
    const at = t(0, 4_000 + i * 9_000);
    return Source.parse({
      _id: oid(r, at),
      kind: "crowd-request",
      taskId: null,
      key: null,
      version: 2,
      raw: { text, from: `phone-${r.hex(6)}` },
      text,
      enrichment: null,
      tokens: { in: 0, out: 0, cost: 0 },
      handled: false,
      createdAt: at,
    });
  });
  sources.push(...crowdSources, ...unhandled);
  const taskRequests = crowdSources.filter((s) => s.outcome === "task");
  const recheckRequests = crowdSources.filter((s) => s.outcome === "recheck");
  const parkedRequests = crowdSources.filter((s) => s.outcome === "parked");

  // Phase v1: one task per scheduled key, created in the first minutes,
  // finished before the version bump. Some blocked with size reasons and
  // were reopened by applyDiff at version 2.
  const v1Blocked: { _id: ObjectId; blockReason: string | null }[] = [];
  const mergedAtV1: Input[] = [];
  for (const [i, input] of scheduled.entries()) {
    const created = t(87, i * 500 + r.int(0, 400));
    const task = baseTask(r, input.key, 1, created, "planner", 0);
    const blockedAtV1 = r.chance(0.25);
    if (!blockedAtV1) {
      const attempt = r.pick([1, 1, 1, 1, 1, 1, 2, 2, 2, 3]);
      const p = playTask(r, task, input, "merged", attempt, t(r.int(38, 70)), V1_BLOCK_REASONS, claimPool, sources, now);
      if (p) merge(task, p);
      mergedAtV1.push(input);
    } else {
      playTask(r, task, input, "blocked", r.pick([1, 2, 2, 3]), t(r.int(40, 75)), V1_BLOCK_REASONS, claimPool, sources, now);
      v1Blocked.push({ _id: task._id, blockReason: task.blockReason });
      // applyDiff reopened it at version 2; it then ran again.
      task.version = 2;
      task.blockReason = null;
      task.gate = null;
      task.proposal = null;
      const outcome = pickOutcome(r, { merged: 20, open: 10, claimed: 7, blocked: 13 });
      const attempt = Math.min(3, task.attempt + (outcome === "open" ? 1 : r.pick([1, 1, 2])));
      const p = playTask(r, task, input, outcome, attempt, t(r.int(0, 30)), V2_BLOCK_REASONS, claimPool, sources, now);
      if (p) merge(task, p);
    }
    tasks.push(task);
  }

  // Phase v2: the planner re-emits every key merged at version 1.
  for (const [i, input] of mergedAtV1.entries()) {
    const created = t(34, i * 700 + r.int(0, 800));
    const task = baseTask(r, input.key, 2, created, "planner", 0);
    const outcome = pickOutcome(r, { merged: 60, open: 55, claimed: 10, blocked: 12 });
    const attempt = r.pick([1, 1, 1, 1, 2, 2, 3]);
    const p = playTask(r, task, input, outcome, attempt, t(r.int(0, 20)), V2_BLOCK_REASONS, claimPool, sources, now);
    if (p) merge(task, p);
    tasks.push(task);
  }

  // Crowd tasks on reserve keys, priority 1.
  for (const [i, input] of r.shuffle(reserve).slice(0, 60).entries()) {
    const req = taskRequests[i % taskRequests.length]!;
    const created = new Date(req.createdAt.getTime() + r.int(2_000, 40_000));
    const task = baseTask(r, input.key, created < v2At ? 1 : 2, created, `crowd:${req._id.toHexString()}`, 1);
    const outcome = pickOutcome(r, { merged: 30, open: 15, claimed: 3, blocked: 6 });
    const attempt = r.pick([1, 1, 1, 2, 3]);
    const p = playTask(r, task, input, outcome, attempt, t(r.int(0, 15)), V2_BLOCK_REASONS, claimPool, sources, now);
    if (p) merge(task, p);
    tasks.push(task);
  }

  // Rechecks: a crowd request on an already merged key makes a new task.
  const mergedKeys = r.shuffle([...stateByKey.keys()]).slice(0, 40);
  for (const [i, key] of mergedKeys.entries()) {
    const req = recheckRequests[i % recheckRequests.length]!;
    const created = new Date(req.createdAt.getTime() + r.int(2_000, 30_000) + i * 5_000);
    const task = baseTask(r, key, 2, created, `crowd:${req._id.toHexString()}`, 1);
    const outcome = pickOutcome(r, { merged: 25, open: 8, claimed: 2, blocked: 5 });
    const p = playTask(r, task, byKey.get(key)!, outcome, r.pick([1, 1, 2]), t(r.int(0, 10)), V2_BLOCK_REASONS, claimPool, sources, now);
    if (p) merge(task, p);
    tasks.push(task);
  }

  // Parked: crowd requests the planner turned down still leave a task row.
  for (let i = 0; i < 25; i++) {
    const req = parkedRequests[i % parkedRequests.length]!;
    const input = r.pick(inputs);
    const created = new Date(req.createdAt.getTime() + r.int(1_000, 20_000) + i * 3_000);
    const task = baseTask(r, input.key, created < v2At ? 1 : 2, created, `crowd:${req._id.toHexString()}`, 1);
    task.status = "parked";
    task.blockReason = r.pick(PARK_REASONS);
    task.updatedAt = new Date(created.getTime() + r.int(500, 3_000));
    tasks.push(task);
  }

  // Any worker without a fresh claim still gets one so all 20 rows show work.
  for (const w of claimPool.splice(0)) {
    const input = r.pick(scheduled);
    const task = baseTask(r, input.key, 2, t(r.int(1, 5)), "planner", 0);
    task.status = "claimed";
    task.worker = w;
    task.heartbeat = new Date(now.getTime() - r.int(0, 12_000));
    task.updatedAt = task.heartbeat;
    tasks.push(task);
  }

  // Questions: the approved one made version 2; one rejected; one open.
  const sizeEvidence = v1Blocked.filter((x) => /size/i.test(x.blockReason ?? "")).map((x) => x._id);
  const v2Blocked = tasks.filter((x) => x.status === "blocked" && x.version === 2).map((x) => x._id);
  const questions: Question[] = [
    Question.parse({
      _id: oid(r, t(41)),
      kind: "approval",
      question: `${sizeEvidence.length} tasks are blocked because the output size differs from the input and no size rule was found. Adopt this guideline?`,
      proposedDiff: { op: "add-guideline", text: APPROVED_GUIDELINE },
      evidence: sizeEvidence,
      status: "approved",
      answeredBy: "fabio",
      answeredAt: v2At,
      createdAt: t(41),
    }),
    Question.parse({
      _id: oid(r, t(24)),
      kind: "approval",
      question: `${Math.min(7, v2Blocked.length)} tasks are blocked after three failed hypotheses. Adopt this guideline?`,
      proposedDiff: { op: "add-guideline", text: REJECTED_GUIDELINE },
      evidence: v2Blocked.slice(0, 7),
      status: "rejected",
      answeredBy: "fabio",
      answeredAt: t(21),
      createdAt: t(24),
    }),
    Question.parse({
      _id: oid(r, t(6)),
      kind: "approval",
      question: `${Math.min(9, v2Blocked.length)} tasks are blocked on puzzles whose output is a symmetry of the input. Adopt this guideline?`,
      proposedDiff: { op: "add-guideline", text: OPEN_GUIDELINE },
      evidence: v2Blocked.slice(7, 16),
      status: "open",
      answeredBy: null,
      answeredAt: null,
      createdAt: t(6),
    }),
  ];
  for (const q of questions.slice(0, 2)) {
    const at = q.answeredAt!;
    sources.push(
      Source.parse({
        _id: oid(r, at),
        kind: "answer",
        taskId: null,
        key: null,
        version: q.status === "approved" ? 2 : 2,
        raw: { questionId: q._id, status: q.status, by: q.answeredBy, diff: q.proposedDiff, reopened: q.status === "approved" ? q.evidence.length : 0 },
        text: `${q.answeredBy} ${q.status} "${q.proposedDiff.text}"`,
        enrichment: enrich(r, `${q.answeredBy} ${q.status} the guideline "${q.proposedDiff.text}"`, [], [], ["answer", q.status]),
        tokens: { in: 0, out: 0, cost: 0 },
        createdAt: at,
      }),
    );
  }

  // Goal at version 2 with the approved diff in its history.
  const goalV1 = goalFromLens(lens);
  const goal = Goal.parse({
    ...goalV1,
    version: 2,
    guidelines: [...goalV1.guidelines, APPROVED_GUIDELINE],
    history: [
      { version: 1, at: t0, by: "seed", diff: null },
      { version: 2, at: v2At, by: "fabio", diff: { op: "add-guideline", text: APPROVED_GUIDELINE }, questionId: questions[0]!._id },
    ],
  });

  // Planner turns, one a minute.
  for (let m = 89; m >= 0; m--) {
    const at = t(m, r.int(0, 3_000));
    const raw = {
      holder: r.pick(WORKERS),
      reaped: r.chance(0.1) ? r.int(1, 2) : 0,
      emitted: m > 40 ? r.int(0, 6) : r.int(0, 3),
      crowdHandled: r.chance(0.2) ? 1 : 0,
      proposed: m === 41 || m === 24 || m === 6 ? 1 : 0,
      backfilled: r.int(0, 3),
      ms: r.int(120, 900),
    };
    sources.push(
      Source.parse({
        _id: oid(r, at),
        kind: "planner-turn",
        taskId: null,
        key: null,
        version: at < v2At ? 1 : 2,
        raw,
        text: `planner ${raw.holder}: reaped ${raw.reaped}, emitted ${raw.emitted}, crowd ${raw.crowdHandled}, proposed ${raw.proposed}, backfilled ${raw.backfilled}`,
        enrichment: enrich(r, `planner turn by ${raw.holder}: emitted ${raw.emitted}, reaped ${raw.reaped}`, [], [], ["planner-turn"]),
        tokens: raw.crowdHandled || raw.proposed ? tokens(r, "planner") : { in: 0, out: 0, cost: 0 },
        createdAt: at,
      }),
    );
  }

  sources.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  tasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const state = [...stateByKey.values()].sort((a, b) => a.key.localeCompare(b.key));

  const locks: Lock[] = [Lock.parse({ _id: "planner", holder: r.pick(WORKERS), until: new Date(now.getTime() + 20_000) })];

  const metrics = makeMetrics(tasks, sources, state, goal, scheduled.length, now, v2At, t0);

  const validated: DevData = {
    goal,
    inputs,
    tasks: tasks.map((x) => Task.parse(x)),
    state,
    sources,
    questions,
    locks,
    metrics,
  };
  return validated;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function makeMetrics(tasks: Task[], sources: Source[], state: State[], goal: Goal, scheduledCount: number, now: Date, v2At: Date, t0: Date): Metrics {
  const minuteOf = (d: Date) => Math.floor(d.getTime() / MINUTE) * MINUTE;
  const first = minuteOf(now) - 89 * MINUTE;
  const perMinute: Minute[] = [];
  const mergedInOrder = tasks.filter((x) => x.status === "merged").sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  const runs = sources.filter((s) => s.kind === "worker-run");
  const gates = sources.filter((s) => s.kind === "gate");
  for (let i = 0; i < 90; i++) {
    const start = first + i * MINUTE;
    const end = start + MINUTE;
    const inMinute = (d: Date) => d.getTime() >= start && d.getTime() < end;
    const merged = mergedInOrder.filter((x) => inMinute(x.updatedAt)).length;
    const failed = gates.filter((s) => inMinute(s.createdAt) && !(s.raw.gate as GateResult).pass).length;
    const blocked = tasks.filter((x) => x.status === "blocked" && x.updatedAt.getTime() < end).length;
    const lastMerged = mergedInOrder.filter((x) => x.updatedAt.getTime() < end).slice(-20);
    const firstTryPass = lastMerged.length ? lastMerged.filter((x) => x.attempt === 1).length / lastMerged.length : null;
    const minuteSources = sources.filter((s) => inMinute(s.createdAt));
    const tokensSum = minuteSources.reduce((a, s) => a + s.tokens.in + s.tokens.out, 0);
    const minuteRuns = runs.filter((s) => inMinute(s.createdAt));
    const contextAvg = minuteRuns.length ? Math.round(minuteRuns.reduce((a, s) => a + s.tokens.in, 0) / minuteRuns.length) : null;
    const secondsMedian = median(minuteRuns.map((s) => s.raw.seconds as number));
    perMinute.push({ minute: new Date(start), merged, failed, blocked, firstTryPass, tokens: tokensSum, contextAvg, secondsMedian });
  }
  const last20 = runs.slice(-20);
  // The solve-rate curve: one bucket per 15 minutes over the window.
  const BUCKET = 15 * MINUTE;
  const firstBucket = Math.floor((now.getTime() - 90 * MINUTE) / BUCKET) * BUCKET;
  const solveRate: z.infer<typeof SolveBucket>[] = [];
  for (let b = firstBucket; b <= now.getTime(); b += BUCKET) {
    const end = b + BUCKET;
    const attempted = new Set(tasks.filter((x) => x.createdAt.getTime() < end).map((x) => x.key)).size;
    const mergedKeys = new Set(state.filter((s) => s.mergedAt.getTime() < end).map((s) => s.key));
    const solved = state.filter((s) => s.score === 1 && (s.scoredAt ?? s.mergedAt).getTime() < end).length;
    solveRate.push({ bucket: new Date(b), attempted, merged: mergedKeys.size, solved });
  }
  const perCriterion = Object.fromEntries(
    CRITERIA.map((c) => [c, { done: state.filter((s) => s.version === 2 && tasks.some((t) => t._id.equals(s.taskId) && t.createdBy === "planner")).length, total: scheduledCount }]),
  );
  return Metrics.parse({
    _id: "metrics",
    at: now,
    perMinute,
    totals: {
      merged: tasks.filter((x) => x.status === "merged").length,
      blocked: tasks.filter((x) => x.status === "blocked").length,
      open: tasks.filter((x) => x.status === "open").length,
      libraryTokens: sources.reduce((a, s) => a + s.tokens.in + s.tokens.out, 0),
      librarySources: sources.length,
      contextLast20Avg: last20.length ? Math.round(last20.reduce((a, s) => a + s.tokens.in, 0) / last20.length) : null,
      solved: state.filter((s) => s.score === 1).length,
      attempted: new Set(tasks.map((x) => x.key)).size,
      stepsMedian: median(runs.map((s) => (s.raw.steps as unknown[]).length)),
    },
    solveRate,
    perCriterion,
    versions: [
      { version: 1, at: t0 },
      { version: 2, at: v2At },
    ],
    // The same derivation the planner runs, over the fake record.
    lessons: lessonsFrom({ tasks, gates, goal }, now),
  });
}
