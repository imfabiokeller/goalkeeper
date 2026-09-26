# The goal document

**The use case is not decided.** We are building the infrastructure and the
bootstrap around an unknown pure-state use case. Nothing in `src/` or in
these docs may depend on a specific domain. This file describes the shape
of the goal document, not its content.

## Shape

The goal is one document in Atlas, seeded at version 1 from
`usecase/lens.json` and changed afterwards only by approved diffs.

```
Statement     two sentences, prose, human-written
Criteria      at most three, each with a check kind the gate can run:
              { id, text, check: { kind, params } }
Guidelines    a few lines of taste, appended to by approved proposals
Out of scope  what gets parked, with the reason shown on screen
Proposal shape the exact JSON a worker must submit: field names, types,
              nullability, an example. Pinned into every worker context.
              Without it the model invents its own field names.
Version       1 at seed, +1 per approved diff
History       one entry per version: at, by, diff, questionId
```

The readable form of a criterion must say what the check verifies in plain
words; the check kind must exist in `usecase/checks.ts`.

## What any use case must ship

The `usecase/` folder is the interface between the use case and the
harness. A use case is exactly these files:

- `lens.json`: the goal document above (`goal`, `criteria`, `guidelines`,
  `outOfScope`, `proposalShape` as a JSON example or a string).
- `inputs.json`: the index of units: `key`, `name`, `file`, plus any extra
  fields the checks need (stored as `meta`).
- `inputs/<file>`: one plain-text input per unit.
- `checks.ts`: `export const checks: Record<string, Check>` where
  `Check = (proposal, input, state) => { pass, reasons }` and `input` is
  `{ key, name, text, meta }`. Pure, no I/O, milliseconds.
- `samples/`: hand-written proposals with expected outcomes per check.

The harness reads only this folder. A different use case in this shape
replaces the current one by re-seeding.

## What is in `usecase/` right now

A development fixture so the harness can be built and tested before the
decision. It is not the use case and it is not a candidate. When the use
case is decided, the fixture is replaced.

## What the audience can request (any use case)

- A unit from the unscheduled reserve: becomes a priority task. Load more
  units than you schedule so this is real work.
- A recheck of a merged unit: becomes a priority task, the old state stays
  until the new one merges.
- A guideline: becomes a proposal in the inbox.
- Anything else, including new fields, rankings and units not in the
  inputs: parked with a reason on screen.
