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

## Checkpoint 2 — client boundaries

- Checkpoint 1 is saved on GitHub as
  `6398df475760d98043ad6885e440555fe18df724`; its tree matches the locally
  verified changes. Git CLI push lacks credentials, so the authorized GitHub
  connector saves commits and advances only the work branch with a head check.
- Structured API errors distinguish 401, 403, network errors and 5xx. Initial
  failures have retry UI; existing content/drafts survive temporary errors.
- A session-scoped in-memory controller separates Live and Demo data/drafts,
  captures request mode, invalidates late responses, and clears private state
  only on confirmed logout/session expiry. Failed logout is explicit.
- UI reports loading/saving/error states and exposes sign-out on mobile.
  Targeted type/touch/focus/scroll fixes preserve the three-view identity.
  Reduced motion covers pseudoelements; hidden documents pause animation.
- Local checks: typecheck and 29 tests passed; visual review is still pending.
- Render is now connected but has no selected workspace. The connector requires
  user confirmation of the listed `My Workspace` before service reads; no
  production information or database has been accessed.
