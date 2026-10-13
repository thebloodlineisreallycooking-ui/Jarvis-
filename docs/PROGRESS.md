# Progress

## Etapp 1 — stable foundation (2026-10-13)

- Source: full git clone of `thebloodlineisreallycooking-ui/Jarvis-`, based on
  `main` commit `a21a3a9b4877ce31afc8eec28ae5557854f01b01` (merged PR #6).
- Work branch: `codex/etapp-1-stabil-grund`; creation independently verified on
  GitHub. Open PRs #4 and #5 are older hosting variants; neither is the baseline.
- Baseline local checks: typecheck, all 3 existing tests and production frontend
  build passed. The reported state/ordering/build configuration problems were
  confirmed against this source, rather than assumed from older status notes.
- Checkpoint 1: explicit Render build command; `tsx` is a runtime dependency;
  forward migration 2 introduces durable message sequences and validates new
  task status writes; command responses return their own saved message pair.
- Checkpoint 1 local checks: typecheck, 7 tests and diff whitespace validation
  passed. Tests cover tied timestamps, exact responses, migration/reopen,
  account isolation, Demo writes and invalid stored status.
- Legacy ordering: migration uses `created_at`, then existing SQLite `rowid`
  for ties. It preserves every row and fixes that order permanently; it cannot
  prove the original chronology of historical ties and does not infer pairs.
- Task contract currently permits only `open`. Unknown legacy statuses are
  retained and surface a server error; they are never silently converted.
- Render observation: the user has previously opened this app on Render.
  This session has no connected Render access yet; active service/repo mapping,
  deployed commit, settings, disk and logs are not observed. No deployment,
  settings change, restart, resource creation or production DB access performed.
- Frontend corrections and final verification are in progress. No new assistant,
  provider, voice, desktop or task-editing capabilities are included.
