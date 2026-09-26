# Database design (Atlas)

One database, five collections. The database is the coordinator: no agent
holds state, every agent reads and writes here.

## lens (one document, human-owned)

```js
{
  _id: "lens",
  version: 7,                       // bumps on every human edit
  goal: "Migrate ... to strict TypeScript ...",
  criteria: [
    { id: "c1", text: "...", check: { kind: "tsc-strict-file" } },
    { id: "c2", text: "...", check: { kind: "suite" } },
    { id: "c3", text: "...", check: { kind: "new-test" } }
  ],
  guidelines: ["smallest diff ...", "never edit a test to make it pass", ...],
  outOfScope: ["build tooling", "CI", "public API changes"],
  contracts: { "src/foo.ts": "exports parse(input: string): Ast", ... },
  history: [ { version: 6, at: ISODate, by: "fabio", diff: "..." } ]
}
```

Rules: written only by a human (or by an approved ask). Every orchestrator
turn and every briefing reads it fresh. Its `version` is stamped on every
task and source, so you can show which lens a change was made under.

## tasks (the queue and its history)

```js
{
  _id: ObjectId,
  criterion: "c1",
  title: "Make src/parser/tokens.ts strict-clean",
  files: ["src/parser/tokens.ts"],       // declared scope, enforced by gate
  dependsOn: [ObjectId, ...],
  check: { kind: "tsc-strict-file", file: "src/parser/tokens.ts" },
  status: "open" | "claimed" | "gated" | "merged" | "failed" | "asked" | "parked",
  attempt: 1,
  worker: null | "w-07",
  heartbeat: null | ISODate,
  baseCommit: "abc123",
  lensVersion: 7,
  hint: null | "previous attempt diff ...",  // set on redo after conflict
  createdBy: "orchestrator" | "crowd:<id>",
  createdAt, updatedAt
}
```

Indexes: `{status: 1, createdAt: 1}` for claiming; `{worker: 1, heartbeat: 1}`
for the reaper; `{files: 1, status: 1}` so the orchestrator can refuse
overlapping open tasks.

Claim (atomic, this is the whole distributed lock):

```js
db.tasks.findOneAndUpdate(
  { status: "open", $expr: { /* all dependsOn merged, computed by orchestrator into a `ready: true` flag */ }, ready: true },
  { $set: { status: "claimed", worker: id, heartbeat: new Date(), updatedAt: new Date() } },
  { sort: { createdAt: 1 }, returnDocument: "after" }
)
```

Heartbeat: the worker sets `heartbeat` every 15 s. Reaper (a loop in the
orchestrator process): `claimed` with `heartbeat < now - 60s` goes back to
`open`, `attempt + 1`. That is kill-and-resume; no other code needed.

## sources (the library: raw, append-only)

```js
{
  _id: ObjectId,
  kind: "worker-run" | "gate" | "orchestrator-turn" | "ask-answer" | "crowd-request" | "merge" | "drift-check",
  taskId: ObjectId | null,
  lensVersion: 7,
  raw: {                              // never edited, read as-is
    prompt: "...", diff: "...", testOutput: "...", report: "...", ...
  },
  text: "...",                        // flattened raw for the text index
  enrichment: {                       // added by the ingest step, cheap model
    gist: "one line",
    entities: { files: [...], symbols: [...], libs: [...] },
    labels: ["decision" | "failure" | "interface-change" | "workaround" | ...],
    embedding: [ ... ]
  },
  tokens: { in: 12400, out: 800, cacheRead: 9000 },   // for the counter
  createdAt
}
```

Indexes: Atlas Vector Search on `enrichment.embedding`; Atlas Search (text)
on `text`, `enrichment.gist`, `enrichment.entities.*`; regular index on
`{ "enrichment.entities.files": 1, createdAt: -1 }` for "last failures on
these files"; `{createdAt: -1}`.

Retrieval for a briefing (one aggregation):

```js
db.sources.aggregate([
  { $rankFusion: {
      input: { pipelines: {
        vector: [ { $vectorSearch: { index: "vec", path: "enrichment.embedding", queryVector: q, numCandidates: 200, limit: 30 } } ],
        text:   [ { $search: { index: "txt", text: { query: queryText, path: ["text", "enrichment.gist"] } } }, { $limit: 30 } ],
        recent: [ { $match: { "enrichment.entities.files": { $in: task.files } } }, { $sort: { createdAt: -1 } }, { $limit: 30 } ]
      } },
      combination: { weights: { vector: 1, text: 1, recent: 0.7 } }
  } },
  { $limit: 12 }
])
```

Pinned (deterministic, not retrieved): lens; `contracts` for `task.files`;
last 3 sources with `kind: "gate"` and a failure on those files; open asks
touching those files.

## asks (human in the loop)

```js
{
  _id, taskId, question: "...", options: ["a", "b"], evidence: [sourceId, ...],
  default: "a", deadline: ISODate | null,   // null = irreversible, waits
  status: "open" | "answered" | "expired", answer: null | "...", answeredBy, createdAt
}
```

Dedupe on create: vector match against open asks above a threshold attaches
to the existing one. An answer is also written to `sources` as
`kind: "ask-answer"`.

## merges (the ledger)

```js
{
  _id, taskId, criterion: "c1", commit: "def456", files: [...],
  gate: { tsc: true, suite: true, scope: true, newTest: null },
  lensVersion: 7, reverted: false, revertReason: null, createdAt
}
```

The orchestrator's view of progress is counts on this collection per
criterion. The drift check reads the last N merges plus the lens and may set
`reverted: true` with a reason.

## Live screen

`db.watch()` over `tasks`, `sources`, `merges`, `asks` via a change stream
(one server route streaming events). The screen shows: lens summary, queue
by status, workers with last heartbeat, gate results, ledger count per
criterion, and two counters: sum of `sources.tokens` (rising) and the size
of the last 20 briefings (flat).

## Operations, end to end

1. Human writes `lens` (version 1).
2. Orchestrator turn: reads lens, counts merges per criterion, lists open
   tasks and their files; emits new tasks, refusing any whose files overlap
   an open task; marks `ready` on tasks whose `dependsOn` are all merged.
3. Worker: claim, build briefing (pinned plus retrieval), run `claude -p`
   in a worktree from `baseCommit`, write the run to `sources`, set
   `status: "gated"`.
4. Gate (serial): rebase on main; conflict means `status: "open"` with
   `hint` set and `attempt + 1` (redo, not merge); else run checks; pass
   means merge, write `merges` and a `gate` source; fail means `failed`
   with the output as a source, and back to `open` once, then `asked`.
5. Reaper: stale heartbeats back to `open`.
6. Ingest: every new `sources` doc without `enrichment` gets it (change
   stream trigger, one cheap model call plus one embedding call).
7. Drift check every N merges: writes a `drift-check` source and may mark
   merges reverted (a revert commit through the gate).
8. Crowd request: written as a `crowd-request` source; classifier writes a
   task under an existing criterion, or an ask proposing a new criterion,
   or nothing plus a `parked` reason on the source.
