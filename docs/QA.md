# Judges' questions

**Isn't this just RAG?**
RAG retrieves to answer a question. Here retrieval builds the context for
a worker that produces verified work toward a goal, and the model never
sees history. The memory drives a runtime, it does not answer questions.

**Why not one agent with a one-million-token context?**
Cost per request, degradation as the pile grows, and the process dying with
everything in it. Our context per request is flat all day while the library
grows without bound, and any worker can die.

**Two workers, same unit?**
Cannot happen: the claim is one atomic update, the planner never emits a
task for a busy key, and the state write has a version precondition. A
lost race is a redo, not a merge.

**How do you know it did not drift?**
Every task is stamped with the goal version and cites its criteria. The
gate runs those criteria's checks. The planner cannot edit the goal; it can
only propose a diff, and a human approves it. State merged under an old
version stops counting as done and is redone.

**Why no judge agent?**
A model judging a model shares its biases. Our judge is a registry of pure
check functions: grounded quote, arithmetic, schema. Deterministic,
milliseconds, auditable.

**Why don't workers ask questions?**
A worker asking a human per unit is per-task human involvement, which does
not scale. A worker blocks with a reason. The planner groups the reasons
and proposes one guideline; one approval resolves every blocked unit.

**Why pure state instead of code?**
The harness is work-agnostic: claim, context, submit, gate. A coding
worker is the same loop with a worktree and a `tsc` check kind. Pure state
let us run hundreds of merges an hour today and show the harness instead
of a test runner.

**Isn't this Gastown / Composio / a Strands swarm?**
Those are supervision tools with the coordinator's own chat as memory, or
in-process handoffs inside one session. Here no agent keeps state, the
database is the only coordinator, and the goal is enforced at merge time.

**Why raw memory instead of extracted facts?**
Consolidating sources into summaries loses the exact values and rejected
options that later tasks need. We keep raw passages, enrich at ingest, and
retrieve with `$rankFusion`. Cerebras runs its internal knowledge base the
same way.

**What did you build today, what did you reuse?**
Built: the worker loop (claim, heartbeat, context assembly, AI SDK tool
loop, gate, write), the check registry, the planner (reaper, emit, crowd
classification, proposals, applyDiff, metrics), enrichment and retrieval,
the live screen. Reused: Atlas, the Vercel AI SDK, OpenRouter, Voyage,
Next.js, Docker.

**What happens when a worker dies?**
Its heartbeat stops, the task goes back to open within 30 seconds, a new
worker claims it and gets a fresh context from the library. We will show it.

**Where does this go after today?**
Coding workers with the same harness (a worktree and a test check kind),
metric criteria (optimize startup time, keep tests green), durable
execution underneath, workers on any container host.
