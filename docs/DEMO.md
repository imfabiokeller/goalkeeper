# The demo

Three minutes, then Q&A. No slides. Already running when the slot starts.

## Script

**0:00 to 0:30.** The stage view. "Four hundred ARC puzzles, cheap
open-weight models, running since 14:30. No worker keeps state, no worker
can change the goal." Point at the solve-rate curve: "same model, and the
rate is climbing, because what each worker is shown keeps getting better."
Point at the two counters: library tokens rising, context per request
flat.

**0:30 to 1:15.** Click a solved puzzle. The grids, the program, and above
it the precedents the worker was given: two programs from similar puzzles
retrieved from the library, and a refuted rule from an earlier attempt on
this puzzle. The gate: three checks, pass. "No model judged this. The
program ran on every example."

**1:15 to 1:45.** Kill five workers from the Dokploy UI. Their rows go red,
their cells fall back to grey, other rows pick them up within 30 seconds.
The curve does not care. "Workers are disposable. The memory is not."

**1:45 to 2:30.** The inbox on a phone. A proposal: "12 puzzles blocked
with 'output size unclear'. Guideline: compare output and input sizes
across all pairs before hypothesizing." Approve. On the stage: goal
version 2, red cells go grey, blue, green. The version marker on the
curve. "Humans approve the goal, never the work."

**2:30 to 3:00.** Back to the curve. "Solve rate at 14:30 versus now.
Every point on this line passed a deterministic check against a criterion
a human approved. Library and goal: agents own the big part that never
needs reading; humans own the small part that matters."

## The interactive part (the room)

The QR leads to `/request`. Three things the audience can do that show
on the projector within a minute:

- **Pick a puzzle.** The reserve is 100 unscheduled puzzles shown as
  thumbnails. Tap one: its cell lights up on the grid, a worker claims it,
  and the room watches it get solved (or blocked) live. Before the worker
  finishes, put the puzzle's examples on the projector and ask the room
  for the rule. The worker's one-sentence rule appears next to their
  guess. Humans versus the swarm on the same puzzle, no narration needed.
- **Doubt a solve.** "That program is hardcoded" on any green cell: a
  recheck runs, the old program stays until a new one passes.
- **Suggest a guideline.** Lands in the inbox as a proposal. Approve one
  from the room on stage and the version ticks.

Goal updates stay in the demo for one reason: they are the only moment a
human touches the system on stage, and they make the point that the swarm
learns into the library but cannot change its own instructions. If the
blocked pile is too small for a real proposal at 15:30, use a prepared
guideline from the crowd form.

## The one-minute video

The curve, one puzzle page with its precedents, the kill, the approval
wave, the counters. Recorded by 16:30 from the real run.

## Moments to rehearse until they cannot fail

- Kill-and-resume.
- A puzzle page with precedents and a refuted rule.
- Approve on the phone, blocked cells resolve.
- A crowd request from the reserve lighting a cell (use a prepared one).
- The curve with at least two version markers.
