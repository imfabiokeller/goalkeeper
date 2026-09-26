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
- The use case is ARC (docs/USE-CASE.md). `usecase/answers/` is read by
  `score()` only; no worker, context, prompt or library document may
  contain a test output. Model-written programs run only in
  `usecase/sandbox.ts`, never in the worker process.
- No process keeps state. Nothing writes the `goal` document after seed. The gate is deterministic. The library
  (`sources`) is raw and append-only. Workers never ask humans; they submit
  or block. No proposals, no inbox, no goal diffs, no crowd. If a change breaks one of these, it is wrong, however
  convenient.
- The worker's agent loop is the Vercel AI SDK (`generateText` with tools
  and a step budget). No direct provider SDK calls. All models go through
  OpenRouter and are cheap open-weight models (DeepSeek, Qwen, Kimi,
  MiniMax). Never Claude or any other frontier model, in code, env
  defaults or docs.
- Every write that two processes could race on is one `findOneAndUpdate`
  with a precondition. No read-then-write.
- Keys live in `.env`, never in the repo.
- No UI implementation until the design mockups exist (docs/SCREEN-BRIEF.md
  is the brief). The screen stream starts from the mockups.
- Stay inside your stream's folders. Two streams never edit the same file;
  if you need a change in `src/shared/`, make it minimal and additive.

## Git

- Commit messages follow Conventional Commits: `type: summary`, with type
  one of `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `planning`.
- Everyone commits to `main`. Before starting work, before committing, and
  before pushing, run `git pull --rebase --autostash` so you build on the
  latest `origin/main`. Push right after each commit so others see it.
- Only commit when `npm run typecheck` and `npm test` pass.
- If a rebase conflicts, resolve it before any other work. If you cannot,
  run `git rebase --abort` and ask a human.
- Never force-push and never rewrite commits that are already on GitHub.

## Layout

```
src/
  shared/    types.ts (Zod schemas, the contract), db.ts (client, collections, indexes), llm.ts (AI SDK providers)
  gate/      gate.ts: pure, runs the checks named by the task's criteria (from usecase/checks.ts)
  context/   retrieve.ts ($rankFusion), assemble.ts (pinned plus passages into messages)
  worker/    loop.ts, claim.ts, run.ts (AI SDK tools), write.ts (source plus enrichment)
  planner/   lock.ts, reaper.ts, emit.ts, score.ts, reopen.ts, metrics.ts, plan.ts
  seed/      goal.json, inputs loader, dev fakes
  screen/    Next.js (after mockups)
docs/
```
