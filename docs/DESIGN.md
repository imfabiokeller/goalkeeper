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
gate result, planner turn, error. Built the way
Cerebras built its internal knowledge base, on Atlas:

1. No consolidation. The raw record is the document; nothing is rewritten.
2. Distilled fields at ingest, by a cheap model: gist, entities (keys,
   fields), labels, plus an embedding. Stored next to the raw, never
   instead of it.
3. Two indexes over the raw and the distilled fields: lexical (Atlas
   Search) and vector (Atlas Vector Search).
4. Hybrid retrieval fused with reciprocal rank fusion (`$rankFusion`:
   vector, text, recency), then a reranker (`$rerank`, Voyage, native on
   Atlas) over the top 30, keeping 8.
5. Context expansion: each hit brings its full raw record back into the
   worker's context, not just the matched excerpt, capped per source.
6. Synthesis with citations: a cheap model turns the expanded hits into a
   short briefing where every sentence cites a source id; a grounding
   check drops any sentence whose citations are not in the retrieved set.
   The cited raw excerpts travel with the briefing.
7. Staleness by recency: the recency pipeline and a time decay in the
   fusion weights keep last hour's failures ahead of this morning's.

Why raw and not consolidated: write-time consolidation paraphrases away the
exact values and rejected options that matter later.

**Goal (hot).** Small, human-written, pinned into every request:
statement, criteria each with a deterministic check, guidelines, out of
scope. It also shapes retrieval: the criterion's words become query terms.

**The rule.** Nothing moves from library to goal. The swarm learns into
the library, never into its instructions. Drift is prevented by
construction: no code path writes the goal after seed.

## 4. Goal as a first-class citizen

Statement (prose) -> criteria (each with a check kind and params) -> tasks
(each stamped with the goal version) -> gate (the checks).

- Nothing enters the queue without citing criteria in the current goal.
- Nothing merges without passing their checks.
- Every worker reads the goal fresh instead of remembering it.
- Done is computed from `state`, never stated by a model; solved is
  computed from the hidden score, never seen by a model.

Two kinds of criteria: `all-units` (done when every unit passes) and
`metric` (a measure over the whole state with a direction and a target;
in the schema, not used today).

**Learning from evaluation.** The gate's verdicts are the signal a worker
can see; no model grades itself. A second signal the worker cannot see,
the use case's hidden `score()` (for ARC, the test output), is run by the
planner on merged state and drives the metric on screen. The split keeps
the metric honest: nothing is graded on the answer it is scored against. They flow back into the next
inputs three ways. Pinned: the last gate failures on the same key go into
the worker's context verbatim, so a redo starts from what failed.
Retrieved: gate sources on other keys come back through the library
briefing when they match the criterion's words and the input. Digested:
the lessons digest (`metrics.lessons`), derived counts from the raw record
over the last three hours: first-try pass rate, fails and passes per check
kind, the top failure reasons and block reasons with example keys. The
planner recomputes it on every run from `tasks` and gate sources,
stores it on the metrics singleton and in its turn source, and every
worker and planner call pins its text (under 2000 characters). It is a
summary of counts, never a rule: it does not change the goal, and it is
never a replacement for the raw record it is computed from.

## 5. Workers

Stateless, disposable, identical. Per iteration: claim (atomic update),
context (pinned goal, input, state, last failures, plus retrieved passages,
under 20k tokens), an AI SDK tool loop with a step budget, the gate on its
own proposal, the write, one raw source with the entire run, exit. Heartbeat
every 15 s; a stale heartbeat requeues the task. Kill-and-resume is the same
code path as a first attempt: a new worker, a fresh context.

A worker may call `try_submit(proposal)` any number of times: the gate
runs on the draft and returns its reasons, nothing is recorded. That is
the fastest learning loop, seconds, inside one run. A worker ends a run
with `submit(proposal)` or `block(reason)`. It never asks a human. A
blocked unit is reopened by the planner once the library has grown, with
its block reason as a hint.

## 6. Pure state and the gate

The work product is a JSON proposal for one unit (one key). It may carry
a program as a string (ARC does); the check runs it in a sandbox and the
proposal is still data. The gate is a registry of pure functions, `check(kind, params)(proposal, input, state) ->
{ pass, reasons }`, run by the worker itself. Merge is an upsert on `state`
with a version precondition, so two workers on the same key cannot both
win, and no serial merge process is needed. A lost race is a redo with the
old proposal as a hint.

The goal binds checks to criteria by kind plus params, so most goal
changes are data, not code.

## 7. Human in the loop

One moment: before the run, a human writes the goal. During the run,
nothing waits for a human and nothing accepts input from one.

## 8. What is deliberately not here

- No LLM judge. The gate is checks.
- No asks from workers. Submit or block.
- No consolidation of memory into facts. Raw plus enrichment plus retrieval.
- No agent-to-agent messaging. Agents share the database, nothing else.
- No task approval by humans. Humans write the goal, not the work.
- No goal changes during the run. No proposals, no inbox.
- No separate orchestrator, gate or ingest process. They are functions in
  the worker; one image, N copies.
- No framework swarm as the coordination layer. The coordination is the
  database.

## 9. The two counters and the curve

Library tokens consumed: rises all day. Context per request: flat, under
20k. That pair is the claim made visible. The curve, solve rate on the
hidden metric over time with the same model, is the memory proving it
works.
