# One orchestrator iteration

A stateless function: read, decide, write, exit. Runs on a trigger, never in
a loop that thinks. One at a time (a lock document in Atlas, claimed with
`findOneAndUpdate`).

## Triggers

- Every merge event (change stream on `merges`).
- `open` and `ready` tasks fewer than the worker count.
- Any `lens` version change.
- Every 60 seconds as a fallback.

## Reads (deterministic, no retrieval)

- `lens`, fresh.
- Progress: merges, failures and open tasks per criterion.
- The busy set: files of all `open` and `claimed` tasks.
- Unhandled crowd requests, asks answered since the last turn.
- The previous turn's own notes (an `orchestrator-turn` source).

## Decides, in two parts

### Deterministic planner (lane 1, a script)

For the migration goal the task list is computable: list source files,
build the import graph, order leaves first, one task per file with
`files: [file]`, `dependsOn` the tasks of its imports,
`check: tsc-strict-file`. Refuse any file in the busy set. Keep about three
times the worker count ready. No model, so it never drifts, and it keeps
running if the model planner is down.

### Model planner (lane 2 and replanning, one call, no tools, no history)

Runs only when there is something to decide: a crowd request to classify, a
criterion that keeps failing, a lens change.

```
LENS (version N): goal, criteria with ids and checks, guidelines, out of scope.
PROGRESS: per criterion: merged, failed, open. Busy files: [...]
NEW INPUT: crowd requests [...], answered asks [...], repeated failures [...]
LAST TURN NOTES: ...
Decide only the next tasks. You cannot change the lens. Output JSON:
{ tasks:  [{criterion, title, files, dependsOn, check, hint?}],
  asks:   [{question, options, default, deadline?, evidence?}],
  parked: [{requestId, reason}],
  notes:  "..." }
```

## Validates before writing (rejected items are dropped and logged)

- `criterion` exists in the current lens version.
- `files` overlap no open or claimed task and are not out of scope.
- `check.kind` is one the gate implements.
- `dependsOn` reference known tasks.
- No task without a criterion. No lens edits, only asks.

## Writes

- Tasks (`status: "open"`, `ready` computed, `lensVersion` stamped).
- Asks.
- Parked reasons on crowd-request sources.
- Its own turn as a source: inputs summary, decisions, notes, tokens.

## Every K-th iteration: the drift check

Separate call: lens plus the last N merges. "Which of these serve no
criterion?" Output a list with reasons. Each becomes a revert task through
the gate and a `drift-check` source.
