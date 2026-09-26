# Database design (Atlas)

One database, six collections plus two singleton documents. The database
is the coordinator: no process holds state, every process reads and writes
here. `src/shared/types.ts` holds the Zod schema for every document below
and is the source of truth; this file explains them.

Every document that a goal version matters for carries `version`.

## goal (one document, human-approved)

```js
{
  _id: "goal",
  version: 2,
  statement: "<two sentences, human-written>",
  criteria: [
    { id: "c1", kind: "all-units", text: "<what the check verifies>", check: { kind: "<kind in usecase/checks.ts>", params: {} } },
    { id: "c2", kind: "all-units", text: "...", check: { kind: "...", params: {} } }
  ],
  guidelines: ["<taste line>", "...", "<guideline added by an approved proposal>"],
  outOfScope: ["<what gets parked>", "..."],
  proposalShape: "<the exact JSON a proposal must have, pinned into every worker context>",
  history: [
    { version: 1, at: ISODate, by: "seed", diff: null },
    { version: 2, at: ISODate, by: "fabio", diff: { op: "add-guideline", text: "<guideline>" }, questionId: ObjectId }
  ]
}
```

Written by `seed` (version 1, from `usecase/lens.json`) and by
`applyDiff()` after a human approves a question. Nothing else writes it. Criteria of kind `metric` (a measure
over the whole state with a direction and a target) are in the schema for
later; today every criterion is `all-units`.

## inputs (one per unit of work)

```js
{ _id: "<key>", key: "<key>", name: "<display name>",
  meta: { ... },                     // extra fields from inputs.json, passed to the checks as-is
  source: "https://...",             // where the input came from, optional
  text: "...", chars: 30667, scheduled: true, scheduledBy: "seed" | "crowd:<sourceId>", createdAt }
```

`scheduled: false` units are loaded but not emitted until the crowd asks
for them. That is what makes "add unit X" real work.

## tasks (the queue and its history)

```js
{
  _id: ObjectId,
  key: "<key>",
  criteria: ["c1", "c2"],
  version: 2,                       // goal version the task runs under
  status: "open" | "claimed" | "merged" | "blocked" | "parked",
  priority: 0 | 1,                  // 1 for crowd tasks
  attempt: 1,
  worker: null | "w-07",
  heartbeat: null | ISODate,
  proposal: null | { ... },         // set by the worker before gate
  gate: null | { pass: false, reasons: ["..."] },
  blockReason: null | "...",
  hint: null | "...",               // previous proposal on redo after a version race
  createdBy: "planner" | "crowd:<sourceId>",
  createdAt, updatedAt
}
```

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
with `heartbeat < now - 30 s` goes back to `open`, `attempt + 1`. That is
kill-and-resume. No other code.

## state (one per merged key)

```js
{ _id: "<key>", key: "<key>", version: 2, stateVersion: 3,
  data: { ...the proposal as submitted... },
  taskId: ObjectId, mergedAt }
```

Upsert with a precondition on `stateVersion` (or on absence). A lost race
puts the task back to `open` with the proposal as `hint`. A `state` doc at
an older `version` than the goal does not count as done, so the planner
re-emits the key; that is the whole drift correction.

## sources (the library: raw, append-only)

```js
{
  _id: ObjectId,
  kind: "worker-run" | "gate" | "planner-turn" | "crowd-request" | "answer" | "error",
  taskId: ObjectId | null, key: "<key>" | null, version: 2,
  raw: { messages: [...], steps: [...], proposal: {...}, gate: {...}, ... },   // never edited
  text: "...",                       // flattened raw for the text index
  enrichment: null | { gist: "...", entities: { keys: [...], fields: [...] }, labels: [...], embedding: [...] },
  tokens: { in: 12400, out: 800, cost: 0.012 },
  handled: true | false,             // crowd-request only
  createdAt
}
```

Indexes: Atlas Vector Search `vec` on `enrichment.embedding`; Atlas Search
`txt` on `text` and `enrichment.gist`; `{ key: 1, kind: 1, createdAt: -1 }`
for pinned failures; `{ kind: 1, handled: 1 }` for the crowd queue.

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

## questions (proposed goal changes)

```js
{ _id, kind: "approval", question: "12 tasks are blocked for the same reason: <reason>. Adopt this guideline?",
  proposedDiff: { op: "add-guideline", text: "<guideline>" },
  evidence: [taskId, ...], status: "open" | "approved" | "rejected",
  answeredBy: null | "fabio", answeredAt: null | ISODate, createdAt }
```

Created by `plan()`. Resolved by a human on `/inbox`. Approve calls
`applyDiff()`.

## Singletons

- `locks`: `{ _id: "planner", holder: "w-07", until: ISODate }`. Acquired
  with `findOneAndUpdate({ _id: "planner", until: { $lt: now } })`.
- `metrics`: `{ _id: "metrics", at, perMinute: [{ minute, merged, failed, blocked, firstTryPass, tokens, contextAvg }], totals: {...}, versions: [{ version, at }], lessons }`.
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
    recentGuidelines: [{ version: 2, text: "<guideline>", resolved: 5 }], // last 3 approved diffs, tasks each reopened
    text: "Lessons from the record so far ..."                           // rendered digest, at most 2000 characters
  }
  ```

  Reasons are grouped the way `propose` groups block reasons (lowercase,
  alphanumeric, first 40 characters). Workers read `lessons.text` with one
  projected `findOne` and pin it into the context; `classify` and `propose`
  put it in their prompts; the `planner-turn` source carries it in `raw`
  and `text` so it is in the library. Nothing here is a rule: the goal is
  the rule, and the raw record is the truth these counts come from.

## Live screen

`db.watch()` over `tasks`, `state`, `sources`, `questions`, `goal` via a
change stream, one server route streaming events. The screen writes only
two things: a `crowd-request` source from `/request` and an approval from
`/inbox`.

## Operations, end to end

1. `seed` writes `goal` version 1 and `inputs`.
2. An idle worker takes the planner lock, `plan()` emits tasks for
   scheduled inputs with no state at version 1.
3. A worker claims, assembles context, runs the AI SDK loop, gates its own
   proposal, writes state or reopens or blocks, writes one `worker-run`
   source with enrichment, exits the iteration.
4. A crowd request lands as a `crowd-request` source; the next `plan()`
   classifies it: task, recheck, proposal, or parked with a reason.
5. Blocked tasks pile up; `plan()` proposes a guideline as a question.
6. A human approves on `/inbox`; `applyDiff()` bumps the goal to version
   2 and reopens the blocked tasks; the next claims run under version 2.
