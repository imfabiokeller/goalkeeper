# The day

Doors 9:00, kickoff 10:00, hacking 10:30 to 17:00, judging 17:15, top six
on stage 19:00. Finalists demo again at MongoDB.local NYC on September 30.

**In one line:** by 15:15 a worker dies mid-puzzle and a new one finishes
it from the library alone, and the solve-rate curve is climbing.
Everything before serves that; everything after is demo.

The morning went to deciding. The implementation plan with acceptance
criteria and the timeline from 12:00 is [MVP.md](MVP.md). This file keeps
only the rules and the cuts.

## Rules

- Everyone commits to `main`, rebase before, push right after, so others
  see it. Fabio reviews on `main`.
- Nothing on stage waits for an agent. Everything is already running when
  the slot starts; a recorded replay is the fallback.
- Single worker loop first; many is starting it N times.
- The screen is about the runtime (units, workers, gate, progress,
  counters), never a kanban of agents.
- Keys in `.env`, never in the repo.

## Cuts, in order, if behind

1. Reopen-on-library-growth.
2. The task page.

Never: claim, heartbeat, reaper, gate, sandbox, `try_submit`, hidden
score, the curve, raw sources, kill-and-resume.

## 16:30 to 17:00

Repo public, Apache 2, README's "built today" list accurate. Submit.
Rehearse the three minutes twice.
