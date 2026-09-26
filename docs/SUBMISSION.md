# Submission text

Paste into the Cerebral Valley form. Problem statement two: long horizon
engineering.

## One line

goalkeeper: a runtime for long-running agent work where no agent keeps
state, no agent can change the goal, and any worker can die.

## Description

Long-running agents degrade because their context is a pile, and they
drift because the thing doing the work is also the thing remembering
why. goalkeeper separates the two. The library is raw, append-only and
machine-written: every run, gate verdict and planner turn, enriched at
ingest and retrieved with Atlas `$rankFusion` (vector, text, recency)
plus rerank. The goal is small and human-written once. Disposable,
stateless workers claim puzzles from a queue in MongoDB Atlas, get a
context built fresh for their puzzle (about 4k tokens, whatever the size
of the library), write a program, test it against the puzzle's example
pairs through a deterministic gate, and hand it in. A hidden test answer
the worker never sees scores it. Kill five workers mid-puzzle and their
puzzles are picked up by others with the same lessons; nothing is lost.

Today it ran ARC-AGI-1 (400 evaluation puzzles) with DeepSeek V4 Flash
with thinking off, six workers, for under a dollar. Our own control, the
same model one shot per puzzle with no tools and no library, gated and
scored the same way: 10% solved, 12.5% with two attempts (40 puzzles,
`usecase/tools/baseline.json`; ARC Prize reports 12 to 13% for this
model without thinking). With the harness, by 16:20: 74 puzzles solved
on the hidden test, 82% of the puzzles it finished, while the library
grew from 0 to 14.8M tokens and every agent still read about 4k. A third
of the solves came on a second or later attempt, after a refuted rule,
a hidden-score hint or a library that had grown. The claim on screen:
the library grows, the context does not, and the solve rate goes up.

## Links

- Live screen: https://goalkeeper-gamma.vercel.app (stage, click a card;
  /library; /task/[id])
- Repo (Apache 2.0, everything in `src/` and `usecase/` built today):
  https://github.com/imfabiokeller/goalkeeper
- MongoDB Atlas is the coordinator, the queue, the memory and the ledger:
  five collections, one atomic claim, `$rankFusion` retrieval, `$rerank`.

## Built today vs reused

Built: worker loop (claim, heartbeat, context assembly, AI SDK tool loop
with `try_submit`, gate, write), library (enrichment, retrieval, briefing),
planner (reaper, emit, hidden scoring, reopen, metrics, lessons digest),
ARC use case (fixture, sandbox, checks, baseline script), the screen, the
kill switch. Reused: MongoDB Atlas, Vercel AI SDK, OpenRouter, Voyage,
Next.js, Docker, the ARC-AGI-1 data.
