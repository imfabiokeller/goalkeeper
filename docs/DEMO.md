# The demo

Three minutes, then Q&A. No slides, no audience interaction. Already
running when the slot starts.

## Script

**0:00 to 0:30.** The stage view. "Four hundred ARC puzzles, cheap
open-weight models, running since 14:30. No worker keeps state. The goal
was written once by a human and never touched again." Point at the
solve-rate curve: "same model, and the rate is climbing, because what
each worker is shown keeps getting better." Point at the two counters:
library tokens rising, context per request flat.

**0:30 to 1:20.** Click a solved puzzle. The grids, the program, and above
it the precedents the worker was given: two programs from similar puzzles
retrieved from the library, and a refuted rule from an earlier attempt on
this puzzle. The gate: three checks, pass. "No model judged this. The
program ran on every example. The hidden test answer it was scored
against, it never saw."

**1:20 to 1:50.** Kill five workers from the Dokploy UI. Their rows go red,
their cells fall back to grey, other rows pick them up within 30 seconds.
The curve does not care. "Workers are disposable. The memory is not."

**1:50 to 2:30.** Open a task page. "This is everything one worker saw:
the goal, the puzzle, three refuted rules, the lessons digest, two
precedents. Fifteen thousand tokens. The library behind it is two hundred
million." Scroll the transcript: try_submit, the diff, the fix, submit.

**2:30 to 3:00.** Back to the curve. "Solve rate at 14:30 versus now.
Every point on this line passed a deterministic check against a criterion
a human wrote. Library and goal: agents own the big part that never needs
reading; humans own the small part that matters."

## The one-minute video

The curve, one puzzle page with its precedents, the kill, one task page,
the counters. Recorded by 16:30 from the real run.

## Moments to rehearse until they cannot fail

- Kill-and-resume.
- A puzzle page with precedents and a refuted rule (pick it beforehand).
- A task page with a try_submit diff in the transcript (pick it
  beforehand).
- The curve with at least an hour of points.
