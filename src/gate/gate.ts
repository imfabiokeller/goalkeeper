// The gate: a pure function over the use case check registry. For each
// criterion the task cites, look up its check kind in the goal and run the
// matching function from usecase/checks.ts. No model, no I/O, no state.
// Anything unresolvable (unknown criterion, unknown kind, a check that
// throws) is a failing result with a reason, never an exception.

import { checks } from "../../usecase/checks.ts";
import type { CheckFn, CheckInput, CheckState, GateResult, Goal, Task } from "../shared/types.ts";

// The registry is typed against the use case's own Proposal-shaped state;
// the harness state carries unknown proposals. Same runtime shape.
const registry = checks as unknown as Record<string, CheckFn | undefined>;

export function gate(
  goal: Goal,
  task: Pick<Task, "key" | "criteria">,
  proposal: unknown,
  input: CheckInput,
  state: CheckState,
): GateResult {
  const results: GateResult["checks"] = {};

  if (input.key !== task.key) {
    results.input = { pass: false, reasons: [`input key ${input.key} does not match task key ${task.key}`] };
  }

  for (const id of task.criteria) {
    const criterion = goal.criteria.find((c) => c.id === id);
    if (!criterion) {
      results[`criterion:${id}`] = { pass: false, reasons: [`criterion ${id} is not in goal version ${goal.version}`] };
      continue;
    }
    const kind = criterion.check.kind;
    const fn = registry[kind];
    if (typeof fn !== "function") {
      results[kind] = { pass: false, reasons: [`check kind ${kind} (criterion ${id}) is not in the check registry`] };
      continue;
    }
    if (results[kind]) continue; // two criteria naming the same kind run it once
    try {
      const r = fn(proposal, input, state);
      results[kind] = { pass: r.pass, reasons: [...r.reasons] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results[kind] = { pass: false, reasons: [`check ${kind} (criterion ${id}) threw: ${message}`] };
    }
  }

  const entries = Object.values(results);
  return {
    pass: entries.length > 0 && entries.every((r) => r.pass),
    reasons: entries.flatMap((r) => r.reasons),
    checks: results,
  };
}
