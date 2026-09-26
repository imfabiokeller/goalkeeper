# Database design (Atlas)

One database, five collections plus two singleton documents. The database
is the coordinator: no process holds state, every process reads and writes
here. `src/shared/types.ts` holds the Zod schema for every document below
and is the source of truth; this file explains them.

Every document that a goal version matters for carries `version`.

## goal (one document, human-written, never changed during the run)

```js
{
  _id: "goal",
  version: 2,
  statement: "<two sentences, human-written>",
  criteria: [
    { id: "c1", kind: "all-units", text: "<what the check verifies>", check: { kind: "<kind in usecase/checks.ts>", params: {} } },
    { id: "c2", kind: "all-units", text: "...", check: { kind: "...", params: {} } }
  ],
  guidelines: ["<taste line>", "..."],
  outOfScope: ["<what gets parked>", "..."],
  proposalShape: "<the exact JSON a proposal must have, pinned into every worker context>",
  history: [ { version: 1, at: ISODate, by: "seed", diff: null } ]
}
```

Written by `seed` (version 1, from `usecase/lens.json`). Nothing else
writes it. The version and history fields exist so a future run can
change the goal through an approved diff; today there is no code path
that does. Criteria of kind `metric` are in the schema for later; today
every criterion is `all-units`.

## inputs (one per unit of work)

```js
{ _id: "<key>", key: "<key>", name: "<display name>",
  meta: { ... },                     // extra fields from inputs.json, passed to the checks as-is
  source: "https://...",             // where the input came from, optional
  text: "...", chars: 30667, scheduled: true, scheduledBy: "seed", createdAt }
```

`scheduled` is true for every unit today (all 400 puzzles at seed); the
flag stays so a later run can hold units back.

## tasks (the queue and its history)

```js
{
  _id: ObjectId,
  key: "<key>",
  criteria: ["c1", "c2"],
  version: 2,                       // goal version the task runs under
  status: "open" | "claimed" | "merged" | "blocked" | "parked",
  priority: 0 | 1,                  // 1 for "too specific" redo tasks
  attempt: 1,
  worker: null | "w-07",
  heartbeat: null | ISODate,
  proposal: null | { ... },         // set by the worker before gate
  gate: null | { pass: false, reasons: ["..."] },
  blockReason: null | "...",
  hint: null | "...",               // planner hint: too specific, reopened, or a race redo
  createdBy: "planner",
  createdAt, updatedAt,
  step: 0,                          // tool steps finished in the current attempt; the claim resets it to 0
  progress: [                       // last 25 lines, oldest first; the claim resets it to []
    { at: ISODate, step: 1, tool: "read_input" },
    { at: ISODate, step: 2, tool: "try_submit", ok: false, reasons: ["pair 1: ..."], rule: "..." },
    { at: ISODate, step: 2, tool: "reaper" }   // the worker died here, requeued
  ],
  lastWorker: null | "w-07",        // set by the reaper on a requeue, left as is by the next claim
  diedAt: null | ISODate            // when the reaper requeued; the screen holds the dead row 30 s from here
}
```

`step` and `progress` are live: the worker writes both after every tool
step (one `updateOne` with the heartbeat precondition, `$push` with
`$slice: -25`), and the same write is an extra heartbeat. A `try_submit`
or `submit` line carries the gate verdict (`ok`), the first three reasons
clipped to 160 chars, and the draft's `rule` sentence; never the program
or the proposal. The previous attempt's progress is history until the next
claim wipes it. `lastWorker` and `diedAt` are the dead worker memory: the
reaper sets both and appends a `reaper` line; the claim keeps them.

Indexes: `{ status: 1, priority: -1, createdAt: 1 }` for the claim;
`{ worker: 1, heartbeat: 1 }` for the reaper; `{ key: 1, status: 1 }` so
the planner never emits a duplicate for a busy key.

The claim, the whole distributed lock:

```js
db.tasks.findOneAndUpdate(
  { status: "open" },
  { $set: { status: "claimed", worker: id, heartbeat: new Date(), updatedAt: new Date() } },
  { sort: { priority: -1, createdAt: 1 }, returnDocument: "after" }
)
```

Heartbeat: `$set: { heartbeat: new Date() }` every 15 s. Reaper: claimed
with `heartbeat < now - 30 s` goes back to `open`, `attempt + 1`, with
`lastWorker`, `diedAt` and the `reaper` progress line set in the same
pipeline update. That is kill-and-resume. No other code.

## state (one per merged key)

```js
{ _id: "<key>", key: "<key>", version: 2, stateVersion: 3,
  data: { ...the proposal as submitted... },
  score: null | 0 | 1,               // the use case's hidden metric, written by the planner, never by a worker
  scoredAt: null | ISODate,
  taskId: ObjectId, mergedAt }
```

Upsert with a precondition on `stateVersion` (or on absence). A lost race
puts the task back to `open` with the proposal as `hint`. `score` is set
by the planner's score step from `usecase/answers/`; a `0` reopens the
key once with a hint, and the solve rate on screen is `score: 1` over
keys attempted. Merged state is final for the run; a criteria change
means re-seeding.

## sources (the library: raw, append-only)

