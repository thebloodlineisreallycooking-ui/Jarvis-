# Etapp 1 — implementation and verification report

Review date: 14 October 2026. Code changes are confined to **STABIL GRUND**.
The existing dark three-view interface and task-capture functionality remain.

## Source and delivery

- Repository: `https://github.com/thebloodlineisreallycooking-ui/Jarvis-`
- Base: `main` at `a21a3a9b4877ce31afc8eec28ae5557854f01b01`, independently
  verified through the GitHub connector and a complete git clone. `main` was
  rechecked on 14 October and had not moved.
- Work branch: `codex/etapp-1-stabil-grund`; no direct changes to `main`.
- Existing PRs #4 and #5 are earlier hosting variants. Merged PR #6 is in the base.
- Real draft PR: [#7](https://github.com/thebloodlineisreallycooking-ui/Jarvis-/pull/7).
- GitHub checkpoints already verified:
  `6398df475760d98043ad6885e440555fe18df724` (server/build/data) and
  `fbf4c261e67b27b8f28266f31ac2c23fe29768a3` (client/UI/regression tests).
- The PR creation attempt on 13 October was not executed because automatic
  approval review hit an account usage limit. Retrying through the same approved
  connector on 14 October created PR #7. No alternative bypass was used.
- Git CLI clone/fetch works; CLI push lacks credentials. Changes are saved with
  the authorized connector, using a complete tree based on the prior commit and
  an expected-head check. Tree hashes are compared with the local verified tree.
- Final verification and handoff files are included in this report's commit.
  The PR's head SHA identifies the externally delivered revision; the final
  response records the independently verified head rather than embedding a
  circular self-referencing commit hash in this file.

## Changes and exact file list

| File | Change |
| --- | --- |
| `package.json` | Runtime `tsx`; production Node loader start command |
| `package-lock.json` | Corresponding dependency classification, no version upgrades |
| `render.yaml` | Explicit `npm ci --include=dev && npm run build` |
| `server/app.ts` | Actual status validation, exact saved response pair, ordered history, structured server failures |
| `server/db/migrations.ts` | Forward migration 2: message sequence/index and new-write task-status validation |
| `shared/contracts.ts` | Shared schema for the existing `open` task status |
| `web/src/api.ts` | Structured HTTP/network errors and request cancellation |
| `web/src/workspace.ts` | Session lifecycle, stale-response guards, separate Live/Demo data and drafts |
| `web/src/main.tsx` | Controller integration, truthful state/error/retry UI, accessible mobile logout |
| `web/src/styles.css` | Readable type, 44px controls, focus, reflow, short-height scrolling and animation preferences |
| `tests/stable-data.test.ts` | Ordering, migration/restart, exact responses, isolation and stored-status regressions |
| `tests/workspace.test.ts` | HTTP errors, session cleanup, mode separation, request races and pending/error states |
| `scripts/verify-production.mjs` | Reproducible isolated production install/build/start/restart verification |
| `scripts/verify-browser.mjs` | Reproducible local HTTPS browser review with synthetic content |
| `scripts/verify-recovery.mjs` | Isolated WAL backup, migration and old-code recovery rehearsal |
| `README.md` | Current capability and existing-deployment description |
| `docs/SETUP.md` | Existing Render-service comparison, mobile handoff and verification commands |
| `docs/PROGRESS.md` | Separate local, GitHub and Render status |
| `docs/ETAPP_1_REPORT.md` | This requirement-by-requirement report |
| `docs/RENDER_OPERATIONS_REVIEW.md` | Observed Render/PR comparison, recovery runbook and release blockers |

Files such as `server/index.ts`, `server/db/database.ts`, the TypeScript/Vite/
Vitest configs and `tests/phase-a.test.ts` were inspected and retained. No
credentials, database, screenshots, logs or built bundles are included.

## Requirement status

“Klart” means implemented and verified in the local environment unless the row
explicitly describes GitHub. It does not imply production deployment.

| Requirement | Status | Evidence / limitation |
| --- | --- | --- |
| Current main, branch, commit, open PRs and AGENTS.md | Klart | Complete single-commit clone, separate branch, inspected instructions and all requested files |
| GitHub read/write and real PR checked separately | Klart | Connector reads, branch/tree/commit/ref writes and PR #7 each confirmed |
| Render service linked to the correct repo | Klart | User confirmed My Workspace; service srv-db1vle3bc2fs73em1t30 matches the exact repo URL |
| Render active branch/SHA/build/start/health/disk | Klart | main at a21a3a9; live deploy from 6 October; configuration matches PR #7 |
| Render historical deploy logs | Blockerat | Log queries return zero rows; Events confirm success and earlier exit codes, not root cause |
| Render active database path | Blockerat | Connector lacks environment-value reads; dashboard fallback requires sign-in; preserve /var/data/jarvis.db |
| Production DB not downloaded or tested | Klart | Only disposable local SQLite paths and generated test-owner credentials used |
| A: explicit production build and npm start | Klart | Blueprint build command and clean production verification |
| A: tsx available at actual server start | Klart | Runtime dependency; `node --import tsx` starts after dev dependencies are pruned |
| A: service/region/health/disk/path/secrets preserved | Redan korrekt | Existing repository settings retained; only build command added to Blueprint |
| A: dashboard/Blueprint difference | Klart | Dashboard already has the build command absent from main; PR codifies it. No active build/start/health/disk correction proposed |
| B: structured error and 401 session semantics | Klart | ApiError retains HTTP status; 401 clears immediately even with another request pending |
| B: network/5xx with retry | Klart | Initial unavailable screen or retained authenticated content with retry; no automatic command repost |
| B: 403 permission failure | Klart | Access-denied state; no logout |
| B: preserve content/drafts on temporary fetch failures | Klart | Client regression tests cover network, 503 and 403 |
| B: initial failure is not a false login screen | Klart | Unit tests and browser outage/retry scenario |
| B: late async responses cannot restore logged-out data | Klart | Generation guards, cancellation and late success/error/load tests |
| C: explicit user-before-reply ordering | Klart | Autoincrement sequence assigned inside command transaction |
| C: order survives reload/restart and identical timestamps | Klart | Multiple tied-timestamp pairs, GET and reopen tests, process-restart smoke |
| C: forward migration preserves existing messages | Klart | Legacy fixture checks every saved field and repeat startup |
| C: historical uncertainty documented | Klart | Timestamp then stored row order establishes a baseline; no inferred legacy pairs |
| C: exact current command pair returned | Klart | Transaction returns its own generated messages; future-dated historical row regression |
| C: backup/rollback compatibility rehearsal | Klart | Synthetic WAL backup and restore; actual old server fails Live on schema 2, works again after coordinated restore |
| C: production recovery readiness | Blockerat | No production backup or verified Render process-stop/restore path; explicit release gate in operations review |
| D: database Live/Demo boundary | Redan korrekt | Demo return precedes writes; Live-only table constraint retained and tested |
| D: client Live/Demo separation and labels | Klart | Separate lists and drafts; matching mode in history, task panel and request state |
| D: Demo never increases persistent tasks | Klart | DB snapshots/sequence unchanged by repeated Demo commands; browser count check |
| D: no persistent client Demo storage | Klart | In-memory state only; browser localStorage/sessionStorage remain empty |
| D: Demo cleared on reload/logout | Klart | New-controller, reload and logout tests |
| D: in-flight response tied to originating mode | Klart | Captured request mode; Live and Demo delay tests plus browser mode switch |
| E: clear all private session state | Klart | Lists, Demo, drafts, errors, busy/result state and login form lifecycle reset |
| E: failed logout remains visibly unconfirmed | Klart | Error/retry retains active state; tested network and browser 503 scenarios |
| F: actual task status mapped and validated | Klart | Existing `open` contract; parser validates stored value and triggers reject invalid new writes |
| F: unknown legacy status not silently rewritten | Klart | Preserved in migration; GET returns 500, with regression coverage |
| F: no task editing/completion/deletion | Klart | No such endpoints or controls added |
| G: readable important text and 16px inputs | Klart | Targeted rem-based type; computed input sizes checked in browser |
| G: central controls at least 44x44px | Klart | Computed active-button rectangles checked across reviewed viewports |
| G: visible focus and labels | Klart | Focus outline checked; labeled input, mode group/pressed state and navigation |
| G: larger text and no horizontal page overflow | Klart | 200% root font and long unbroken task title checks; natural vertical scrolling |
| G: composer/error reachable at reduced height | Klart | 360px-high browser viewport review and focused input; physical keyboard remains unverified |
| G: real pending/error states | Klart | LOADING, SAVING LIVE, RUNNING DEMO, SIGNING OUT, ACCESS DENIED and ERROR replace READY as applicable |
| G: all decorative animation respects reduced motion | Klart | Universal element/pseudoelement rule and computed-style browser check |
| G: animation pauses while document hidden | Klart | Visibility listener and paused CSS; event/property simulated in browser |
| Typecheck, regression tests, build and diff check | Klart | Final local gate; see verification section |
| Production installation/build/actual start | Klart | Separate runtime/db; dev dependencies removed before npm start |
| 390/430/820 empty and filled three-view review | Klart | Chromium matrix, screenshots visually reviewed, long history and errors exercised |
| Physical iPhone/iPad Safari keyboard and OS behavior | Blockerat | No physical device access in this environment |
| Optional WebKit engine review | Blockerat | Required system libraries unavailable; installation denied by execution environment |
| Durable source/commits and PR | Klart | GitHub work branch and real draft PR; no merge |
| Progress/setup and mobile next steps | Klart | Current docs distinguish source verification from observed hosting |
| Stay within stage; no production mutation | Klart | No providers, voice, trading, workflows or desktop features; no deploy/restart/settings/secret/data changes |

## Verification

- Baseline: 3 existing tests passed; typecheck and build passed. Earlier memories
  of larger test counts were not treated as evidence of the current checkout.
- Final regression suite: **31 passing tests** in 3 test files. Includes the
  existing tests and focused server/client cases listed above.
- `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`: passed.
- Production verifier: clean `NODE_ENV=production` installation with dev build
  tools, successful production build, prune dev dependencies, actual `npm start`,
  static page/health, owner login and Secure/HttpOnly/SameSite cookie, Live command,
  process restart and retained messages, Demo isolation, disabled registration,
  logout and subsequent 401. No production data or credentials used.
- Browser: Playwright 1.56.1, Chromium 141 in headless desktop emulation over a
  temporary local HTTPS proxy. Three views at 390/430/820px, empty and filled,
  30 synthetic tasks/60 messages plus delayed command scenarios. Additional
  checks cover 360px height, 200% root font, network error, initial 503, failed
  logout, 401, mode changes, focus, reduced motion and simulated visibility.
- Browser screenshots/results are outside the repository. They are verification
  artifacts, not source files or evidence of a real iPhone test.
- Recovery rehearsal: `node --import tsx scripts/verify-recovery.mjs` passed
  against actual baseline source. Consistent WAL backup, preserved rows/hash,
  migration/reopen, old server's healthy-but-unwritable state, offline restore,
  account isolation and post-backup data-loss boundary were checked locally.

## Operational limits and next action

**Not ready for production release.** The user confirmed My Workspace and the
existing service was inspected read-only. Active main commit is the PR's base,
with a successful live deploy from 6 October. Build/start/health/auto-deploy/disk
match the PR. The current dashboard build command was already correct; the PR
adds it to the Blueprint. No active configuration correction is needed for those
fields. Full evidence and exact remaining gates are in
[the operations review](RENDER_OPERATIONS_REVIEW.md).

Log queries returned no rows. Events identify earlier exit 127 deployments and
later success after a build-command change; the precise historical cause remains
unverified. Active DATABASE_PATH, runtime capacity, backup and Render recovery
access still require verification. Dashboard fallback requires separate sign-in.

Migration 2 is incompatible with old positional message INSERTs, even while
health reports 200. Use the documented native SQLite backup under a write freeze,
then a reviewed forward fix or coordinated offline data/code restoration. A
Render code rollback does not restore the disk. The production backup and
process-stop/restore procedure have not been executed; release remains blocked.
Unknown legacy task status remains an explicit error. Refresh Live data before
retrying a command whose response was lost, because automatic deduplication is
outside this stage.

On mobile: review PR #7 and the operations report, confirm only non-secret
database-path/log details, arrange the backup/recovery gate, then explicitly
approve any later release. Physical Safari checks remain. No merge, production
mutation or Etapp 2 work has been performed.
