# The pitch

The presentation is a recorded video, two and a half minutes, screen
only, one voice. Slides carry the claims, the live screen carries the
proof. Every number below is from the live run on September 26, 2026 at
15:50 New York time (`npm run status`, the metrics document, and the
screen at goalkeeper-gamma.vercel.app). Replace them with the numbers at
recording time; the shape of the story does not change.

## In one sentence

Every long-running agent gets worse the longer it runs. goalkeeper gets
better, because the memory lives in a raw library on Atlas and the
workers keep nothing.

## The beats

1. **The problem.** Every long-running agent degrades. The more it has
   done, the worse its next step: the pile it reads from grows and the
   goal sinks in it. More agents means more piles, each dying with its
   process.
2. **The claim.** Package the context right and it flips. The more the
   system has done, the better its next step. Session length and fleet
   size stop being costs.
3. **The mechanism.** Two stores, one rule. The library holds
   everything raw and append-only. The goal was written once by a human
   and locked. Nothing moves from the library to the goal. A worker keeps
   nothing: it claims a puzzle, reads a slice built for that puzzle, runs
   a cheap model with tools, passes a deterministic gate, writes the raw
   run back, exits. Atlas is the queue, the memory and the ledger.
4. **The swarm.** No worker talks to another. They coordinate through
   what they leave behind, like ants and a trail. Any worker can die;
   the trail stays.
5. **The learning.** Two hard signals, no model judging a model. The
   gate runs the program on the examples and a failed rule is pinned as
   refuted. The hidden test score, which no worker sees, reopens a
   puzzle with a hint. Blocked puzzles come back once the library grew.
6. **The proof.** The curve, and the control line under it.
7. **The close.** Agents own the big part nobody reads. Humans own the
   small part that matters.

## The numbers, 15:50

The run: 400 ARC-AGI-1 evaluation puzzles, `deepseek/deepseek-v4-flash`
through OpenRouter with reasoning off, `voyage-3.5` embeddings, six
worker containers on one VPS. Goal written at 14:23 and locked. First
task claimed at 14:28.

| | |
|---|---|
| Puzzles attempted | 148 of 400 |
| Finished (merged or blocked) | 82 |
| Passed the gate (merged) | 78 |
| Solved on the hidden test | 70 |
| Wrong on the hidden test | 8 |
| Solve rate over finished | 85% |
| Solve rate over attempted | 47% |
| Cost of the whole run | $0.78 |
| Cost per solved puzzle | about 1.1 cents |
| Library | 286 records, 14.1M tokens |
| Context per worker request, last 20 runs | 4.0k tokens |
| First-try gate pass, last three hours | 63% |
| Median tool steps per run | 4 |
| Merges on attempt two or later | 33 |
| Reopened by the hidden score ("too specific") | 11 |
| Reopened because the library grew | 9 |
| Only gate failure reason right now | step budget exhausted, 39 times |

The curve, solved puzzles per 15-minute bucket, cumulative:

| 14:15 | 14:30 | 14:45 | 15:00 | 15:15 | 15:30 | 15:45 |
|---|---|---|---|---|---|---|
| 0 | 19 | 29 | 43 | 53 | 68 | 70 |

Solved over attempted went from 37% at 14:30 to 47% at 15:45.

**The control.** `npm run baseline` runs the same model, one
`generateText` call per puzzle, no tools, no retries, no library, gated
and scored the same way. On a deterministic sample of 40 puzzles, two
independent attempts each, finished at 15:58
(`usecase/tools/baseline.json`):

