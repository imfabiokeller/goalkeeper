# MVP: implementation plan

Decided at 12:00, use case decided at 14:00 (ARC, see USE-CASE.md). This
is the build reference. If a doc disagrees with this one, this one wins
and the other doc gets fixed.

## Decisions

- Pure state. Workers produce JSON proposals. For ARC the proposal carries
  a program as a string; the check runs it in a sandbox. No repo, no
  browser inside a worker.
- The worker's agent loop is the Vercel AI SDK (`ai@7`, `generateText`
  with tools, `stopWhen: stepCountIs(20)`). OpenRouter for all model calls
  (cheap open-weight models only), Voyage for embeddings.
- Two deployables from one image: `worker` (N copies) and `screen`
  (Next.js). The planner, the gate, the sandbox and the enrichment are
  functions inside the worker. No other process.
- No asks from workers. A worker submits or blocks with a reason.
- The goal is written once by a human at seed and never changes during
  the run. No proposals, no inbox, no goal diffs. Workers learn only
  through the library.
- The gate is a registry of pure check functions. No model reviews work.
- The hidden metric: `score()` from the use case, run by the planner on
  merged state, never by a worker. Written to `state.score`. The solve
  rate on screen is derived from it.
- `usecase/` is the interface (lens, inputs, checks, samples, answers).
  Nothing domain-specific in `src/`.
- No UI implementation until the mockups exist. `docs/SCREEN-BRIEF.md` is
  the brief.

## Architecture

```
                 ┌──────────────────── Atlas ────────────────────┐
                 │   goal  inputs  tasks  state  sources         │
                 └──▲──────────────▲───────────────────▲─────────┘
                    │              │                   │
        worker ×N ──┘   (claim, run, gate, write; plan() under a lock when idle)
        screen ────────────────────────────────────────┘   (read-only, polling)
```

One worker iteration:

1. `claim()`: atomic `findOneAndUpdate` on `tasks`, open to claimed.
   Nothing to claim: try the planner lock, run `plan()`, sleep 2 s.
2. `assemble()`: goal (fresh), input text, current state for the key, last
   gate failures on the key (with the rules already tried, marked
   refuted), the lessons digest, and a briefing synthesized from
   retrieved library passages. Under 20k tokens.
3. `run()`: AI SDK loop. Tools: `read_input`, `read_state`,
   `search_library`, `try_submit(proposal)` (runs the gate, returns
   reasons, records nothing), `submit`, `block`. Heartbeat every 15 s.
   Deadline 4 minutes.
4. `gate()`: pure. Runs the checks named by the task's criteria.
5. Write: pass means `state` upsert with a version precondition and task
   `merged`. Fail means task `open` with attempt + 1 until
   `MAX_ATTEMPTS` (5), then `blocked` with the reasons. Block means
   `blocked` with the reason (reopened later when the library has grown).
   Always one `sources` document with the run.
6. Any throw: task back to `open`, a `sources` document with the error.

`plan()` (one worker at a time, lock with a 30 s TTL):

1. Reaper: claimed tasks with a heartbeat older than 30 s go back to open.
2. Emit: for every scheduled input with no state and no open, claimed or
   blocked task, one task. Keep about three times the worker count open.
3. Score: merged state with `score: null`: run `score()`, write
   `state.score`. A `0` reopens the key once with the hint "passed the
   examples, wrong on the test: the rule is too specific" (ARC allows two
   attempts); a second `0` stays unsolved.
4. Reopen: every 20 new merges, blocked tasks older than the 20th merge
   go back to open (the library grew; a puzzle nobody could solve at
   14:00 may be solvable now).
5. Metrics: refresh the `metrics` document, including solve rate per
   bucket.
6. Backfill: enrich sources missing `enrichment`.
7. Write a `planner-turn` source.

No crowd, no audience interaction. All 400 puzzles are scheduled at
seed.

## Plan from 14:00, in parallel

Five streams, each in its own folders. Two streams never edit the same
file. `src/shared/types.ts` and DATABASE.md change in the same commit as
the code that needs them (stream U, first).

