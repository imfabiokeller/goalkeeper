# Use case: ARC puzzles, decided at 14:00

The use case is ARC-AGI-1, evaluation set. Decided at 14:00 on hackathon
day after the storm-tracker and BIRD candidates were rejected (the storm
reads as a dashboard and its agents only extract; BIRD has no gate that
can verify correctness without the hidden answer). This file is the filled
brief; the generic requirements a use case must meet are at the bottom.

## The idea in one line

Each unit is one ARC puzzle: a few example grid pairs and one test input.
A worker writes a JavaScript program `transform(grid)` that reproduces
every example pair, verified by running it. The hidden test answer never
reaches a worker; the planner scores merged programs against it, and that
solve rate is the hard metric on screen. Every solved program and every
refuted hypothesis lands in the library, so later workers on similar
puzzles retrieve them. The claim: the same cheap open-weight model solves
more puzzles at 17:00 than at 14:00 because the context it gets is better,
not because the model changed.

## Why this use case

- The agent is needed: write, run, read the diff, fix. No script does it.
- The gate verifies correctness without the answer: the example pairs are
  in the puzzle. No model judges a model.
- Cheap models start low on ARC, so a climb is visible.
- Statement two, word for word: learns from hard metric signals to
  complete traditionally difficult tasks.
- Data: public JSON, Apache 2.0, independent units, no rights issue.

## 1. Inputs

- Source: `arcprize/ARC-AGI-2` is out (cheap models score near zero);
  `fchollet/ARC-AGI` `data/evaluation/`, 400 puzzles, Apache 2.0. The
  evaluation set, not training, so the contamination question has an
  answer.
- `usecase/inputs/<key>.txt`: the puzzle as text. Each example pair as two
  grids of digits, one row per line, then the test input. A grid is at most
  30x30, so a puzzle is under 6k characters and fits one `read_input` page.
- `usecase/inputs.json`: `key` (the ARC task id, like `0a1d4ef5`), `name`,
  `file`, `chars`, `meta: { train: [...], test: [{ input }] }` (the grids as
  JSON, for the checks).
- `usecase/answers/<key>.json`: the test outputs. Read only by
  `score()`. Never loaded into `inputs`, never in a worker context, never
  in the library.
- All 400 loaded and scheduled.

## 2. Units of work

Key: the ARC task id. Every puzzle is independent.

## 3. Proposal shape

```json
{
  "key": "0a1d4ef5",
  "rule": "Fill every enclosed region with the color of its border.",
  "program": "function transform(grid) { ... return out; }"
}
```

`rule` is one sentence, the hypothesis in words; it is what the library
indexes and what refutations are pinned as. `program` is JavaScript, no
imports, no I/O, under 4000 characters, defines `transform(grid)` that
takes and returns a 2D array of integers 0 to 9.

## 4. Checks (`usecase/checks.ts`)

- `schema`: exactly the three fields, `rule` non-empty, `program` under
  4000 characters and defines `transform`, key matches, not already merged.
- `reproduces`: the program run on every example input equals the example
  output, cell for cell. Reasons name the pair and the first difference:
  `pair 2: expected 3x3, got 9x9`, `pair 1: cell (4,2) is 5, expected 0`.
- `general`: the program run on the test input returns a valid grid (1 to
  30 per side, integers 0 to 9) within the time limit, and the program text
  contains no example output as a literal (no memorizing).

Programs run in a sandbox (`usecase/sandbox.ts`): a child process started
synchronously with an empty environment, Node's `--permission` flag (no
file system, no network, no child processes), a 1 s wall clock, an output
cap, `Math.random` and `Date` stubbed. Synchronous and deterministic, so
the gate contract holds. Not `node:vm` in the worker process: that is no
security boundary and the worker holds the keys.

`score(proposal, input)` (optional export, not a check): runs the merged
program on the test input and compares with `usecase/answers/`. Returns
`1` or `0`. The planner calls it at merge time; the worker never can.

## 5. Goal document, version 1

See [GOAL.md](GOAL.md) and `usecase/lens.json`.

## What a worker gets

The goal (pinned), the puzzle text, the current state (none, or the
program that passed the examples but not the test, with the message "too
specific"), the last failures on this key including the rules already
tried marked refuted, the planner's hint if any, the lessons digest, and a briefing from the library:
programs and rules from similar solved puzzles, helpers other workers
wrote.

Tools: `read_input`, `read_state`, `search_library`, `try_submit(proposal)`
(runs the gate, returns the reasons, records nothing), `submit`, `block`.
Step budget 20.

## Baseline

`npm run baseline` (`usecase/tools/baseline.ts`) measures the same model
with no harness: one `generateText` call per puzzle, no tools, no
`try_submit`, no retries, no library, no hint. The model gets the puzzle
text a worker reads and must answer with a rule and a `transform(grid)`
program in one shot. The answer goes through the same three checks and the
same `score()` as a worker's proposal. Puzzles are picked
deterministically (sorted keys, every k-th of the 400; `--keys` overrides),
`--attempts 2` takes two independent samples per puzzle and also reports
`solveRateAt2` (ARC's official two-attempt rule). The report
(`usecase/tools/baseline.json`) lists per puzzle the gate verdict, the
first failing reason, the score, tokens and seconds, and totals with the
cost. A provider error counts as a miss and never stops the run.

The `solveRate` total is the dashed horizontal line "same model, single
shot" on the stage view's curve: the harness's curve at 17:00 is quoted
against it. Same model, same gate, same puzzles; the only difference is
the harness.

## The generic brief (what any use case must provide)

Inputs as plain text, one per independent unit with a key; a proposal
shape of a few typed fields; a check per criterion that a programmer
writes in under an hour with no judgment call; a goal document with at
most three criteria; a folder `usecase/` in the shape described in
[GOAL.md](GOAL.md). A different use case in that shape replaces this one
by re-seeding; nothing in `src/` is domain-specific.