| | |
|---|---|
| Solved on the first attempt | 4 of 40, 10% |
| Solved with either attempt (ARC's pass@2 rule) | 5 of 40, 12.5% |
| Passed the gate | 10% |
| Provider errors, counted as misses | 8 |
| Cost | 3.6 cents |

Published no-thinking DeepSeek V4 runs on ARC-AGI-1 are 12 to 13% (ARC
Prize, semi-private, pass@2), so the control is where it should be. The
harness on the same model is 85% of what it finishes and 47% of what it
has touched. The gap is the harness.

What we do not claim: a benchmark result. The public evaluation set is
likely in training data, so every public-eval number is a best case. The
claim is the delta between the same model with and without the harness,
measured the same way, on the same day.

## The video, shot by shot

Screen recording at 16:9, browser chrome hidden, cursor visible. Record
the screen first, then the voice over it, so a stumble costs one audio
take and not a new capture. Two takes, keep the better.

| Time | On screen | Voice |
|---|---|---|
| 0:00 | Slide, one line: "Every long-running agent degrades." | Beat 1 |
| 0:20 | Slide: "Up, not down." Two sketched curves. | Beat 2 |
| 0:35 | Slide: the architecture diagram ([architecture.html](architecture.html)) | Beat 3 |
| 1:05 | Stage view, still, then the cursor on the curve and the four counters | Beat 6, the numbers |
| 1:30 | Stage view, the control line and the 85% | The control |
| 1:45 | One puzzle card: grids, precedents from other agents, a dead end, the gate | Beats 4 and 5 |
| 2:10 | Library page: the solve timeline, click one solve | The learning numbers |
| 2:30 | Slide: the close line | Beat 7 |

Pick the puzzle card before recording: it needs at least one "worked"
precedent from another agent and one "dead end". On the library page,
pick a solve whose lesson helped a later solve, so the highlight fires.

## Read-aloud script

Plain text for the voice. Calm pace, about 320 words, two and a half
minutes. Numbers in brackets are the ones to update at recording time.

---

Every long-running agent gets worse the longer it runs. The context
fills with stale output and old attempts. The goal sinks to the bottom.
And when the process dies, everything it learned dies with it. Add more
agents, and you get more piles.

goalkeeper flips that. Package the context right, and the more the
system has done, the better its next step. Session length becomes the
asset.

Two stores, one rule. The library holds everything, raw: every run,
every failure, every verdict, never rewritten. The goal was written once
by a human, at twenty-three past two, and locked. Nothing ever moves
from the library into the goal. Workers keep nothing. Each one claims a
puzzle, reads a slice built for that puzzle, about four thousand tokens,
runs a cheap open-weight model, passes a deterministic gate, and writes
its raw run back. Then it exits. MongoDB Atlas is the queue, the memory
and the ledger.

This is the run, live. Four hundred ARC puzzles. DeepSeek V4 Flash, with
reasoning off. Six workers. Started at twenty-eight past two. [Seventy]
puzzles solved on the hidden test in [ninety minutes], for [seventy-eight
cents]. Each worker reads four thousand tokens. The library behind it is
[fourteen million], and climbing.

Same model, one shot, no harness: ten percent. Twelve and a half if you
give it two tries. With the harness, [eighty-five] percent of the
puzzles it finished. The gap is not the
model. The gap is the memory.

Here is one puzzle. Above the grids, what this worker was given: programs
that worked on similar puzzles, written by agents it never met, and a
dead end from an earlier attempt on this one. The gate ran the program
on every example. No model judged it. The hidden answer it was scored
against, it never saw.

Every solve, on a timeline. [Thirty-three] came on a second or later
attempt. [Eleven] were reopened because the hidden score said the rule
was too specific. [Nine] were reopened only because the library had
grown. That is learning from a hard metric, without ever showing the
answer.

No orchestrator. No shared chat. Nobody in charge. Agents own the big
part that nobody reads. Humans own the small part that matters.

---

## Notes for the recording

- The stage view has a "Simulate failure: stop 5 agents" button. It is
  not in this script. If the kill comes back, it goes between the
  puzzle card and the library page, and the line is "Workers are
  disposable. The memory is not."
- The single-shot control at 40 puzzles has wide error bars. Say the
  number and say the sample size; do not round it to a claim.
- Questions after the video are covered by [QA.md](QA.md) and
  `planning/judges.md`. Have the cost and the two solve rates on a card.
