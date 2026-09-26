# Screen spec from the mockups (15:30)

The mockups are in `docs/mockups/stage/` (`Stage-Cards.dc.html`, the
main screen; `Stage-Cards-Open.dc.html` opens card index 2). They are the
reference for every screen: replicate their values (colors, type, spacing,
radii) in our own components. Everything below is derived from them plus
Fabio's notes. Rule: every number on screen earns its place. Keep it
simple. Sleek.

## Visual system (from the mockup)

- Background `#000`, cards `#0a0a0a` with 1px borders `#1f1f1f`, radius
  about 12px. Text `#ededed`, dim `#a1a1a1`, dimmer `#8f8f8f`.
- Fonts: Geist (sans), Geist Mono (keys, numbers, code), via Google Fonts.
- Status: solved green `#4a8f67` (chip text `#6fbf8e`, border `#1d3527`,
  card bg `#08120c`); working blue `#5b7cfa` (pulsing dot); retrying amber
  `#c29a3a` (chip `#d9b45a`, border `#2e2612`, bg `#0d0b05`); passed
  examples teal `#2f8f8a` (chip `#5fb8b3`, border `#16403e`, bg `#061110`);
  agent stopped red `#f07178` (dot `#7a2e31`, border `#3a1a1b`, bg
  `#120707`); precedent kinds: solved `#4a8f67`, refuted `#c29a3a`.
- ARC palette in the mockup: `#07070d #5a5fe0 #ec5a78 #3fd0a4 #f6c453
  #7c7f99 #c65ae0 #f58b4c #72d8f5 #8a2f60` (0 to 9). Use these, not the
  official ARC colors. Differing cells get an inset 2px `#ededed` outline.
- Motion: `.pulse` on the working dot; a solved card flashes its green
  ring then fades out and leaves the grid (`gksolved`); a retrying card
  flashes amber (`gkretry`); precedents arrive one by one (`gkarrive`);
  the kill toast slides in (`gktoast`). All off under reduced motion.
- Workers are called agents on screen: `w-06` renders as "agent 6" (for
  our ids like `w-2196so`, render "agent 2196so" or shorten to the last
  4 characters; pick one and keep it).

## Stage `/` (1920x1080, no scrolling)

Header, one row:
- left: `goalkeeper / Solve 400 ARC puzzles` (goal statement, one line),
  a chip "goal written by a human · 14:20".
- right: the KPIs. In the mockup: a sparkline plus `44%` "solved · was
  18%"; `19%` "control · no library"; `86 / 400` "puzzles solved";
  agents count with a note; `17.9k` "tokens each agent reads"; `412.8M`
  "tokens in the library"; a "Library" link.

Fabio's change to the hero: the hero KPI is library size versus solve
rate. Show, as the largest element in the header, one small chart: x is
library tokens (or time with library tokens as the label), y is solve
rate per 15-minute bucket, with the dashed control line. The hypothesis
on screen: the rate goes up as the library grows, or at least does not go
down. Label it in plain words ("solve rate as the library grows"). Data:
`/api/stage` metrics.solveRate (buckets) and metrics.perMinute tokens
(cumulative sum gives library size per bucket); control from
`/api/baseline`.

Body: a grid of cards, one per puzzle currently claimed (the workers'
puzzles), plus the most recent solved and retrying ones so the grid stays
full (about 8 to 12 cards at 1920x1080, 3 or 4 per row). Card:
- header: key (mono), "attempt n of 5", a status chip (Solved, Working,
  Resumed, Retrying, Passed examples, Agent stopped).
- three small grids: example, arrow, expected, agent's try (with diff
  outlines; "no program yet" placeholder box when there is no draft).
  Show one pair (the first failing pair if any, else pair 1); pair dots
  under it, one per pair, green match, amber differ, grey none.
- a note line: "all 3 pairs match · hidden test passed", "2 of 3 pairs
  match", "pair 2 · 4 cells differ", "reading 3 entries from the
  library", "w-05 died · picked up again, nothing lost". Right of it,
  dim: "control: not solved in 5" / "control: 1 of 3 pairs" when the
  puzzle is in the control run.
