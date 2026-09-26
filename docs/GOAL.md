# The goal document

The goal is one document in Atlas, seeded at version 1 from
`usecase/lens.json`, written once by a human and never changed during the
run. Nothing in `src/` depends on its content; this file gives the shape and the
version 1 for the decided use case (ARC, see [USE-CASE.md](USE-CASE.md)).

## Shape

```
Statement     two sentences, prose, human-written
Criteria      at most three, each with a check kind the gate can run:
              { id, text, check: { kind, params } }
Guidelines    a few lines of taste
Out of scope  what gets parked, with the reason shown on screen
Proposal shape the exact JSON a worker must submit, pinned into every
              worker context
Version       1, stamped on every task
History       the seed entry
```

## Version 1

**Statement.** Solve as many ARC evaluation puzzles as possible with cheap
open-weight models by writing, for each puzzle, a program that reproduces
every example pair. A program counts as solved only when it also produces
the hidden test output, which no worker ever sees.

**Criteria.**

- c1 `reproduces`: the program, run on each example input, returns exactly
  the example output.
- c2 `general`: the program runs on the test input within one second and
  returns a valid grid, and contains no example output as a literal.
- c3 `schema`: the proposal has exactly the fields of the proposal shape,
  the program defines `transform(grid)` in under 8000 characters, and the
  key is not already merged.

**Guidelines.**

- State the rule in one sentence before writing any code.
- Check first whether the output size differs from the input size; most
  failures are size failures.
- Prefer the smallest program that reproduces every pair.
- Reuse helpers from solved puzzles in the library (components, bounding
  box, symmetry, flood fill) instead of writing them again.
- Never hardcode an example output. If the rule is unclear after three
  hypotheses, block with the hypotheses tried; the puzzle is reopened
  once the library has grown.

**Out of scope.**

- Puzzles outside the loaded set (ARC-AGI-2, training set, hand-made).
- Any frontier model or any model not on the allowed list.
- Changing how puzzles are scored or revealing test outputs.
- Rankings of puzzles, workers or models.

**Proposal shape.** `{ key, rule, program }`, see USE-CASE.md section 3.

## What any use case must ship

The `usecase/` folder is the interface between the use case and the
harness:

- `lens.json`: the goal document above.
- `inputs.json`: the index of units: `key`, `name`, `file`, plus extra
  fields the checks need (stored as `meta`).
- `inputs/<file>`: one plain-text input per unit.
- `checks.ts`: `export const checks: Record<string, Check>` where
  `Check = (proposal, input, state) => { pass, reasons }` and `input` is
  `{ key, name, text, ...meta }`. Pure, no I/O beyond the sandbox, fast.
  Optional `export const score: (proposal, input) => 0 | 1` for a hidden
  metric the worker cannot see.
- `samples/`: hand-written proposals with expected outcomes per check.

The harness reads only this folder.
