# Progress

## Current scope — Etapp 1: stable foundation

Updated 14 October 2026. The requested source corrections are implemented and
locally verified. Read-only Render service/deploy inspection is now complete;
log/environment access gaps, production recovery readiness and physical Safari
verification remain. Release is not yet approved or ready. No next-stage
capabilities added.

## Verified source and GitHub delivery

- Full git clone based on `main` commit
  `a21a3a9b4877ce31afc8eec28ae5557854f01b01` (merged PR #6).
  GitHub and local refs matched; `main` was unchanged when rechecked on 14 October.
- Separate work branch: `codex/etapp-1-stabil-grund`.
- Existing PRs #4 and #5 were inspected as older hosting variants, not used as
  the baseline. All requested files and `AGENTS.md` were read.
- Verified GitHub checkpoint 1:
  `6398df475760d98043ad6885e440555fe18df724` — deployment configuration,
  message-order migration and exact command responses; 7 tests at that checkpoint.
- Verified GitHub checkpoint 2:
  `fbf4c261e67b27b8f28266f31ac2c23fe29768a3` — sessions, separate Live/Demo
  state, accessibility fixes and 29 tests at that checkpoint.
- Real draft [PR #7](https://github.com/thebloodlineisreallycooking-ui/Jarvis-/pull/7)
  was created on 14 October. A previous attempt was not executed because the
  automatic approval reviewer hit a usage limit; the same connector succeeded
  after that limit cleared. Nothing was merged.
- This final checkpoint adds the direct Node/tsx production start, immediate 401
  cleanup when another fetch is still pending, guarded login lifetime, preserved
  malformed-request status codes, two more regression tests, reproducible local
  verification scripts and complete handoff documentation.
- Git CLI push has no credentials. The authorized GitHub connector saves trees
  and commits and advances only the work branch using an expected-head check.
  Each delivered tree is compared with the local commit before completion.
  The final response reports the actual verified PR head.
- Final delivery check normalizes the browser review output guard so it also
  rejects paths inside a repository directory with a trailing slash. An explicit
  in-repository output attempt was rejected before artifacts/server creation.
- Follow-up on the same branch/PR adds `docs/RENDER_OPERATIONS_REVIEW.md`, updates
  setup/requirement status, and adds `scripts/verify-recovery.mjs`. Application
  code remains at the previously verified revision `56978a89...`. This durable
  checkpoint records observed Render data and an explicit no-go release decision.

## Verified local behavior

- Current command parser supports task capture in English and Swedish. Owner
  login, Secure/HttpOnly sessions, production registration lockout, account
  isolation and the existing technical Live/Demo database boundary remain.
- API failures carry HTTP status. Only confirmed 401 ends the session; 403,
  network and 5xx errors have explicit error/retry states. Temporary fetch errors
  preserve loaded data/drafts, and initial failures do not claim the user logged out.
- Live/Demo tasks, messages and drafts are separate in-memory state. Requests
  remain tied to their originating mode. Logout/expiry clear private state and
  invalidate late success/error responses. Failed logout stays visibly unconfirmed.
- Migration 2 adds a durable message sequence. New user/reply pairs are saved in
  one transaction and returned directly. Legacy rows are preserved and ordered by
  timestamp then existing row order; uncertain historical ties are not invented.
- Task mapping validates the stored status against the existing `open` contract.
  Unknown legacy status is retained and exposed as an error, not relabeled.
- The three existing views and visual identity remain. Important text, input
  size, touch targets, focus, error/pending states and short-height scrolling are
  corrected. Reduced motion covers pseudoelements and hidden documents pause
  decorative animations.
- Final local gates: typecheck, **31 tests** across 3 files, production build and
  `git diff --check` passed. The original source had 3 tests, which also passed.
- Production verifier passed clean install/build with `NODE_ENV=production`,
  removal of dev dependencies, real npm start, login/cookies, Live save, process
  restart, ordered message retention, Demo isolation and logout. Temporary test
  credentials and databases only; no production data accessed.
- Chromium desktop emulation covered 390/430/820px, all three views empty/filled,
  long history, errors, focus, 200% root font, 360px available height, reduced
  motion, simulated visibility and Live/Demo/401/logout behavior. Screenshots
  were reviewed outside source control. See the full report for scope/limits.
- WebKit could not run because required system libraries were missing and this
  execution environment denied their installation. No physical iPhone/iPad
  Safari keyboard, safe-area or OS background behavior is claimed as tested.
- Recovery rehearsal passed against actual old source at `a21a3a9...`: native
  backup of an open WAL database, exact five-table preservation, migration/reopen,
  old-server Live failure despite successful health, immutable backup checksum,
  coordinated offline restore, restored old-code writes and account isolation.
  Only synthetic temporary data; the exercise also proves loss of post-backup
  changes when restoring to the earlier point.

## Actually observed hosting status

- The user has previously opened the app on Render. Old claims that hosting had
  never been created were removed.
- The user confirmed **My Workspace**. Read-only service metadata matched
  `srv-db1vle3bc2fs73em1t30` (`jarvis-private`) to the exact GitHub repository.
  Active branch is main; live commit is `a21a3a9b4877ce31afc8eec28ae5557854f01b01`.
  Deploy `dep-db2k2kmi0phs738s20k0` finished successfully on 6 October 18:44:34 UTC.
- Active build/start/health/region/plan/disk match PR #7. Auto-deploy is on commit.
  The dashboard already has `npm ci --include=dev && npm run build`; main's
  Blueprint omits it, and the PR codifies it. No active setting fix is proposed.
- Events show two earlier exit-127 deploy failures after successful builds,
  followed by success after a build-command change. Historical and recent log
  queries returned zero rows, so exact historical root cause is unverified.
- Active environment values, disk free space and backup availability are not
  exposed by the connector's read tools. Dashboard fallback reached sign-in.
  Actual DATABASE_PATH still needs non-secret confirmation. No new successful
  HTTP health/in-app production test is claimed from the Render `live` status.
- No production deploy, restart, merge, settings/secret/owner change, resource
  creation or database read/download/write was performed.

## Review handoff

Open PR #7 and `docs/RENDER_OPERATIONS_REVIEW.md`. Keep the draft unmerged:
release still needs actual DB-path/runtime confirmation, a consistent native
backup and an operator-tested Render stop/restore path before schema migration.
The report specifies a write freeze, backup verification/export, coordinated
data/code recovery and loss of post-backup changes. No production backup was
created or database downloaded. Historical log details and physical Safari
checks remain explicit gaps. Any production setting/maintenance/release action
needs a separate decision. Etapp 2 is not started.