```js
{
  _id: ObjectId,
  kind: "worker-run" | "gate" | "planner-turn" | "error",
  taskId: ObjectId | null, key: "<key>" | null, version: 2,
  raw: { messages: [...], steps: [...], proposal: {...}, gate: {...}, ... },   // never edited
  text: "...",                       // flattened raw for the text index
  enrichment: null | { gist: "...", entities: { keys: [...], fields: [...] }, labels: [...], embedding: [...] },
  tokens: { in: 12400, out: 800, cost: 0.012 },
  createdAt
}
```

Indexes: Atlas Vector Search `vec` on `enrichment.embedding`; Atlas Search
`txt` on `text` and `enrichment.gist`; `{ key: 1, kind: 1, createdAt: -1 }`
for pinned failures.

Retrieval for a briefing (the Cerebras knowledge-base shape, see
DESIGN.md section 3), one aggregation:

```js
db.sources.aggregate([
  { $rankFusion: {
      input: { pipelines: {
        vector: [ { $vectorSearch: { index: "vec", path: "enrichment.embedding", queryVector: q, numCandidates: 200, limit: 30 } } ],
        text:   [ { $search: { index: "txt", text: { query: queryText, path: ["text", "enrichment.gist"] } } }, { $limit: 30 } ],
        recent: [ { $match: { kind: { $in: ["gate", "worker-run"] } } }, { $sort: { createdAt: -1 } }, { $limit: 30 } ]
      } },
      combination: { weights: { vector: 1, text: 1, recent: 0.5 } }
  } },
  { $limit: 30 },
  { $rerank: { model: "voyage-rerank-2.5", query: queryText, path: ["enrichment.gist", "text"], limit: 8 } }
])
```

`$rerank` is an Atlas preview feature; if it is unavailable the pipeline
runs without it and keeps the top 8 from the fusion. Then context
expansion (the full `raw` of each hit, capped at 1500 characters per
source), then synthesis: one cheap model call writes a briefing where every
sentence cites `[sourceId]`; sentences citing ids outside the retrieved
set are dropped (grounding check). The briefing and the cited excerpts go
into the worker's context.

Pinned, not retrieved: goal; input text; state for the key; last three
`gate` sources with a failure on the key.

## Singletons

- `controls`: `{ _id: "kill", remaining: 5, at }`. The demo kill switch,
  set by the screen. Each worker's heartbeat takes one kill atomically
  (`findOneAndUpdate` with `remaining > 0`, `$inc -1`) and SIGKILLs
  itself mid-task; Docker restarts the container and the reaper requeues
  the task. Five kills stop exactly five workers.

- `locks`: `{ _id: "planner", holder: "w-07", until: ISODate }`. Acquired
  with `findOneAndUpdate({ _id: "planner", until: { $lt: now } })`.
- `metrics`: `{ _id: "metrics", at, perMinute: [{ minute, merged, failed, blocked, firstTryPass, tokens, contextAvg }], solveRate: [{ bucket, attempted, merged, solved }], totals: { ..., solved, attempted, stepsMedian }, versions: [{ version, at }], lessons }`.
  `solveRate` is one entry per 15-minute bucket, from `state.score`; it is
  the curve on the stage view.
  Refreshed by `plan()`. The screen reads this instead of scanning sources.

  `metrics.lessons` is the lessons digest, derived counts from the raw
  record over the last three hours (DESIGN.md section 4, "Learning from
  evaluation"):

  ```js
  lessons: {
    at, window: { tasks, since },
    firstTryPass: 0.64 | null,                                          // merged at attempt 1 over merged, in the window
    checks: [{ kind: "grounded", criterion: "c1", fails: 9, passes: 31 }], // per check kind, worst first
    reasons: [{ text: "<first reason of the group>", count: 7, keys: ["<up to 3 example keys>"] }], // top 12 gate reasons
    blocked: [{ text, count, keys }],                                    // top 8 block reasons, same grouping
    text: "Lessons from the record so far ..."                           // rendered digest, at most 2000 characters
  }
  ```

  Reasons are grouped the way `propose` groups block reasons (lowercase,
  alphanumeric, first 40 characters). Workers read `lessons.text` with one
  projected `findOne` and pin it into the context; `classify` and `propose`
  the `planner-turn` source carries it in `raw`
  and `text` so it is in the library. Nothing here is a rule: the goal is
  the rule, and the raw record is the truth these counts come from.

## Live screen

The screen polls `tasks`, `state`, `sources` and `metrics` (Vercel
functions cannot hold change streams open). The screen writes nothing.

## Operations, end to end

1. `seed` writes `goal` version 1 and `inputs`.
2. An idle worker takes the planner lock, `plan()` emits tasks for
   scheduled inputs with no state at version 1.
3. A worker claims, assembles context, runs the AI SDK loop (with
   `try_submit` for dry runs of the gate), gates its own proposal, writes
   state or reopens or blocks (after `MAX_ATTEMPTS`), writes one
   `worker-run` source with enrichment, exits the iteration.
3a. The next `plan()` scores the new state with `usecase/answers/` and
   writes `state.score`; a `0` reopens the key once.
4. Blocked tasks pile up; every 20 merges `plan()` reopens the older
   ones with their block reason as a hint.
