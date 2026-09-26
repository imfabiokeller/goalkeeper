# MVP: implementation plan

Decided at 12:00 on hackathon day. This is the build reference. If a doc
disagrees with this one, this one wins and the other doc gets fixed.

## Decisions

- Pure state. Workers produce JSON proposals, not code. No repo, no
  browser, no test runner inside a worker.
- The worker's agent loop is the Vercel AI SDK (`ai@7`, `generateText`
  with tools, `stopWhen: stepCountIs(20)`). Providers: OpenRouter for
  workers, Cerebras for enrichment, Voyage for embeddings.
- Two deployables from one image: `worker` (N copies) and `screen`
  (Next.js). The planner, the gate and the enrichment are functions inside
  the worker. No other process.
- No asks from workers. A worker submits or blocks with a reason.
- The goal changes only through an approved diff proposed by the planner.
  One diff operation today: `add-guideline`.
- The gate is a registry of pure check functions. No model reviews work.
- No use case has been chosen yet; we are still looking for a pure-state
  one. `usecase/` holds a candidate as the development fixture and is the
  interface:
  `lens.json` (the goal), `inputs.json` and `inputs/` (the units),
  `checks.ts` (the check functions, `(proposal, input, state) -> { pass,
  reasons }`), `samples/`. The harness imports from there and nothing
  domain-specific lives in `src/`.
- No UI implementation until the mockups exist. `docs/SCREEN-BRIEF.md` is
  the design brief; S5 starts from the mockups.

## Architecture

```
                 ┌──────────────────── Atlas ────────────────────┐
 /request ─────▶ │ goal  inputs  tasks  state  sources  questions│ ◀── /inbox approve
                 └──▲──────────────▲───────────────────▲─────────┘
                    │              │                   │
        worker ×N ──┘   (claim, run, gate, write; plan() under a lock when idle)
        screen ────────────────────────────────────────┘   (change streams, read-only + two forms)
```

One worker iteration:

1. `claim()`: atomic `findOneAndUpdate` on `tasks`, open to claimed.
   Nothing to claim: try the planner lock, run `plan()`, sleep 2 s.
2. `assemble()`: goal (fresh), input text, current state for the key, last
   gate failures on the key, retrieved library passages. Under 20k tokens.
3. `run()`: AI SDK loop. Tools: `read_input`, `read_state`,
   `search_library`, `submit(proposal)`, `block(reason)`. Heartbeat every
   15 s. Iteration deadline 4 minutes.
4. `gate()`: pure. Runs the checks named by the task's criteria with the
   params from the goal version stamped on the task.
5. Write: pass means `state` upsert with a version precondition and task
   `merged`. Fail means task `open` with attempt + 1, second fail means
   `blocked` with the reasons. Block means `blocked` with the reason.
   Always one `sources` document with the entire run, enriched inline.
6. Any throw: task back to `open`, a `sources` document with the error.

`plan()` (one worker at a time, lock with a 30 s TTL):

1. Reaper: claimed tasks with a heartbeat older than 30 s go back to open.
2. Emit: for every input key with no state at `goal.version` and no open,
   claimed or blocked task, one task (all criteria). Keep about three times
   the worker count open.
3. Crowd: unhandled `crowd-request` sources, one model call each, into
   task (priority), recheck, proposal or parked with a reason.
4. Propose: three or more blocked tasks with similar reasons and no pending
   question about them, one model call, `request_approval(add-guideline)`.
5. Metrics: refresh the `metrics` document.
6. Backfill: enrich sources missing `enrichment`.
7. Write a `planner-turn` source.

`applyDiff()` (called by the screen on approval): append the guideline,
`version + 1`, history entry, blocked tasks at the old version back to
open, question `approved`.

## Workstreams

| Stream | Owner | Scope | Depends on |
|---|---|---|---|
| S0 scaffold | Fabio | package, tsconfig, `shared/` (types, db, llm), compose, this doc | nothing |
| S1 gate | agent | `gate/` over `usecase/checks.ts`, tests on `usecase/samples/` | S0 types |
| S2 worker | agent | `worker/` (claim, assemble, run, write), `context/` retrieval | S0 types, S1 gate interface |
| S3 planner | agent | `planner/` (lock, reaper, emit, classify, propose, applyDiff, metrics) | S0 types |
| S4 seed | agent | `seed/` goal from `usecase/lens.json`, inputs loader, dev fakes | S0 types |
| S5 screen | after mockups | `screen/` Next.js against the dev database | mockups, S0 types, S4 dev fakes |

