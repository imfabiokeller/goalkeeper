# Design brief: the goalkeeper screen

Paste this into Claude Design. The mockups come back before any UI code is
written. Three screens, all required: stage, puzzle, task. Nothing else.

## What the product is

goalkeeper is a runtime for long-running AI agent work. Twenty disposable,
stateless workers claim units of work from a queue in MongoDB, build a
context from a raw library of everything that ever happened, produce a
result, and pass it through a deterministic gate. No worker keeps state;
any worker can be killed and another finishes its unit. The goal was
written once by a human and never changes; workers learn only through the
library.

The work today: 400 ARC puzzles. Each puzzle is a few example pairs of
small colored grids (up to 30x30, colors 0 to 9) and one test input. A
worker writes a small JavaScript program that turns each example input
into its output; the gate runs the program on every pair. A hidden test
answer the worker never sees decides whether the puzzle counts as solved.
Every solved program and every refuted hypothesis goes into the library,
so later workers on similar puzzles retrieve them. The claim on screen:
the same cheap model solves more puzzles at 17:00 than at 14:30 because
the context it is given keeps getting better.

The screen is shown on a projector during a three-minute live demo and
opened on laptops by judges asking "what did the worker see". The
audience must understand, without narration, from the back of a room:
work is happening in parallel, workers die and nothing is lost, the goal
is small and human-owned, the library is huge and machine-owned, and the
solve rate is going up.

## Design direction

- Monitoring-room feel, not a SaaS dashboard: dense, calm, dark background,
  one accent color, status colors that read at distance. Flight board, not
  cards with shadows.
- Color is status. Grey open, blue working (slow pulse), green solved
  (passed the hidden test), teal merged (passed the examples, not yet
  scored or wrong on the test), amber retrying, red blocked, dark red dead
  worker. Puzzle grids use the standard ARC ten-color palette and nothing
  else on screen uses those colors.
- Motion is activity: cells pulse while held, a merge flashes, a reopen
  wave ripples through the red cells. No decorative animation.
- The curve is the claim: solve rate over time is the biggest element on
  the stage view after the grid.
- Typography: one monospace for keys, numbers, code; one sans for prose.
- Dark only. Reduced motion still legible.

## Vocabulary

- **Goal**: statement, three criteria with short labels (reproduces,
  general, schema), guidelines, out of scope. Fixed for the run.
- **Puzzle** (unit): key (8 hex characters like `0a1d4ef5`), status,
  example pairs and test input as grids, once merged: the rule (one
  sentence), the program, solved or not on the hidden test.
- **Task**: an attempt on a puzzle: attempt number (1 to 5), worker id,
  steps of 20, seconds, tokens, gate result per check with reasons, block
  reason, the planner's hint if any ("too specific", "reopened").
- **Worker**: id (`w-07`), current puzzle, step n/20, heartbeat age, alive
  or dead.
- **Source** (library entry): kind (worker-run, gate, planner-turn,
  error), puzzle key, gist, labels, tokens, time, raw content.
- **Precedent**: a library entry retrieved into a worker's context: a
  solved puzzle's rule and program, or a refuted rule, with a score.
- **Lessons**: a short digest of recent gate verdicts, pinned into every
  context (first-try pass rate, top failure reasons).

## KPIs on the stage view

1. **Solve rate** over time: hidden test passes over puzzles attempted,
   per 15-minute bucket, plus the cumulative line. The headline.
2. **Solved / merged / attempted / blocked** counts out of 400.
3. **Library tokens** (rising, hundreds of millions) and **context per
   request** (flat, under 20k). The two counters.
4. **First-attempt gate pass rate** (rolling 20).
5. **Median steps to merge** (falling is learning).
6. **Workers alive / target**, and uptime since the run started.

## Screens

### 1. Stage view `/` (projector, 1920x1080, no scrolling)

- **Header**: goal statement in one line, "written once by a human at
  14:20", the six KPIs above with the two counters largest.
- **Puzzle grid**: one cell per puzzle (400), status colored, key on
  hover. Hover: key, status, attempt, last reason, the rule if merged.
- **The curve**: solve rate over time, wide, under the header. Cumulative
  line and per-bucket bars, the model name as a caption ("same model all
  day").
- **Workers**: one row per worker (8 to 20): id, puzzle key, step n/20 as
  a tiny bar, heartbeat age, alive dot. Dead rows stay 30 s in dark red.
- **Live feed**: 15 lines, newest on top: solved (with the rule), merged,
  failed with the check and the first reason, blocked with the reason,
  requeued after a dead worker, reopened.

Two states: mid-run healthy, and right after five workers were killed
(five dark red rows, five grey cells, feed showing requeues).

### 2. Puzzle page `/unit/[key]` (projector and laptop)

Top: the example pairs as grids (input, arrow, expected output, and for
the latest attempt the program's actual output beside it, differing cells
outlined), then the test input (never the test output). Middle: the rule
in one sentence, the program in a code block, the gate per check with
reasons, solved or not. Right column: the precedents this attempt was
given (rule, key, score, link to the library entry) and the refuted rules
from earlier attempts on this puzzle. Below: the attempt history (attempt,
worker, outcome, steps, seconds, tokens), each row opening the task page.

Two states: solved, and blocked after three refuted rules.

### 3. Task page `/task/[id]` (laptop, for "what did it see")

One iteration end to end, top to bottom: the context as sections (goal
pinned, puzzle, state, last failures with refuted rules, planner hint,
lessons digest, precedents each with kind, gist, score, link); the tool
transcript step by step (tool name, arguments, result excerpt, tokens),
with `try_submit` results showing the diff that came back; the proposal;
the gate; what happened next (merged, reopened, blocked). The request's
token count next to the global counter to show they match.

Show a passing task and a failing task whose refuted rule then appears in
the next attempt's pinned failures.

## Interactions to design explicitly

- The kill: five rows dark red, five cells to grey, five requeues in the
  feed, five cells blue on other rows. Within 30 seconds.
- A cell turning from teal (merged) to green (solved) when the planner
  scores it, and from teal to amber when the score is 0 and it is
  reopened as "too specific".
- The reopen wave: every 20 merges, older red cells go grey, then blue.
- Opening a puzzle from the grid and reading its program next to the
  grids; following a precedent link to the library entry.

## Deliverables

Mockups for screens 1 to 3 at desktop width, the two states for screens
1 and 2. A component sheet: status colors, the cell, the ARC grid
renderer (with the diff outline), the worker row, the feed line, the
counter, the curve, the precedent card, the code block.
