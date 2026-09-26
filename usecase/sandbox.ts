// Runs a model-written `transform(grid)` program in a separate Node process:
// empty environment, Node's permission model (no file system, no child
// processes, no workers), `process` and `require` removed from the
// program's scope, `Math.random` and `Date` stubbed, a 1 s wall clock and
// a 1 MB output cap. Synchronous, so a check stays a pure function of its
// arguments. Program and grid travel over stdin, never argv.

import { spawnSync } from "node:child_process";

export type Grid = number[][];
export type RunResult = { ok: true; output: unknown } | { ok: false; error: string };

export const TIMEOUT_MS = 1000;
export const MAX_OUTPUT_BYTES = 1024 * 1024;
export const MAX_PROGRAM_CHARS = 4000;

// The child: read stdin, lock the globals the program must not reach, run
// the program with `new Function`, print one JSON line.
const CHILD = `
const out = process.stdout;
const write = (s) => out.write(s);
let data = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => { data += d; });
process.stdin.on("end", () => {
  let result;
  try {
    const { program, grid } = JSON.parse(data);
    Math.random = () => 0.5;
    const FixedDate = function () { return new RealDate(0); };
    const RealDate = Date;
    FixedDate.now = () => 0;
    FixedDate.parse = () => 0;
    FixedDate.UTC = () => 0;
    globalThis.Date = FixedDate;
    for (const k of ["process", "require", "module", "exports", "__filename", "__dirname", "fetch", "WebSocket", "Worker", "setTimeout", "setInterval", "setImmediate", "queueMicrotask", "Atomics", "SharedArrayBuffer", "eval", "Function"]) {
      try { globalThis[k] = undefined; } catch {}
    }
    const fn = new (function () {}).constructor("grid", program + "\\n;if (typeof transform !== 'function') throw new Error('program does not define transform(grid)');\\nreturn transform(grid);");
    const output = fn(grid);
    result = { ok: true, output };
  } catch (err) {
    result = { ok: false, error: err instanceof Error ? err.name + ": " + err.message : String(err) };
  }
  let text;
  try { text = JSON.stringify(result); } catch (err) { text = JSON.stringify({ ok: false, error: "output is not serializable: " + String(err && err.message || err) }); }
  if (text === undefined) text = JSON.stringify({ ok: false, error: "output is not serializable" });
  write(text);
});
`;

function isGrid(v: unknown): v is Grid {
  return Array.isArray(v) && v.every((row) => Array.isArray(row) && row.every((c) => typeof c === "number"));
}

export function runProgram(program: string, grid: Grid): RunResult {
  if (typeof program !== "string") return { ok: false, error: "program is not a string" };
  if (program.length > MAX_PROGRAM_CHARS) return { ok: false, error: `program is ${program.length} characters, limit ${MAX_PROGRAM_CHARS}` };
  if (!isGrid(grid)) return { ok: false, error: "input grid is not a 2D array of numbers" };
  const r = spawnSync(
    process.execPath,
    ["--permission", "--disable-proto=throw", "--max-old-space-size=256", "--stack-size=984", "-e", CHILD],
    {
      env: {} as NodeJS.ProcessEnv, // empty on purpose; the cast keeps the screen's Next.js types (NODE_ENV required) happy
      input: JSON.stringify({ program, grid }),
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  if (r.error) {
    const code = (r.error as NodeJS.ErrnoException).code;
    if (code === "ETIMEDOUT") return { ok: false, error: `timeout: program ran longer than ${TIMEOUT_MS} ms` };
    if (code === "ENOBUFS") return { ok: false, error: `output exceeded ${MAX_OUTPUT_BYTES} bytes` };
    return { ok: false, error: `sandbox: ${r.error.message}` };
  }
  if (r.signal) return { ok: false, error: `sandbox: process killed by ${r.signal}` };
  const stdout = (r.stdout ?? "").trim();
  if (!stdout) {
    const stderr = (r.stderr ?? "").trim().split("\n").filter(Boolean).slice(-3).join(" | ");
    return { ok: false, error: `sandbox: no output (exit ${r.status})${stderr ? ": " + stderr.slice(0, 300) : ""}` };
  }
  try {
    const parsed = JSON.parse(stdout) as RunResult;
    if (parsed && typeof parsed === "object" && typeof parsed.ok === "boolean") return parsed;
    return { ok: false, error: "sandbox: unreadable result" };
  } catch {
    return { ok: false, error: `sandbox: unreadable result: ${stdout.slice(0, 200)}` };
  }
}
