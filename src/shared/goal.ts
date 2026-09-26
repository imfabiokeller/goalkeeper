// Converts the use case lens document (usecase/lens.json) into the `goal`
// document of docs/DATABASE.md. The lens has `goal` as the statement and
// criteria with only a check kind; the goal has `statement`, criteria with
// `kind: "all-units"` and empty check params, and a seed history entry.
// Used by the seed (S4) and by the gate tests.

import { Goal } from "./types.ts";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
}

export function goalFromLens(lens: unknown): Goal {
  if (!isRecord(lens)) throw new Error("lens is not an object");
  const rawCriteria = Array.isArray(lens.criteria) ? lens.criteria : [];
  const criteria = rawCriteria.map((c: unknown) => {
    if (!isRecord(c)) throw new Error("lens criterion is not an object");
    const check = isRecord(c.check) ? c.check : {};
    return {
      id: c.id,
      kind: "all-units" as const,
      text: c.text,
      check: { kind: check.kind, params: {} },
    };
  });
  return Goal.parse({
    _id: "goal",
    version: typeof lens.version === "number" ? lens.version : 1,
    statement: lens.goal,
    criteria,
    guidelines: strings(lens.guidelines),
    outOfScope: strings(lens.outOfScope),
    proposalShape:
      typeof lens.proposalShape === "string"
        ? lens.proposalShape
        : lens.proposalShape === undefined
          ? ""
          : JSON.stringify(lens.proposalShape, null, 2),
    history: [{ version: 1, at: new Date(), by: "seed", diff: null }],
  });
}
