# The planner

A stateless function inside the worker. Runs when a worker finds nothing
to claim and wins the planner lock (`locks/planner`, 30 s TTL). Reads,
decides, writes, exits. Holds nothing between runs. No model calls: every
step is a query.

## Steps, in order

1. **Reaper.** `claimed` tasks with `heartbeat < now - 30 s` go back to
   `open`, `attempt + 1`.
2. **Emit.** For every `inputs` doc with `scheduled: true`, no `state`
   document, and no task in `open`, `claimed` or `blocked`: insert one
   task with all criteria, `version: goal.version`, `createdBy:
   "planner"`. Stop when open tasks reach three times `WORKERS_TARGET`.
   The insert is an upsert keyed on "no busy task for this key", so two
   planners never queue a key twice.
3. **Score.** For every `state` with `score` null or missing: run the use
   case's `score(proposal, input)` (reads `usecase/answers/`; nothing else
   in the system may), write `score` and `scoredAt` in one
   `findOneAndUpdate` with the unscored state as the precondition. On `0`,
   if the key has never had a "too specific" task, insert a priority task
   with the hint "passed the examples, wrong on the test: the rule is too
   specific". Never the answer. Cap 50 per run.
4. **Reopen.** When the merged count crosses a multiple of 20, `blocked`
   tasks older than that 20th merge go back to `open`, `attempt: 1`, the
   block reason kept as `hint`. The library grew; the puzzle may be
   solvable now.
5. **Metrics.** One aggregation over `sources` and `tasks` per minute,
   the solve-rate curve per 15-minute bucket from `state.score`, and the
   lessons digest (`computeLessons`: first-try pass rate, fails per check
   kind, top gate reasons and block reasons with example keys, over the
   last three hours, at most 2000 characters). Write the `metrics`
   singleton. Workers pin `lessons.text` into every context.
6. **Backfill.** Up to 20 `sources` with `enrichment: null`: enrich and
   embed.
7. **Turn.** Write a `planner-turn` source: counts read, tasks emitted,
   states scored, tasks reopened, and the lessons digest text.

## What the planner cannot do

Edit the goal. Emit a task for a key that is busy. Merge anything. Talk
to a worker. Show a worker a test answer. Remember the previous run
except through the `planner-turn` sources it can read.