Every stream commits straight to `main` (pull with rebase first, push
right after). Fabio reviews on `main`.

## Acceptance criteria

Each is a command that passes, or a state you can see.

S0
- `npm run typecheck` passes on an empty `src/` with `shared/` in place.
- `npm run indexes` creates the collections and indexes on the configured
  database and is idempotent.

S1
- `npm test -- gate` passes: every sample in `usecase/samples/` produces
  its expected outcome through `gate()`.
- `gate()` is pure: no imports from `shared/db`.
- A task citing a criterion whose check kind is not in `usecase/checks.ts`
  fails the gate with a reason.

S2
- `npm test -- worker` passes with a mocked model: one iteration against a
  test database produces one `state` doc, one `merged` task, one `sources`
  doc with `tokens` and `enrichment`.
- Two workers started against the same queue never hold the same task
  (integration test with 10 tasks, 2 workers, mocked model).
- `assemble()` output is under 20k tokens for every fixture input.
- Killing a worker mid-iteration (SIGKILL in the test) leaves the task in
  `claimed` with a stale heartbeat and nothing else written.

S3
- `plan()` on a seeded database emits exactly one task per undone key and
  none for keys with open, claimed or blocked tasks.
- The reaper returns a task with a 31 s old heartbeat and leaves a 29 s
  one alone.
- Two concurrent `plan()` calls: one gets the lock, the other returns
  immediately.
- A crowd request fixture for each of the four outcomes lands in the right
  place with a reason.
- `applyDiff()` bumps the version, writes history, reopens blocked tasks at
  the old version only.

S4
- `npm run seed -- --db dev` fills a database with a goal at version 2 with
  history, 500 tasks in every status, sources of every kind, three
  questions, a metrics doc. Rerunnable.
- `npm run seed -- --db live` loads the goal at version 1 and the real
  inputs, nothing else.

S5
- Stage view renders the units grid, worker rows, live feed, header and
  sparklines from the dev database, updates without reload.
- `/task/[id]`, `/timeline`, `/inbox`, `/request` render from the dev
  database. Approve on `/inbox` calls `applyDiff()`.

End to end (the milestone)
- 13:15: one real merge locally against Atlas.
- 14:00: eight workers on the VPS, kill two, both tasks requeued and
  merged by others within two minutes.
- 15:30: blocked pile, proposal in the inbox, approve, version 2, blocked
  tasks resolve.
- `npm run invariants` clean every 30 minutes from 14:00.

## How it runs

Local:

```
cp .env.example .env         # fill keys
npm install
npm run indexes              # once per database
npm run seed -- --db live    # goal v1 and inputs
npm run worker               # one worker, ROLE=worker
npm run screen               # Next.js on :3000
```

VPS (compose):

```
docker compose up -d --build --scale worker=8
docker compose kill worker-3 worker-7      # the demo moment
docker compose up -d --scale worker=20
```

Environment: `MONGODB_URI`, `MONGODB_DB`, `OPENROUTER_API_KEY`,
`CEREBRAS_API_KEY`, `VOYAGE_API_KEY`, `WORKER_MODEL`, `ENRICH_MODEL`,
`WORKERS_TARGET` (for the emit size), `BUDGET_USD`.

## Timeline from 12:00

- 12:00 to 12:40: S0 merged. S1 to S4 branches started in parallel. S5
  starts when the mockups exist.
- 12:40 to 13:30: S1, S2 merged. First real merge locally.
- 13:30 to 14:00: S3 merged. Compose on the VPS, eight workers, kill test.
- 14:00 to 15:00: retrieval quality, enrichment, crowd classification live.
- 15:00 to 15:30: propose, applyDiff, inbox wired.
- 15:30 to 16:30: invariants, scale to 20, rehearse, record.
- 16:30: freeze. Only the screen changes after this.

Cuts, in order, if behind: metrics page, proposals (blocked list stays),
crowd classification (form still records), retrieval (pinned-only
context). Never cut: claim, heartbeat, reaper, gate, raw sources.