- "Lessons pulled from the library" panel: three thumbnails (a small
  grid from the precedent puzzle), each labeled "worked · agent 3" or
  "dead end · agent 2". For a retrying card the title is "Carrying
  forward what went wrong" with its own failed tries. For a card still
  reading: "Pulling lessons from the library…" with the arrive animation.
- footer: a one-line plain-language state ("agent 2 is testing its
  program", "Solved. Its rule is now in the library for every agent.",
  "3 tries failed · the next agent starts with what went wrong") and
  right-aligned "step 12 of 20".
- Click opens the expanded card.

Kill: a dashed button "stop 5 agents" in the header or footer. Clicking
POSTs `/api/kill { n: 5 }`; the screen shows the toast "5 agents stopped ·
their 5 puzzles went back in the queue · replacements starting · nothing
lost"; the five cards turn to "Agent stopped" (red) and, within 30 s,
their puzzles reappear as "Resumed" on other agents. The data: tasks with
`diedAt` in the last 30 s carry `lastWorker`; the resumed task's hint
tells the story.

## Expanded card (overlay on the stage, same URL with `?open=key`, and
also the standalone `/unit/[key]`)

- header: key, chip, "attempt n of 5".
- all pairs, each row: example, expected, agent's try (diff outlines),
  "pair n" label, match/differ dot.
- "Rule" (solved) or "Current hypothesis": one sentence.
- "Learning from other puzzles · most similar first": the precedents with
  gist, kind (solved / refuted, refuted struck through), where (agent,
  time), score when known.
- "Compared with the control · same puzzle, same model, same token
  budget · the control agent has no library": two columns, goalkeeper
  and control, each with outcome and one line why. Data from
  `/api/baseline?key=` (per puzzle results from the control run; if the
  puzzle is not in the control run yet, say "control has not tried this
  puzzle").
- "What it read · 11,240 tokens · built fresh": the context sections
  with tokens each (goal, puzzle, state, failures, lessons, precedents).
  Data: `/api/task/[id]` run.raw.system split on "\n# " (already done in
  lib/transcript.ts), for the latest attempt.
- "Attempts": rows attempt, agent, outcome, why.
- link: "See everything agent N read and did, step by step" to
  `/task/[id]`.

## Task `/task/[id]`

Keep S2's structure, restyled: what it read (sections with tokens), then
the steps as a vertical timeline (tool, verdict, reasons), proposal, gate,
what happened next. Same card style, same fonts, no new numbers.

## Library `/library`

New page, "how big is the library right now":
- big numbers: entries, tokens, bytes on disk (Atlas `collStats` or
  `$collStats` on sources: `storageSize`), entries per kind (worker-run,
  gate, planner-turn, error), solved rules stored, refuted rules stored.
- a growth line: tokens over time (perMinute cumulative).
- the lessons digest text as it is pinned into every context.
- the newest 20 entries: time, kind, key, gist; each links to
  `/library/[id]` (exists).
- one line at the top that says what it is: "Raw, append-only, machine
  written. Nobody reads it whole. Every agent reads about 17k tokens of
  it, chosen for its puzzle."
Data: a new `GET /api/library` route.

## Data additions needed (screen folder only, plus one worker file
already done)

- `POST /api/kill` `{ n }`: upsert `controls/kill` `{ remaining: n, at }`.
  The only write the screen makes. Workers take kills on their next
  heartbeat (done, src/worker/claim.ts).
- `GET /api/baseline?key=`: per puzzle control result from
  `usecase/tools/baseline-400.json` (being produced; falls back to
  `baseline.json`), `{ gatePass, score, solvedAt2, firstReason,
  attempts }`; without key, the totals as today (prefer the 400 file).
- `GET /api/library`: the numbers above.
- Stage cards need per card: the first failing pair index and the actual
  output for that pair (the unit route computes actuals; the stage route
  should include, per claimed or recently finished task, `pairs:
  [{ ok }]` and the one pair to show with its actual grid, or the stage
  page fetches `/api/unit/[key]` for the visible cards every 3 s; the
  latter is simpler, 12 requests every 3 s is fine).
- Precedent thumbnails need the precedent puzzle's first example input
  grid: `/api/unit/[key]` precedents should carry `thumb: Grid` (first
  train input of the precedent's key).
