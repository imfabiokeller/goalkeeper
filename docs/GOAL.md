# The goal for the hackathon day

This is the first lens document, version 1. The human writes it, the
orchestrator derives nothing beyond what is here, and the swarm starts.

## Goal

Migrate `<fork of repo X>` to strict TypeScript, file by file, without
breaking it, and ship what the room asks for.

## Criteria

1. Every file under `src/` passes `tsc --strict` with no `any`.
   Check: `tsc-strict-file` (per-file run in the gate).
2. The existing test suite stays green on every merge.
   Check: `suite` (full suite in the gate).
3. A crowd request classified as a feature ships with a test the
   orchestrator wrote first.
   Check: `new-test` (the new test passes, the suite stays green).

## Guidelines (taste)

- Smallest diff that satisfies the criterion.
- No refactors beyond the file's declared scope.
- No new dependencies without an ask.
- Never edit a test to make it pass.
- Tests are the judge.

## Out of scope

Build tooling, CI config, docs, anything that changes the library's public
API. Parked with a reason, visible on the screen.

## Picking the repo (first twenty minutes, decide by 10:50)

MIT or Apache. 100 to 400 source files. Tests under a minute, plain
`npm test`. No exotic build. Enough surface that crowd features make sense.

Fallback if no repo fits fast: "build a small REST service from this
40-test acceptance suite", where the tests are the criteria.

## Two lanes

- Lane 1, the backbone: the migration. Hundreds of naturally disjoint
  tasks, a built-in check each, a file grid turning green all day.
- Lane 2, the crowd: a QR page. Each request is classified as serving an
  existing criterion (queued), a new criterion (an ask to the team, then a
  test first), or out of scope (parked with a reason).
