# Progress

## Current scope — Etapp 1: stable foundation

Updated 14 October 2026. The requested source corrections are implemented and
locally verified. Active Render inspection and physical Safari verification
remain separate, explicitly unverified items. No next-stage capabilities added.

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

## Actually observed hosting status

- The user has previously opened the app on Render. Old claims that hosting had
  never been created were removed.
- The Render connector is available. It listed **My Workspace** but requires the
  user to confirm the workspace before service reads. That selection is not yet
  confirmed, so no service/repository match, active branch/SHA, build/start
  commands, health check, mounted disk or deploy logs were observed here.
- Repository Blueprint expectations are recorded in `docs/SETUP.md`. The only
  Blueprint change is the explicit build command. No active-dashboard mismatch
  is asserted without reading it.
- No production deploy, restart, merge, settings/secret/owner change, resource
  creation or database read/download/write was performed.

## Review handoff

Open PR #7 and `docs/ETAPP_1_REPORT.md`. Confirm **My Workspace** for read-only
Render inspection, then compare the existing service with the exact proposed
configuration. Keep the PR unmerged until release review: the existing Blueprint
may auto-deploy when main changes. Physical Safari checks remain for an approved
release. Etapp 2 is not started.
