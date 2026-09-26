# Working in this repo

Read README.md, then docs/DESIGN.md and docs/DATABASE.md before writing any
code. docs/DATABASE.md is the contract between the two halves of the build;
change it in the same commit as the code that changes it.

## Rules

- Everything in `src/` is written during the hackathon (September 26, 2026,
  10:30 to 17:00). Nothing is pasted in from other projects.
- One logical change per commit, committed as soon as it works.
- No em dashes in any text: code comments, docs, commit messages, UI copy.
- No agent keeps state. No agent edits the `lens` collection. The gate is
  deterministic. Memory is raw and append-only. If a change breaks one of
  these, it is wrong, however convenient.
- The coding agent inside a worker is a subprocess (Claude Code headless or
  Codex CLI) with a tool allowlist and a step budget, running in a fresh git
  worktree from the task's `baseCommit`.
- Keys live in `.env`, never in the repo. `RETRIEVAL_BENCH_ENV_FILE` style
  indirection is fine.

## Git

- Commit messages follow Conventional Commits: `type: summary`, with type
  one of `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `planning`.
- Before starting work, before committing, and before pushing, run
  `git pull --rebase --autostash` so you build on the latest `origin/main`.
- Push to `origin main` right after each commit so teammates see it.
- Never force-push and never rewrite commits that are already on GitHub.
- If a rebase conflicts, resolve it before any other work. If you cannot,
  run `git rebase --abort` and ask a human.

## Layout (planned)

```
src/
  orchestrator/   one iteration: read, plan (script + model), validate, write
  worker/         claim, briefing, subprocess agent, write run, exit
  gate/           rebase, checks (tsc-strict-file, suite, new-test, scope), merge, redo
  memory/         ingest enrichment, retrieval ($rankFusion), briefing synthesis, grounding
  lens/           read, version, human edit, ask-approved change
  screen/         Next.js: live view (change streams), QR request page, asks page
  shared/         Atlas client, collections, types
docs/
```
