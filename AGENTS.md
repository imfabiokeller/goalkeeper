# Working in this repo

Read README.md, then docs/MVP.md, docs/DESIGN.md and docs/DATABASE.md
before writing any code. docs/MVP.md is the build plan and wins over every
other doc. docs/DATABASE.md and `src/shared/types.ts` are the contract
between the streams; change both in the same commit as the code that
changes them.

## Rules

- Everything in `src/` is written during the hackathon (September 26, 2026,
  10:30 to 17:00). Nothing is pasted in from other projects.
- One logical change per commit, committed as soon as it works.
- No em dashes in any text: code comments, docs, commit messages, UI copy.
- No process keeps state. Nothing but `applyDiff()` after a human approval
  writes the `goal` document. The gate is deterministic. The library
  (`sources`) is raw and append-only. Workers never ask humans; they submit
  or block. If a change breaks one of these, it is wrong, however
  convenient.
- The worker's agent loop is the Vercel AI SDK (`generateText` with tools
  and a step budget). No direct provider SDK calls.
- Every write that two processes could race on is one `findOneAndUpdate`
  with a precondition. No read-then-write.
- Keys live in `.env`, never in the repo.
- No UI implementation until the design mockups exist (docs/SCREEN-BRIEF.md
  is the brief). The screen stream starts from the mockups.

## Git

- Commit messages follow Conventional Commits: `type: summary`, with type
  one of `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `planning`.
- Work on a branch per stream (`s1-checks`, `s2-worker`, ...). Push the
  branch after every commit so others see it. Open a pull request early
  and keep pushing to it.
- Nothing lands on `main` without Fabio's review. Do not merge your own
  pull request.
- Before starting work and before opening a pull request, run
  `git fetch origin && git rebase origin/main` so you build on the latest
  `main`. Resolve conflicts before any other work; if you cannot, ask a
  human.
- Never force-push a branch someone else has pulled. Never rewrite `main`.

## Layout

```
src/
  shared/    types.ts (Zod schemas, the contract), db.ts (client, collections, indexes), llm.ts (AI SDK providers)
  checks/    registry.ts and one file per check kind: pure functions
  gate/      gate.ts: pure, runs the checks named by the task's criteria
  context/   retrieve.ts ($rankFusion), assemble.ts (pinned plus passages into messages)
  worker/    loop.ts, claim.ts, run.ts (AI SDK tools), write.ts (source plus enrichment)
  planner/   lock.ts, reaper.ts, emit.ts, classify.ts, propose.ts, applyDiff.ts, metrics.ts, plan.ts
  seed/      goal.json, inputs loader, dev fakes
  screen/    Next.js (after mockups)
docs/
```
