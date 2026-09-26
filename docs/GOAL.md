# The goal, version 1

The first goal document. Seeded before the swarm starts; changed only by
approved diffs afterwards. The machine-readable form is
`usecase/lens.json` (the seed converts it to the `goal` document); this is
the readable one.

**No use case has been chosen yet.** We are still looking for a pure-state
use case that fits [USE-CASE.md](USE-CASE.md). The `usecase/` folder holds
one candidate (headline earnings from press releases) that is used to
build and test the harness until the decision is made. The text below is
that candidate, not the decision. The harness does not care which domain
it is: it reads `usecase/lens.json`, `usecase/inputs.json`,
`usecase/inputs/` and `usecase/checks.ts`, so a different use case in that
shape drops in without code changes.

## Statement

Build a table of headline quarterly results for S&P 500 companies from
their own earnings press releases: revenue, net income and diluted EPS for
the quarter just reported. Every figure carries the sentence or table row
it came from, so anyone can check it in two seconds.

## Criteria

1. Every value is backed by a quote that appears word for word in the
   release and contains that value at the precision it was written.
   Check: `grounded`.
2. The figures agree with each other and with the filing: net income never
   exceeds revenue, EPS carries the sign of net income, stated growth
   matches the two revenue figures within one point, period ends at most
   120 days before filing.
   Check: `consistent`.
3. Exactly the twelve fields of the proposal shape, correctly typed,
   amounts in whole US dollars, key not already merged.
   Check: `schema`.

## Guidelines

- Prefer GAAP figures over adjusted or non-GAAP ones.
- Prefer the quarter just ended over year-to-date or full-year figures.
- Never estimate or derive a missing number. Leave it null with no quote.
- Convert every amount to whole US dollars; per-share figures stay as
  written.
- If the release gives two GAAP figures for the same item, block with the
  reason instead of choosing.

## Out of scope

Guidance and forecasts. Non-GAAP measures, margins, ratios. Segment and
regional breakdowns. Balance sheet, cash flow, dividends, buybacks. Any
ranking, comparison or investment opinion. Companies not in the inputs.

## Inputs

395 press releases as plain text, keyed `<ticker>-<filing date>`. The
first 200 are scheduled; the rest are the reserve the audience can pull
from.

## What the audience can request

- A company from the reserve: becomes a priority task.
- A recheck of a merged record: becomes a priority task, the old record
  stays until the new one merges.
- A guideline ("banks report net revenue, take that"): becomes a proposal
  in the inbox.
- Anything else (new fields, rankings, companies not in the inputs):
  parked with a reason on screen.
