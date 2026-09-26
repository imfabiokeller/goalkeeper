# Design

## 1. What a harness is

A model is stateless. It sees one request: system prompt, some history, a
list of tools, the task. It answers with text or with "call tool X with these
arguments". It runs nothing itself.

The harness is the loop around the model: build the request, call the model,
run the tool calls, append results, call again, stop. Every decision that
matters lives in the harness: what goes into the context, which tools are
exposed, when to stop, whether "done" is accepted. The conversation is a
story the harness tells the model each turn; nothing forces it to be the
full history.

## 2. The problem

Long-running agents degrade. Context accumulates stale tool output,
superseded decisions, repeated attempts; the goal falls out of view; when the
process dies, everything in its context dies with it. And they drift,
because the thing doing the work is also the thing remembering why.

Today's agents are the single big server holding all its state in memory.
The web solved this with stateless services and shared state: many small
disposable processes, state in a database, a queue to hand out work, any
process can die. goalkeeper applies that shift to agents.

## 3. Library and goal

**Library (cold).** Raw, append-only, machine-written. Every worker run,
gate result, planner turn, crowd request, human answer. Enriched at ingest
by a cheap model (gist, entities, labels, embedding). Retrieval is hybrid
(vector, text, recency) fused with `$rankFusion`; the retrieved raw passages
go into the worker's context as they are. Why raw and not consolidated:
write-time consolidation paraphrases away the exact values and rejected
options that matter later. Same shape as Cerebras's internal knowledge base.

**Goal (hot).** Small, human-approved, versioned, pinned into every
request: statement, criteria each with a deterministic check, guidelines,
out of scope. It also shapes retrieval: the criterion's words become query
terms.

**The rule.** Nothing moves from library to goal without a human. The
planner may propose a diff; a human approves it. Drift is prevented by
construction: the swarm cannot change its own instructions.

## 4. Goal as a first-class citizen

Statement (prose) -> criteria (each with a check kind and params) -> tasks
(each stamped with the goal version) -> gate (the checks).

- Nothing enters the queue without citing criteria in the current goal.
- Nothing merges without passing their checks.
- Every worker reads the goal fresh instead of remembering it.
- State merged under an older goal version no longer counts as done, so it
  is redone under the new one. That is the drift correction, a query.
- Done is computed from `state`, never stated by a model.

Two kinds of criteria: `all-units` (done when every unit passes) and
`metric` (a measure over the whole state with a direction and a target;
in the schema, not used today).

## 5. Workers

Stateless, disposable, identical. Per iteration: claim (atomic update),
context (pinned goal, input, state, last failures, plus retrieved passages,
under 20k tokens), an AI SDK tool loop with a step budget, the gate on its
own proposal, the write, one raw source with the entire run, exit. Heartbeat
every 15 s; a stale heartbeat requeues the task. Kill-and-resume is the same
code path as a first attempt: a new worker, a fresh context.

A worker ends a run with `submit(proposal)` or `block(reason)`. It never
asks a human. Blocked reasons pile up and become the planner's evidence for
a proposed guideline.

## 6. Pure state and the gate

The work product is a JSON proposal for one unit (one key). The gate is a
registry of pure functions, `check(kind, params)(proposal, input, state) ->
{ pass, reasons }`, run by the worker itself. Merge is an upsert on `state`
with a version precondition, so two workers on the same key cannot both
win, and no serial merge process is needed. A lost race is a redo with the
old proposal as a hint.

The goal binds checks to criteria by kind plus params, so most goal
changes are data, not code.

## 7. Human in the loop

Two actions, both on the screen: approve or reject a proposed goal diff,
and submit a crowd request. The planner proposes a diff when several tasks
block for the same reason. Approval bumps the goal version and reopens the
blocked tasks. Nothing on stage waits for a human; a pending proposal just
sits in the inbox while everything else runs.

## 8. What is deliberately not here

- No LLM judge. The gate is checks.
- No asks from workers. Submit or block.
- No consolidation of memory into facts. Raw plus enrichment plus retrieval.
- No agent-to-agent messaging. Agents share the database, nothing else.
- No task approval by humans. Humans review the goal, not the work.
- No separate orchestrator, gate or ingest process. They are functions in
  the worker; one image, N copies.
- No framework swarm as the coordination layer. The coordination is the
  database.

## 9. The two counters

Library tokens consumed: rises all day. Context per request: flat, under
20k. That pair is the claim made visible. The third line, first-attempt
pass rate over time, is the memory proving it works.
