# The day

Doors 9:00, kickoff 10:00, hacking 10:30 to 17:00, judging 17:15, top six
on stage 19:00. Finalists demo again at MongoDB.local NYC on September 30
(community vote, then top three on the main stage at 16:30).

**In one line:** by 15:00 a worker dies mid-task and a new one finishes it
from the library alone. Everything before serves that; everything after is
demo.

## Before 10:30 (paper only, no code)

- GOAL.md filled in with the repo.
- DATABASE.md agreed as the contract between the two halves.
- Atlas sandbox reachable, OpenRouter key, Claude Code headless verified in
  a worktree, repo name, Vercel login, phone hotspot.

## 10:30 to 13:00: one stateless loop

- Fabio: claim, heartbeat, worktree per task, `claude -p` as the worker,
  gate script (tsc, tests, scope), serial merge with rebase, redo on
  conflict. Every run written raw to `sources`.
- Maya: ingest enrichment, vector and text indexes, `$rankFusion`
  retrieval, briefing builder with the lens pinned and a grounding check.
- Milestone 13:00: one worker completes one file end to end, and its
  briefing came from the library.

## 13:00 to 15:00: many loops, and the kill

- Orchestrator: deterministic planner for lane 1, model planner for lane 2.
- Ten workers. Kill one mid-task, watch the requeue. That is the milestone.
- Maya: live screen from change streams: lens, queue, workers, gate,
  ledger per criterion, the two counters.

## 15:00 to 16:30: the crowd lane and the moments

- QR page, classifier, asks page for the team.
- Drift check every N merges. One planted request that gets parked, one
  that becomes a criterion.
- Record the one-minute video by 16:30 from a real run.

## 16:30 to 17:00

- Repo public, Apache 2, README's "built today" list accurate. Submit.
  Rehearse the three minutes twice.

## Cuts, in order, if behind

1. Crowd lane.
2. Drift check.
3. Model planner (hand-written task list instead).
Never: kill-and-resume, briefing-from-library.

## Rules

- Nothing on stage waits for an agent. Everything is already running when
  the slot starts; a recorded replay is the fallback.
- Single stateless loop first; many is starting it N times.
- Keep the screen about the runtime (queue, workers, gate, ledger,
  counters), never a kanban of agents.
