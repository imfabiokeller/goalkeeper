# The planner

A stateless function inside the worker. Runs when a worker finds nothing
to claim and wins the planner lock (`locks/planner`, 30 s TTL). Reads,
decides, writes, exits. Holds nothing between runs.

## Steps, in order

1. **Reaper.** `claimed` tasks with `heartbeat < now - 30 s` go back to
   `open`, `attempt + 1`.
2. **Emit.** For every `inputs` doc with `scheduled: true`, no `state` at
   `goal.version`, and no task in `open`, `claimed` or `blocked`: insert
   one task with all criteria, `version: goal.version`,
   `createdBy: "planner"`. Stop when open tasks reach three times
   `WORKERS_TARGET`. Pure query, no model, cannot drift.
3. **Crowd.** For each `crowd-request` source with `handled: false`, one
   model call (AI SDK `generateText` with `Output.object`, no tools, no
   history) with the goal, the request, the list of unscheduled input
   keys, and the current state keys. Output, validated with Zod:

   ```
   { outcome: "task",     key: "<unscheduled input key>" }
   { outcome: "recheck",  key: "<state key>", reason: "..." }
   { outcome: "proposal", guideline: "..." }
   { outcome: "parked",   reason: "..." }
   ```

   task: set `scheduled: true` on the input, insert a priority task.
   recheck: insert a priority task for the key with `hint` = the doubt;
   old state stays until the new one merges. proposal: insert a question.
   parked: write the reason on the source. Every path sets
   `handled: true` in the same `findOneAndUpdate` that claimed the source,
   so two planners never double-handle. An invalid output is logged as an
   `error` source and the request is parked with "could not classify".
4. **Propose.** If three or more `blocked` tasks share a similar
   `blockReason` (cheap: same first 40 characters after normalizing, or
   the model groups them in one call) and no `open` question cites any of
   them: one model call produces a guideline text. Insert a question
   `{ kind: "approval", proposedDiff: { op: "add-guideline", text }, evidence: [taskIds] }`.
5. **Metrics.** One aggregation over `sources` and `tasks` bucketed with
   `$dateTrunc` per minute, plus the lessons digest (`computeLessons`:
   pass rate, fails per check kind, top gate reasons and block reasons
   with example keys, recent guidelines and how many tasks they reopened,
   over the last three hours, rendered to at most 2000 characters); write
   the `metrics` singleton. The crowd and propose steps above put the
   previous run's digest in their prompts; workers pin it into every
   context. See docs/DATABASE.md, `metrics.lessons`.
6. **Backfill.** Up to 20 `sources` with `enrichment: null`: enrich and
   embed.
7. **Turn.** Write a `planner-turn` source: counts read, tasks emitted,
   crowd outcomes, proposals, tokens, and the lessons digest text from
   step 5, so the digest of every run is in the library and retrievable.

## applyDiff

Called by the screen when a human approves a question. Not part of
`plan()` but owned by the same module.

```
applyDiff(questionId, by):
  question = findOneAndUpdate({ _id, status: "open" }, { status: "approved", answeredBy, answeredAt })
  if none: return (already handled)
  goal = findOneAndUpdate({ _id: "goal", version: v }, { $push guidelines, $inc version, $push history })
  if none: retry once with a fresh read
  updateMany tasks { status: "blocked", version: { $lt: goal.version } } -> { status: "open", attempt: 1, blockReason: null, version: goal.version }
  write an "answer" source
```

## Validation before any write

- A crowd `task` outcome must name an existing, unscheduled input key.
- A `recheck` must name an existing state key.
- A proposal text must be non-empty and not equal to an existing guideline.
- Rejected outputs are dropped and logged as `error` sources. The planner
  never writes a partial result.

## What the planner cannot do

Edit the goal. Emit a task for a key that is busy. Merge anything. Talk to
a worker. Remember the previous run except through the `planner-turn`
sources it can read.