| Stream | Owner | Folders | What | Done when |
|---|---|---|---|---|
| U usecase | agent | `usecase/`, `src/shared/types.ts` (additive) | Fetch ARC eval, write `inputs/`, `inputs.json`, `answers/`, `lens.json`, `sandbox.ts`, `checks.ts` (schema, reproduces, general, score), 5 samples, `check-samples.ts`. Delete the earnings fixture. Add `score` to `State`. | `node usecase/check-samples.ts` passes; `npm test` passes with the new fixture |
| W worker | agent | `src/worker/`, `src/context/` | `try_submit` tool calling the gate through `RunCtx.dryRun`; `MAX_ATTEMPTS` 5 before blocked; pin refuted rules from prior attempts into the context; enrichment prompt made domain-neutral (reads the goal statement, no earnings words). | worker tests pass with a mocked model; one real merge against Atlas |
| P planner | agent | `src/planner/` | Delete propose, classify, applyDiff, questions. Score step (`score()` at merge, `state.score`, reopen once on 0); emit skips keys with state; reopen-on-library-growth; metrics: solve rate per 15-minute bucket, solved/merged/attempted counts, median steps to merge. | planner tests pass; `npm run invariants` clean |
| S screen | after mockups | `src/screen/` | Stage view, puzzle page, task page. Polling against Atlas. | renders from the live database |
| D deploy and demo | Fabio | `compose.yaml`, `.env`, docs | Re-seed Atlas, 8 workers on the VPS by 15:00, 20 by 15:45, kill test, rehearse, record. | the moments in DEMO.md cannot fail |

Order inside the afternoon:

- 14:00 to 14:30: U writes types first (10 minutes, additive), then the
  fixture. W and P start against the types at once, with the earnings
  fixture still in place for their tests.
- 14:30: U merges the ARC fixture. `npm test` must pass on `main` with it.
  Re-seed Atlas `--db live`. First real merge locally.
- 14:45: W merges `try_submit`. 8 workers on the VPS. Watch the first ten
  merges; fix the prompt if the model ignores `try_submit`.
- 15:00: P merges score and metrics. The curve has its first points.
- 15:15: kill test on the VPS. Scale to 20.
- 16:00: screen on Vercel against the live database.
- 16:30: freeze `src/` except the screen. Record the video. Rehearse twice.
- 16:50: repo public, README's built-today list accurate. Submit.

Cuts, in order, if behind: reopen-on-library-growth, the task page. Never cut: claim, heartbeat, reaper, gate, sandbox,
`try_submit`, hidden score, the curve, the puzzle page.

## Acceptance criteria

U
- `node usecase/check-samples.ts` passes: every sample produces its
  expected outcome per check.
- A program that hardcodes an example output fails `general`.
- A program that loops forever fails `reproduces` within 2 s with a
  timeout reason, and the worker process is unaffected.
- No file under `usecase/inputs/` or in `inputs.json` contains a test
  output.

W
- `try_submit` returns the same reasons `gate()` would and records no
  outcome; a run can call it several times and still `submit`.
- A third failed attempt reopens; the sixth blocks.
- The pinned failures section lists the rules of prior attempts.

P
- After a merge, the next `plan()` writes `state.score` and never reads
  `answers/` anywhere else.
- A `score: 0` reopens the key once with a hint; a second `score: 0` does
  not.
- `metrics.solveRate` has one entry per 15-minute bucket.

S
- Stage view renders grid, curve, workers, feed and counters from the live
  database and updates without reload.
- Puzzle page renders grids with the diff outline, program, gate,
  precedents.

End to end
- 14:30: one real merge locally against Atlas.
- 15:15: kill five of twenty on the VPS, all five tasks merged by others
  within two minutes.
- `npm run invariants` clean every 30 minutes from 15:00.

## How it runs

```
cp .env.example .env         # fill keys
npm install
npm run indexes              # once per database
npm run seed -- --db live    # goal v1 and the puzzles
npm run worker               # one worker
```

VPS: Dokploy Compose service, `WORKER_REPLICAS` for the swarm size. The
kill moment: stop five containers from the Dokploy UI.

Environment: `MONGODB_URI`, `MONGODB_DB`, `OPENROUTER_API_KEY`,
`VOYAGE_API_KEY`, `WORKER_MODEL`, `ENRICH_MODEL`, `WORKERS_TARGET`,
`BUDGET_USD`.
