# The demo

Three minutes, then Q&A. No slides, no audience interaction. Already
running when the slot starts.

## Script

**0:00 to 0:30.** The stage view. "Four hundred ARC puzzles, DeepSeek
Flash with thinking off, running since 14:30. No worker keeps state. The
goal was written once by a human and never touched again." Point at the
hero chart: "solve rate as the library grows: one shot, this model gets
12%. With the harness it is around 50% and rising, while every agent
still reads about 4k tokens." Point at the library tokens counter.

**0:30 to 1:20.** Click a solved puzzle. The grids, the program, and above
it the precedents the worker was given: two programs from similar puzzles
retrieved from the library, and a refuted rule from an earlier attempt on
this puzzle. The gate: three checks, pass. "No model judged this. The
program ran on every example. The hidden test answer it was scored
against, it never saw."

**1:20 to 1:50.** Press "stop 5 agents". Five cards turn red ("Agent
stopped"), the toast says their puzzles went back in the queue, and within
30 seconds the puzzles reappear as "Resumed" on other agents with the
same lessons. The curve does not care. "Workers are disposable. The
memory is not."

**1:50 to 2:30.** Open the library page: "raw, append-only, machine
written, N entries, M million tokens, nobody reads it whole." Then a task
page: "this is everything one agent read: the goal, the puzzle, two
refuted rules, the lessons digest, three precedents. Four thousand
tokens." Scroll the timeline: try_submit, the diff, the fix, submit.

**2:30 to 3:00.** Back to the hero chart. "Same model all day. One shot,
12%. With a library it never reads whole, 50% and climbing. Every point
on this line passed a deterministic check against a criterion a human
wrote. Agents own the big part that never needs reading; humans own the
small part that matters."

## The one-minute video

The curve, one puzzle page with its precedents, the kill, one task page,
the counters. Recorded by 16:30 from the real run.

## Moments to rehearse until they cannot fail

- The stop button and the resumed cards (rehearse twice; it costs
  nothing).
- An expanded card with precedents and a refuted rule (pick the key
  beforehand, `/?open=<key>`).
- A task page with a try_submit diff in the timeline (pick the id
  beforehand).
- The library page and the hero chart with two hours of points.
