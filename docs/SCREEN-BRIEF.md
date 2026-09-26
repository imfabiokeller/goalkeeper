# Design brief: the goalkeeper screen

Paste this into Claude Design. The mockups come back before any UI code is
written. Bare minimum for the demo: screens 1, 2, 3 and 4. Screens 5 and 6
if time allows.

## What the product is

goalkeeper is a runtime for long-running AI agent work. Twenty disposable,
stateless workers claim units of work from a queue in MongoDB, build a
context from a raw library of everything that ever happened, produce a
result, and pass it through a deterministic gate. No worker keeps state;
any worker can be killed and another finishes its unit. Workers cannot
change the goal; they can only propose a change that a human approves.

The work today: ARC puzzles. Each unit is a puzzle: a few example pairs of
small colored grids (up to 30x30, colors 0 to 9) and one test input. A
worker writes a small JavaScript program that turns each example input into
its output; the gate runs the program on every pair. A hidden test answer
the worker never sees decides whether the puzzle counts as solved. Every
solved program and every refuted hypothesis goes into the library, so
later workers on similar puzzles retrieve them. The claim on screen: the
same cheap model solves more puzzles at 17:00 than at 14:30 because the
context it is given keeps getting better.

The screen is shown on a projector during a three-minute live demo and
opened on phones by the audience. The audience must understand, without
narration, from the back of a room: work is happening in parallel, workers
die and nothing is lost, the goal is small and human-owned, the library is
huge and machine-owned, and the solve rate is going up.

## Design direction

- Monitoring-room feel, not a SaaS dashboard: dense, calm, dark background,
  one accent color, status colors that read at distance. Flight board, not
  cards with shadows.
- Color is status. Grey open, blue working (slow pulse), green solved
  (passed the hidden test), teal merged but not yet scored or wrong on the
  test, amber retrying, red blocked, dark red dead worker. Puzzle grids use
  the standard ARC ten-color palette and nothing else on screen uses those
  colors.
- Motion is activity: cells pulse while held, a version bump ripples.
- The curve is the claim: solve rate over time is the biggest element on
  the stage view after the grid.
- Typography: one monospace for keys, numbers, code; one sans for prose.
- Phone pages (`/inbox`, `/request`) thumb-first, one action per screen,
  375px width.
- Dark only. Reduced motion still legible.

## Vocabulary

- **Goal**: statement, version, three criteria with short labels
  (reproduces, general, schema), guidelines, out of scope, history.
- **Puzzle** (unit): key (8 hex characters like `0a1d4ef5`), status,
  example pairs and test input as grids, once merged: the rule (one
  sentence), the program, solved or not on the hidden test.
- **Task**: an attempt on a puzzle: attempt number, worker id, steps of 20,
  seconds, tokens, gate result per check with reasons, block reason.
- **Worker**: id (`w-07`), current puzzle, step n/20, heartbeat age, alive
  or dead.
- **Source** (library entry): kind (worker-run, gate, planner-turn,
  crowd-request, answer, error), puzzle key, gist, labels, tokens, time,
  raw content.
- **Precedent**: a library entry retrieved into a worker's context: a
  solved puzzle's rule and program, or a refuted rule, with a similarity
  score.
- **Question**: a proposed guideline with reason and evidence (blocked
  puzzles), open, approved or rejected.
- **Crowd request**: free text, outcome (task, recheck, proposal, parked)
  and a one-line reason.

## KPIs on the stage view

1. **Solve rate** over time (hidden test passes over puzzles attempted,
   per 15-minute bucket, plus the cumulative line), with goal version
   markers. The headline.
2. **Solved / merged / attempted / blocked** counts.
3. **Library tokens** (rising, hundreds of millions) and **context per
   request** (flat, under 20k). The two counters.
4. **First-attempt gate pass rate** (rolling 20).
5. **Median steps to merge** (falling is learning).
6. Workers alive / target.

## Screens

### 1. Stage view `/` (projector, 1920x1080, no scrolling)

- **Header**: goal statement in one line, version large with the time of
  the last change, the six KPIs above with the two counters largest. QR
  for `/request` in the corner.
- **Puzzle grid**: one cell per scheduled puzzle (300), status colored,
  reserve puzzles (100) dimmed at the end. Hover or tap: key, status,
  attempt, last reason.
- **The curve**: solve rate over time with version markers, wide, under
  the header. Cumulative line and per-bucket bars.
- **Workers**: one row per worker (8 to 20): id, puzzle key, step n/20 as
  a tiny bar, heartbeat age, alive dot. Dead rows stay 30 s in dark red.
- **Live feed**: 15 lines, newest on top: solved, merged, failed with the
  check, blocked with the reason, crowd request card moving to its
  outcome, proposal pending.

Two states: mid-run healthy, and right after five workers were killed.

### 2. Puzzle page `/unit/[key]` (projector and laptop)

Top: the example pairs as grids (input, arrow, expected output, and for
the latest attempt the program's actual output beside it, differing cells
outlined), then the test input. Middle: the rule in one sentence, the
program in a code block, the gate per check with reasons, solved or not.
Right column: the precedents this attempt was given (rule, key, score,
link to the library entry) and the refuted rules from earlier attempts on
this puzzle. Below: the attempt history (attempt, worker, outcome, steps,
seconds, tokens), each row opening the task page.

Two states: solved, and blocked after three refuted rules.

### 3. Task page `/task/[id]` (laptop, for "what did it see")

One iteration end to end: the context as sections (goal pinned, puzzle,
state, last failures with refuted rules, lessons digest, precedents each
with kind, gist, score, link); the tool transcript step by step (tool name,
arguments, result excerpt, tokens), `try_submit` results showing the diff
that came back; the proposal; the gate; what happened next. The request's
token count next to the global counter.

### 4. Inbox `/inbox` (phone first)

Pending proposals, one card each: guideline text large, reason, evidence
(N blocked puzzles, expandable), Approve and Reject. After approving: "goal
is now version N, M puzzles reopened". Resolved below, collapsed. Empty
state: "nothing to decide".

### 5. Request `/request` (phone, QR)

One text field, an optional picker of reserve puzzles (thumbnails of their
first example), submit. Then the request card and within seconds its
outcome with the reason. No login.

### 6. Goal `/goal` (laptop)

The goal document readable, with version history: each approved change,
who, when, how many puzzles it reopened. Read-only.

### Later, not for the demo

`/timeline` (all KPIs as charts plus the attempt log), `/library` (raw
sources with search), `/worker/[id]`.

## Interactions to design explicitly

- The kill: five rows dark red, five cells to grey, five requeues in the
  feed, five cells blue on other rows. Within 30 seconds.
- The approval wave: version ticks with a ripple, red cells go grey, blue,
  green over the next minute, a marker appears on the curve.
- A cell turning from teal (merged) to green (solved) when the planner
  scores it.
- Opening a puzzle from the grid and reading its program next to the
  grids.

## Deliverables

Mockups for screens 1 to 4 at desktop width, 4 and 5 at phone width, the
two states for screens 1 and 2. A component sheet: status colors, the
cell, the ARC grid renderer (with the diff outline), the worker row, the
feed line, the proposal card, the counter, the curve, the precedent card,
the code block.
