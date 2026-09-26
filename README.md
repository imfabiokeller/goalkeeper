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
  Every worker run, diff, test output, orchestrator turn, human answer.
  Enriched at ingest so it can be found, read raw so nothing is lost. It
  grows without bound and nobody ever reads it whole.
- **The lens** (hot): small, human-owned, versioned, always in context. The
  goal and its criteria, the taste and guidelines, the interface contracts,
  the out-of-scope list. It is pinned into every request and it shapes
  retrieval from the library.
- **One rule between them:** nothing moves from the library to the lens
  without a human. The swarm can learn anything into the library; it cannot
  change its own instructions.

Every worker gets a context built for its task from the whole raw record,
so nothing degrades. Every task is tied to a criterion a human approved and
verified by a deterministic gate, so nothing drifts.

## The shape

- MongoDB Atlas is the coordinator, the memory, the queue and the ledger.
  Five collections: `lens`, `tasks`, `sources`, `asks`, `merges`.
- Workers are stateless and disposable. Claim a task, get a briefing, run a
  coding agent in a fresh worktree, write the run to the library, exit.
  Twenty run in parallel. A dead worker's task is requeued by heartbeat.
- The orchestrator is a stateless function: read the lens and the ledger,
  emit the next tasks with criterion links and declared file scopes, exit.
  It cannot edit the lens.
- The gate is deterministic: tests, typecheck, scope check. No model judges
  a model. A rebase conflict means redo on fresh main, not merge.
- Humans set the goal, answer asks, and approve lens changes. Nothing else.

## Docs

- [docs/DESIGN.md](docs/DESIGN.md): the architecture and the reasoning.
- [docs/DATABASE.md](docs/DATABASE.md): collections, indexes, the claim
  query, the briefing query, operations end to end.
- [docs/ORCHESTRATOR.md](docs/ORCHESTRATOR.md): one iteration, triggers,
  prompt, validation.
- [docs/GOAL.md](docs/GOAL.md): the goal document for the hackathon day.
- [docs/DAY-PLAN.md](docs/DAY-PLAN.md): the timeline, the split, the cuts.
- [docs/DEMO.md](docs/DEMO.md): the three-minute script and the video.
- [docs/QA.md](docs/QA.md): the judges' questions and the answers.
- [docs/PRIOR-ART.md](docs/PRIOR-ART.md): what exists and how this differs.

## Built during the event

Everything in `src/` (none yet). The coding agent inside each worker
(Claude Code headless or Codex CLI), the target repository, git, Vercel,
OpenRouter and Atlas are reused as is.

License: Apache 2.0.
