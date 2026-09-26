# Design brief: the goalkeeper screen

Paste this into Claude Design. The mockups come back before any UI code is
written. Every screen below is required.

## What the product is

goalkeeper is a runtime for long-running AI agent work. The use case it
runs is not decided yet; every screen must work for any pure-state use
case (units of text in, a small JSON record with quotes out). A human approves a
small goal document. Twenty disposable, stateless workers claim units of
work from a queue in MongoDB, build a context from a raw library of
everything that ever happened, produce a JSON result, and pass it through a
deterministic gate. No worker keeps state; any worker can be killed and
another finishes its unit. Workers cannot change the goal; they can only
propose a change that a human approves. The screen is the only window into
this: it is shown on a projector during a three-minute live demo, and
opened on phones by the audience.

The audience must understand, without narration, from the back of a room:
work is happening in parallel, workers die and nothing is lost, the goal
is small and human-owned, the library is huge and machine-owned, and
quality is going up over time.

## Design direction

- Monitoring-room feel, not a SaaS dashboard: dense, calm, dark background,
  one accent color, status colors that read at distance. Think flight
  board or trading floor wall, not cards with shadows.
- Color is status. Grey open, blue working (with a slow pulse), green
  merged, amber retrying, red blocked, dark red dead worker. Nothing else
  is colored except the accent for the human's actions.
- Motion is activity: cells pulse while held, cards slide to their outcome,
  a version bump ripples. No decorative animation.
- Numbers are the claim: two big counters and one version number are the
  only large type on the stage view.
- Typography: one monospace for keys, numbers, quotes; one sans for prose.
- Phone pages (`/request`, `/inbox`) are thumb-first, one action per
  screen, large tap targets, work on a 375px width.
- Light mode is not needed. Reduced motion should still be legible.

## The data on screen (vocabulary)

- **Goal**: statement, version number, criteria (three, each with a short
  label), guidelines (short list), out of scope (short list), history of
  approved changes.
- **Unit**: one item of work with a key (a short slug), a
  display name, a status, and once merged a small record (a few numbers
  and one quote per number) with the sentence it came from highlighted in
  the source text.
- **Task**: an attempt on a unit: status, attempt number, worker id, steps
  used, seconds, tokens, gate result with reasons, block reason.
- **Worker**: id (`w-07`), current unit, current step of 20, last heartbeat
  age, alive or dead.
- **Source** (library entry): kind (worker-run, gate, planner-turn,
  crowd-request, answer, error), unit key, one-line gist, labels, tokens,
  timestamp, and the raw content (long).
- **Question**: a proposed change to the goal: the proposed guideline
  text, the reason, the evidence (blocked units), status open, approved or
  rejected.
- **Crowd request**: free text from the audience, its outcome (task,
  recheck, proposal, parked) and a one-line reason.
- **Counters**: library tokens consumed (rising, hundreds of millions),
  context per request (flat, under 20k tokens).
- **Metrics over time**: units done per criterion, first-attempt pass
  rate, blocked count, median seconds per unit, context per request,
  library size, with vertical markers where the goal version changed.

## Screens

### 1. Stage view `/` (projector, 1920x1080, no scrolling ever)

The main screen. Five regions, all live.

- **Header**: goal statement in one line, version number large with the
  time of the last change, three criterion progress bars with counts
  (142/200), the two counters large. A small QR code for `/request` in the
  corner.
- **Units grid**: the biggest region. One cell per scheduled unit (200 to
  500), status colored, key inside if space allows. Blue cells
  pulse. Hovering or tapping shows the unit's name, status, attempt and
  the last reason. Reserve (unscheduled) units are shown dimmed at the end
  so "add X" visibly lights one up.
- **Workers**: one row per worker (8 to 20): id, unit key, step n/20 as a
  tiny bar, heartbeat age, alive dot. Dead workers stay for 30 seconds in
  dark red, then disappear. When a worker dies, its unit's cell goes from
  blue to grey and then blue again on another row; that transition must
  be visible.
- **Live feed**: newest on top, 15 lines, each one line: merged with the
  unit; failed with the check that failed; blocked with the reason; crowd
  request card moving from "received" to its outcome with the reason;
  proposal pending badge. Older lines fade out.
- **Timeline strip**: two sparklines at the bottom: units done cumulative
  and first-attempt pass rate, with goal version markers. A "blocked"
  count next to them.

