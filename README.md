# goalkeeper

Twenty agents. None of them remembers anything. All of them get smarter.

goalkeeper is a runtime for long-running agent work where no agent keeps
state, no agent can change the goal, and any worker can die. Built in one
day at the MongoDB Harness Engineering & Model Wrangling Hackathon, New
York, September 26, 2026, for problem statement two: long-horizon
engineering.

Live screen: https://goalkeeper-gamma.vercel.app

The architecture as one picture: open
[docs/architecture.html](docs/architecture.html) in a browser.

## The idea in ninety seconds

Every long-running agent gets worse the longer it runs. Its context fills
with stale tool output and old attempts, the goal sinks to the bottom, and
when the process dies everything it learned dies with it. Add more agents
and you get more piles.

Ants solved this a while ago. An ant remembers nothing and talks to
nobody. It reads the trail, does one thing, leaves a mark, and the colony
gets smarter while every ant stays dumb.

goalkeeper is that, on MongoDB Atlas:

- **The library** is the trail. Raw, append-only, machine-written. Every
  worker run, every gate verdict, every failure, never rewritten. It grows
  all day and nobody ever reads it whole.
- **The goal** is the nest. Small, written once by a human, then locked.
  Nothing moves from the library into the goal. The swarm can learn
  anything; it cannot change its instructions.
- **A worker** is an ant. It claims a task, reads a slice of the library
  built for that task (about 4k tokens, however big the library is), runs
  a cheap open-weight model with a few tools, passes a deterministic gate,
  writes its raw run back, and exits. It holds nothing, so any worker can
  die.

So the more the system has done, the better its next step. Session
length stops being a cost.

## What happened today

400 ARC-AGI-1 evaluation puzzles. DeepSeek V4 Flash with thinking off,
because with thinking on it already scores around 90% and there would be
nothing to show. Six worker containers on one VPS.

| | |
|---|---|
| Same model, one shot, no harness (our control, 40 puzzles) | 10% solved, 12.5% with two attempts |
| With the harness, of the puzzles it finished | 82% solved on the hidden test |
| Solves that needed a second or later attempt | about a third |
| Context each worker read | about 4k tokens, flat all day |
| Library at 16:20 | 14.8M tokens, 331 records |
| Cost of the whole run | under a dollar |

Every point on that line passed a check a human wrote. No model judged a
model. The hidden test answers were read by one function, `score()`, in
the planner, and by nothing else.

## Run it yourself

You need Node 24, an Atlas cluster, an OpenRouter key and a Voyage key.
Ten minutes, mostly waiting for the seed.

```bash
cp .env.example .env
```

Fill in the keys. Then:

```bash
npm install
```

```bash
npm run indexes
```

Creates the collections, the plain indexes, and the Atlas Search and
Vector Search indexes. Once per database.

```bash
npm run seed -- --db live
```

Loads the goal (version 1, from `usecase/lens.json`) and all 400 puzzles,
and schedules them. Idempotent, run it twice and nothing changes.

```bash
npm run worker
```

One worker. Watch it claim a puzzle, pull precedents, write a program, hit
`try_submit` a few times, and hand it in. Ctrl-C finishes the current
iteration and exits. Want a swarm? Open more terminals and run it again.
That is the whole scaling story.

```bash
npm run status
```

One screen for the operator: tasks by status, solved versus wrong on the
hidden test, which workers are alive, library size, cost, the last gate
failures.

```bash
npm run baseline -- --n 40 --attempts 2
```

The control: the same model, one `generateText` call per puzzle, no tools,
no library, gated and scored exactly like a worker. Writes
`usecase/tools/baseline.json`, which the screen draws as the dashed line.

```bash
npm run screen
```

The dashboard on http://localhost:3000, reading your Atlas directly.

## Things to try

**Kill a worker mid-puzzle.** Ctrl-C twice, or hit "Simulate failure" on
the stage view. Its task stops heartbeating, the reaper requeues it within
30 seconds, and the next idle worker picks it up with the attempt count
raised and every refuted rule from the first try pinned into its context.
Nothing is lost, because nothing was in the worker.

**Read what a worker saw.** Click any card on the stage view. The grids,
the program, and above them the precedents: programs from similar puzzles
written by agents this one never met, and the dead ends from earlier
attempts on this puzzle. That is the trail.

**Watch the library learn.** `/library` shows every solve on a timeline.
Click one to see which earlier records its worker read, and which later
solves read it. Then look at the two counters at the top of the stage: the
library climbing, the context per request not moving.

**Check nobody cheated.**

```bash
npm run invariants
```

Solved keys really scored 1, no hint or library record contains a test
output, no program hardcodes an example. Run every 30 minutes during the
event.

## How it works, one level down

