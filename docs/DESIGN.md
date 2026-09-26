# Design

## 1. What a harness is

A model is stateless. It sees one request: system prompt, some history, a
list of tools, the task. It answers with text or with "call tool X with these
arguments". It runs nothing itself.

The harness is the loop around the model: build the request, call the model,
run the tool calls, append results, call again, stop. Every decision that
matters lives in the harness: what goes into the context, which tools are
exposed, how much of a huge output to return, when to compact, whether "done"
is accepted. The conversation is a story the harness tells the model each
turn; nothing forces it to be the full history.

## 2. The problem

Long-running agents degrade. Context accumulates stale tool output,
superseded decisions, repeated attempts; the goal falls out of view; when the
process dies, everything in its context dies with it. Measured across 33,596
agent pull requests: 41.7% of cross-agent pairs conflict textually, 42% of
those conflicts are structural and cannot be resolved mechanically.

Today's agents are the single big server holding all its state in memory.
The web solved this with stateless services and shared state: many small
disposable processes, state in a database, a queue to hand out work, any
process can die. goalkeeper applies that shift to agents.

## 3. Library and lens

**Library (cold).** Raw, append-only, machine-written. Enriched at ingest by
a cheap model (gist, entities, labels, embedding). Retrieval is hybrid
(vector, text, recency) fused with `$rankFusion`; a small model synthesizes a
briefing from the retrieved raw passages with a grounding check. Why raw and
not consolidated: write-time consolidation paraphrases away the exact values,
names and rejected options that matter later; read-time synthesis from raw
passages kept them and scored higher on our own benchmark. Same shape as
Cerebras's internal knowledge base (no consolidation, enrich at ingest,
hybrid retrieval, synthesize with citations).

**Lens (hot).** Small, human-owned, versioned, pinned into every request:
goal, criteria with checks, guidelines, contracts, out of scope. It also
shapes retrieval: query terms derived from the criterion, ranking weights,
exclusions.

**The rule.** Nothing moves from library to lens without a human. The system
may propose (as an ask). Drift is prevented by construction: the swarm
cannot change its own instructions.

**Ledger.** What is done, open, blocked. Machine-maintained, derivable from
the library, kept beside the lens as state, not intent.

## 4. Goal as a first-class citizen

Goal (prose, human) -> criteria (each with a deterministic check) -> tasks
(each linked to one criterion, with declared files) -> gate (the check plus
scope plus tests).

- Nothing enters the queue without a criterion.
- Nothing merges without its check.
- The orchestrator re-reads the lens every turn instead of remembering it.
- Every N merges a drift check asks which shipped changes serve no
  criterion; flagged ones are reverted through the gate.
- Outside input changes the goal only by an explicit, visible edit.
- Done is the metric, never a statement.

Planning is agile: one approval of goal and criteria, then a rolling horizon
(only the next few tasks are concrete), every merge a shipped increment.
Humans decide three things: lens changes, asks, reverts.

## 5. Workers

Stateless, disposable, identical. Per task: claim (atomic update), briefing
(pinned lens and contracts and last failures, plus retrieved passages), a
fresh git worktree from `baseCommit`, a coding agent subprocess with a step
budget and a tool allowlist, the run written raw to the library, exit.
Heartbeat every 15 s; a stale heartbeat requeues the task. Kill-and-resume
and ask-and-resume are the same code path: a new worker, a new briefing.

## 6. Parallel edits

- Worktree per task, minutes old, deleted after the gate.
- Declared file scopes; the orchestrator never emits overlapping open
  tasks; the gate rejects diffs outside scope.
- Foundation files (shared types, registries) are serialized first via
  `dependsOn`, then the fan-out.
- One serial merge gate: rebase on main, checks, merge.
- On rebase conflict: discard, requeue on fresh main with the old diff as a
  hint. Redo is cheaper than merge for agents. Two redos become an ask.
- Optional: mergiraf as a syntax-aware merge driver for add/add conflicts.

## 7. Human in the loop

An ask is a document: question, options, evidence, default, deadline. The
task suspends and the worker exits; nothing else stops. Answered from a
phone. The answer becomes a source, so the same question is never asked
twice and similar ones get the precedent in their briefing. Dedupe by vector
match, batch delivery, defaults with deadlines for reversible things,
irreversible things wait.

## 8. What is deliberately not here

- No LLM judge. The gate is tests, typecheck, scope.
- No consolidation of memory into facts. Raw plus enrichment plus read-time
  synthesis.
- No agent-to-agent messaging. Agents share the database, nothing else.
- No task approval by humans. If a human has to approve tasks, the design
  failed.
- No framework swarm (Strands Swarm, ADK orchestrator, LangGraph supervisor)
  as the coordination layer. Those are in-process handoffs inside one
  session; the coordination here is the database.

## 9. The two counters

Library tokens consumed: rises all day, hundreds of millions.
Context per request: flat, about 15k. That pair is the claim made visible.