Show two states: mid-run healthy, and right after five workers were killed
(five dark red rows, five grey cells, feed showing requeues).

### 2. Unit detail `/unit/[key]` (projector and laptop)

Opened by clicking a cell. Left: the merged record (or the latest
proposal), each value with its quote; clicking a value scrolls the source
text on the right to the quoted passage and highlights it. Right: the
source text, long, scrollable, with highlights. Below: the attempt history
(one row per task: attempt, worker, outcome, seconds, tokens, reasons),
each opening the task page. Show a merged state and a blocked state.

### 3. Task page `/task/[id]` (laptop, for a judge asking "what did it see")

One iteration end to end, top to bottom:

- The context the worker was given, as sections: the goal (pinned), the
  input excerpt, the current state, the last failures on this unit, and
  the retrieved library passages each with its source kind, gist, score
  and a link to the library entry.
- The tool call transcript: each step with the tool name, arguments,
  result excerpt, and tokens. Collapsible.
- The proposal as submitted.
- The gate result: each check with pass or fail and reasons.
- What happened next: merged, reopened, blocked.
- Token counts for the request and a "context size" figure next to the
  global counter to show they match.

Show a passing task and a failing task whose failure reasons then appear
in the next attempt's pinned failures (two tasks side by side or linked).

### 4. Timeline `/timeline` (laptop and projector)

Charts above, log below.

- Charts, one per line: units done per criterion (cumulative), first-
  attempt pass rate (rolling 20), blocked count, median seconds per unit,
  context per request (flat) versus library size (rising) on one chart with
  two axes. Every chart has the goal version markers as vertical lines with
  the version label. Hover shows the minute's numbers.
- Log: one row per task attempt in time order: time, unit, worker,
  attempt, outcome, failed check, seconds, tokens. Filters: criterion,
  worker, outcome. Click opens the task page.

### 5. Library `/library` (laptop)

The raw record. A list of sources newest first with kind, unit, gist,
labels, tokens, time. Filters by kind and unit, a search box. Clicking
opens the raw content in a side panel, unformatted, with the enrichment
(gist, entities, labels) above it. The point of the page is to show the
library is raw and huge: show the total count and total tokens at the top.

### 6. Goal `/goal` (laptop and projector)

The goal document, readable: statement, criteria with their check kind,
guidelines, out of scope. Version and a history list: each approved change
with the diff, who approved, when, and how many blocked units it resolved.
Read-only. This is the page to show when saying "a human approved this,
nothing else was written by a human today".

### 7. Inbox `/inbox` (phone first, also laptop)

Pending proposals, one card each: the proposed guideline text large, the
reason, the evidence (N blocked units, expandable to their reasons), two
buttons: Approve and Reject. After approving, the card shows "goal is now
version N, M units reopened" and stays for a few seconds. Resolved
proposals below, collapsed. Empty state: "nothing to decide".

### 8. Request `/request` (phone first, reached by QR)

One text field ("what should the swarm do?"), an optional picker of
reserve units (searchable list of names), a submit button. After
submitting, the same page shows the request card and, within seconds, its
outcome with the reason: queued (with the unit lit), rechecking, proposed
(waiting for approval), or parked (with the reason). A list of the
person's previous requests below. No login.

### 9. Worker page `/worker/[id]` (laptop, optional)

One worker's recent iterations: unit, outcome, seconds, tokens, and its
current step if alive. Mostly for debugging. Low priority.

## Interactions to design explicitly

- The kill: five worker rows go dark red, five cells drop to grey, the feed
  shows five requeues, five cells go blue on other rows. Within 30 seconds.
- The approval wave: a proposal is approved on a phone; on the stage view
  the version number ticks up with a ripple, red blocked cells go grey,
  then blue, then green over the next minute.
- The crowd card: a request appears in the feed as "received", then slides
  to its outcome with the reason, and if it was a task the matching cell
  lights up.
- Opening a unit from the grid and following one value to its highlighted
  sentence.

## Deliverables

Mockups for screens 1 to 8 at desktop width, and 7 and 8 at phone width,
with the two states requested for screen 1 and the two for screen 2. A
small component sheet: status colors, the cell, the worker row, the feed
line, the crowd card, the proposal card, the counter, the sparkline, the
highlighted quote.
