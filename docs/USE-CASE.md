# Use case brief: what the harness needs from a demo use case

For whoever designs the demo use case. The harness is being built
independently of the use case; anything that fits this brief will run on it.

## Pure state, in one paragraph

Workers do not write code, open browsers or touch a repo. A worker reads an
input document, reads the current state for its unit of work, and submits a
proposal: a JSON object. A deterministic check function (plain code, no
model) decides pass or fail. Pass means the proposal becomes the new state
and lands in the ledger. Fail means the reasons are written to the library,
and the next worker on that unit sees them in its briefing. Everything a
worker is shown and everything it does is stored raw in the library.

## The five things a use case must provide

1. **Inputs.** A set of documents that are already plain text (or trivially
   converted before 10:30). One input per unit of work. 100 to 500 of them.
   Public, no login, no PDFs that need OCR.
2. **Units of work with a key.** One string key per unit, for example
   `acme-2024`. Units must be independent: finishing one never requires
   another to be done first. This is what lets 20 workers run in parallel
   without conflicts.
3. **A proposal shape.** The JSON a worker submits, with every field named
   and typed. Small: five to fifteen fields. Every extracted value should
   carry the exact quote from the input it came from.
4. **Check functions.** For each criterion in the goal, a rule a programmer
   can write in under an hour that takes (proposal, input, current state)
   and returns pass or fail with reasons. No "does this look right". Good
   kinds of checks:
   - the quote appears word for word in the input
   - the number in the proposal matches the number in the quote
   - required fields are present and typed correctly
   - values are consistent with each other (parts add up to the total)
   - units normalize to the expected unit
   - the unit is not a duplicate of one already in state
5. **A goal document.** Human-written, version 1:
   - goal: two sentences
   - criteria: three at most, each pointing at one check kind
   - guidelines: five lines of taste ("prefer the audited figure", "never
     estimate a missing number")
   - out of scope: what gets parked, with the reason shown on screen

## What a worker gets

- The goal document, pinned, always.
- Its task: key, criterion, check kind.
- The last failures on this key, pinned.
- A short briefing synthesized from retrieved library passages: precedents
  from other units ("company X reports in thousands of tonnes").
- Five tools: `read_input`, `read_state`, `search_library`, and one of
  `submit(proposal)` or `block(reason)`.
- A step budget of about 20 tool calls.

Context per request stays under 20k tokens no matter how big the library
gets. That flat number is one of the two counters on screen.

## What a worker returns

Exactly one of:

- `submit(proposal)`: goes to the gate.
- `block(reason)`: the task is marked blocked with the reason. Workers
  never ask humans. When several tasks block for the same reason, the
  planner proposes one guideline; a human approves it on the inbox, the
  goal version bumps, and all of them reopen.

## What the screen sees (task statuses)

`open` -> `claimed` (worker heartbeating) -> `merged`, or back to `open`
once on a failed check, then `blocked`.

A killed worker's task goes back to `open` after 30 seconds without a
heartbeat. Nothing else happens; another worker claims it.

## Crowd requests, four paths

Every request from the QR page ends on exactly one path, visibly:

- a unit from the unscheduled pool: becomes a priority task ("do Siemens
  2023")
- a doubt about a merged record: becomes a recheck task ("that Shell
  number looks wrong")
- a guideline: becomes a proposal in the inbox, only a human can approve
  it ("always take the upper bound")
- anything else, including new fields and judgment calls: parked with a
  reason on screen ("also capture water usage", "rank the greenest")

Design the use case so that all four paths are easy to trigger from the
audience. Load more inputs than you schedule, so "add X" is real work.

## Checklist for a candidate use case

Answer yes to all of these or pick another one.

- Are the inputs text already, public, and can we have 100+ by 10:30?
- Is each unit independent of every other unit?
- Can every criterion be checked by a rule with no judgment call?
- Does a failed check produce a reason that would help the next attempt?
- Does one unit take a model about 20 to 60 seconds, not ten minutes?
- Would a non-engineer understand one merged unit on screen in two seconds
  (a number plus the highlighted sentence it came from, for example)?
- Can the audience suggest additions that hit all three crowd paths?
- Does the result matter to someone outside the room?

## Status: still looking

No use case has been chosen. `usecase/` holds one candidate (headline
quarterly results from earnings press releases, [usecase/README.md](../usecase/README.md))
in the exact shape the harness reads: `lens.json`, `inputs.json`,
`inputs/`, `checks.ts`, `samples/`. Any replacement must ship in that
shape. The candidate stays as the development fixture until then.

## What to hand back

A filled version of the five things above, plus the 100+ inputs as text
files in a folder, plus five sample proposals written by hand so the check
functions can be tested before any worker runs.