- **Atlas is the only coordinator.** Five collections: `goal`, `inputs`,
  `tasks`, `state`, `sources`. Every write two processes could race on is
  one `findOneAndUpdate` with a precondition. No read-then-write anywhere.
- **The claim** is atomic. A worker heartbeats every 15 seconds; a claim
  without a heartbeat for 30 seconds goes back to open.
- **The slice** is the goal pinned verbatim, this puzzle's refuted rules
  from a plain indexed query (search indexes lag writes), a digest of what
  is failing across the fleet, and a handful of precedents retrieved with
  `$rankFusion` over vector, text and recency, then reranked.
- **The gate** is a registry of pure check functions from
  `usecase/checks.ts`. For ARC: the program reproduces every example pair,
  runs on the test input within a second in a sandboxed child process,
  and contains no example output as a literal.
- **Two hard signals.** A failed gate pins the rule as refuted for the
  next attempt. A wrong hidden score reopens the puzzle once with the hint
  "too specific". After five failures a puzzle blocks, and the planner
  reopens blocked puzzles every 20 merges because the library has grown.
- **The planner** is not a process. Before each claim, a worker checks
  whether the last planner turn is stale and the lock is free, and if so
  runs one turn: reap, emit, score, reopen, metrics. Queries only, no model
  calls, and no code path that writes the goal.
- **The harness is work-agnostic.** A puzzle is a unit with a key, a
  proposal shape and check kinds. A coding worker is the same loop with a
  worktree and a test check.

## Deploy the swarm

The workers are a Dokploy Compose service built from this repo:

1. New Compose service, source GitHub, repository
   `imfabiokeller/goalkeeper`, branch `main`, compose path `compose.yaml`.
2. Paste the `.env` contents as the environment. `WORKER_REPLICAS` sets
   the swarm size. Each worker gets 512 MB; the sandbox child is capped at
   256 MB, so one worker plus one child fits.
3. Deploy. Redeploy after a push, or enable auto deploy.

Nothing to route and nothing to mount. The image ships `src/` and
`usecase/`, the workers make outbound connections only (Atlas, OpenRouter,
Voyage), a worker's id comes from its container hostname, and its
heartbeat in Atlas is the health check. Stop containers from the Dokploy
UI to watch the reaper work. Local check: `docker build -t goalkeeper-worker .`

The screen is the same repo's `src/screen`, deployed on Vercel, polling
Atlas (Vercel functions cannot hold change streams open).

## Layout

```
src/
  shared/    types.ts (Zod schemas, the contract), db.ts, llm.ts, indexes.ts
  gate/      gate.ts: runs the checks a task's criteria name
  context/   retrieve.ts ($rankFusion), assemble.ts, synthesize.ts
  worker/    loop.ts, claim.ts, run.ts (AI SDK tools), write.ts
  planner/   lock, reaper, emit, score, reopen, lessons, metrics, invariants
  seed/      lens to goal, inputs loader
  screen/    Next.js: stage, library, task
usecase/     ARC: lens.json, inputs, checks.ts, sandbox.ts, answers (score() only)
docs/        the plan, the design, the database contract, the pitch
```

## Docs

- [docs/PITCH.md](docs/PITCH.md): the pitch, the numbers, the video script.
- [docs/architecture.html](docs/architecture.html): the architecture as
  one picture.
- [docs/MVP.md](docs/MVP.md): the build plan and acceptance criteria. Wins
  over every other doc.
- [docs/DESIGN.md](docs/DESIGN.md): the architecture and the reasoning.
- [docs/DATABASE.md](docs/DATABASE.md): collections, indexes, the claim,
  the retrieval query.
- [docs/PLANNER.md](docs/PLANNER.md): the planner steps.
- [docs/GOAL.md](docs/GOAL.md): the goal document, version 1.
- [docs/USE-CASE.md](docs/USE-CASE.md): ARC, and what any use case must
  provide.
- [docs/QA.md](docs/QA.md): the judges' questions and the answers.
- [docs/PRIOR-ART.md](docs/PRIOR-ART.md): what exists and how this differs.
- [docs/SUBMISSION.md](docs/SUBMISSION.md): the submission text.

## Built during the event

Everything in `src/` and `usecase/`, between 10:30 and 17:00 on September
26, 2026: the worker loop (claim, heartbeat, context assembly, AI SDK tool
loop with `try_submit`, gate, write), the library (enrichment, `$rankFusion`
retrieval, rerank, briefing), the planner (reaper, emit, hidden scoring,
reopen, metrics, lessons digest), the ARC use case (fixture, sandbox,
checks, control script), the screen (stage, expanded card, task, library)
and the kill switch. Reused as is: MongoDB Atlas, the Vercel AI SDK,
OpenRouter, Voyage, Next.js, Docker, and the ARC-AGI-1 data (Apache 2.0).

License: Apache 2.0.
