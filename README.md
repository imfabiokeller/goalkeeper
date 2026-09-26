# goalkeeper

A runtime for long-running agent work where no agent keeps state, no agent
can change the goal, and any worker can die.

Built at the MongoDB Harness Engineering & Model Wrangling Hackathon, New
York, September 26, 2026. Problem statement two: long-horizon engineering.

## The claim

Long-running agents degrade because their context is a pile: stale tool
output, superseded decisions, three attempts at the same thing, the important
part lost in the middle. And they drift, because the thing doing the work is
also the thing remembering why.

goalkeeper separates the two:

- **The library** (cold): everything, raw, append-only, machine-written.
  Every worker run, gate result, planner turn, crowd request, human answer.
  Enriched at ingest so it can be found, read raw so nothing is lost. It
  grows without bound and nobody ever reads it whole.
- **The goal** (hot): small, human-approved, versioned, always in context.
  The statement, the criteria each with a deterministic check, the
  guidelines, the out-of-scope list. It is pinned into every request and
  it shapes retrieval from the library.
- **One rule between them:** nothing moves from the library to the goal
  without a human. The swarm can learn anything into the library; it can
  propose a change to its instructions; it cannot make one.

Every worker gets a context built for its task from the whole raw record,
so nothing degrades. Every task is stamped with a goal version and verified
by a deterministic gate, so nothing drifts.

## The shape

- MongoDB Atlas is the coordinator, the memory, the queue and the ledger.
  Six collections: `goal`, `inputs`, `tasks`, `state`, `sources`,
  `questions`.
- Workers are stateless and disposable. Claim a task, assemble a context,
  run a tool loop, gate the proposal, write the result and the raw run,
  exit. Twenty run in parallel. A dead worker's task is requeued by
  heartbeat.
- The planner is a function any idle worker runs under a lock: reap,
  emit tasks for undone units, classify crowd requests, propose a
  guideline when tasks block for the same reason. It cannot edit the goal.
- The gate is a registry of pure check functions. No model judges a model.
- The work product is a JSON proposal per unit (pure state), not code. The
  harness is work-agnostic; a coding worker is the same loop with a
  worktree and a test check.
- Humans approve goal changes and submit requests. Nothing else.

## Docs

- [docs/MVP.md](docs/MVP.md): the build plan, acceptance criteria, how it
  runs. Wins over every other doc.
- [docs/DESIGN.md](docs/DESIGN.md): the architecture and the reasoning.
- [docs/DATABASE.md](docs/DATABASE.md): collections, indexes, the claim,
  the retrieval query, operations end to end.
- [docs/PLANNER.md](docs/PLANNER.md): the planner steps, classification,
  proposals, applyDiff.
- [docs/GOAL.md](docs/GOAL.md): the goal document, version 1.
- [docs/USE-CASE.md](docs/USE-CASE.md): what a demo use case must provide.
- [usecase/README.md](usecase/README.md): a candidate use case (headline
  earnings from press releases), the development fixture until a use case
  is chosen.
- [docs/SCREEN-BRIEF.md](docs/SCREEN-BRIEF.md): the design brief for every
  screen.
- [docs/DAY-PLAN.md](docs/DAY-PLAN.md): the rules and the cuts.
- [docs/DEMO.md](docs/DEMO.md): the three-minute script and the video.
- [docs/QA.md](docs/QA.md): the judges' questions and the answers.
- [docs/PRIOR-ART.md](docs/PRIOR-ART.md): what exists and how this differs.

## Built during the event

Everything in `src/`. Atlas, the Vercel AI SDK, OpenRouter, Cerebras,
Voyage, Next.js and Docker are reused as is.

License: Apache 2.0.
