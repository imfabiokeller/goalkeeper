# Judges' questions

**Isn't this just RAG?**
RAG retrieves to answer a question. Here retrieval builds the context for
a worker that ships verified code toward a goal, and the model never sees
history. The memory drives a runtime, it does not answer questions.

**Why not one agent with a one-million-token context?**
Cost per request, degradation as the pile grows, and the process dying with
everything in it. Our context per request is flat all day while the library
grows without bound, and any worker can die.

**Two workers, same file?**
Cannot happen: tasks declare files, the orchestrator never emits
overlapping open tasks, the gate rejects diffs outside scope, merges are
serial with a rebase. A rebase conflict is a redo on fresh main, not a
merge.

**How do you know it did not drift?**
Every task links to a criterion a human approved. The gate checks that
criterion. A drift check every N merges asks which shipped changes serve no
criterion and reverts them. The orchestrator cannot edit the goal; only a
human can, and the version is stamped on every change.

**Isn't this Google's multi-agent pattern (ADK, Agent Engine, Cloud Run)?**
That is many agents per request: a writer, a judge, a router, inside one
request, forgotten when it ends. This is many agents per goal, over hours,
with the memory and the goal outside every agent. Cloud Run would host our
workers fine; it has no primitive for claiming tasks toward a goal.

**Why no judge agent?**
A model judging a model shares its biases. Our judge is the test suite,
the typecheck and the scope check. Deterministic.

**Isn't this Gastown / Composio / a Strands swarm?**
Those are supervision tools with the coordinator's own chat as memory, or
in-process handoffs inside one session. Here no agent keeps state, the
database is the only coordinator, and the goal is enforced at merge time.
The pieces exist separately; the constraints are the product.

**Why raw memory instead of extracted facts?**
On our own benchmark, consolidating sources into summaries lost the exact
values and rejected options that later tasks needed; synthesizing at read
time from raw passages scored higher. Cerebras runs its internal knowledge
base the same way.

**What did you build today, what did you reuse?**
Built: the orchestrator, the task protocol (claim, heartbeat, scope,
serial gate, redo), the memory layer (ingest enrichment, hybrid retrieval,
briefing with grounding), the lens with criteria and the drift check, asks,
the live screen. Reused: the coding agent inside each worker, the target
repo and its tests, git, Atlas, OpenRouter, Vercel, Next.js.

**What happens when a worker dies?**
Its heartbeat stops, the task goes back to open, a new worker claims it and
gets a fresh briefing from the library. We will show it.

**Where does this go after today?**
It is the open runtime half of a larger platform Fabio is building. The
next steps are durable execution underneath (DBOS or Vercel Workflow) and
running the workers on any container host.
