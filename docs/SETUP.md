# Setup and existing Render service

JARVIS is a private browser app for iPhone/iPad. The current command parser
supports task capture in English and Swedish; it is not a general AI assistant.
Groq, Fish Audio and native/desktop features are not integrated.

## Existing service: inspect before changing production

The user has previously opened JARVIS on Render. Use that existing service.
Do not create a replacement service or database from this document.

The 14 October read-only review matched the existing service to this repository;
authenticated Shell metadata completed the runtime check on 15 October.
See [observed values, evidence and release gates](RENDER_OPERATIONS_REVIEW.md).
The repository declares the following expected configuration:

| Setting | Expected value |
| --- | --- |
| Repository | `thebloodlineisreallycooking-ui/Jarvis-` |
| Production branch | `main`, observed in Render |
| Service | `jarvis-private`, repo match verified, `srv-db1vle3bc2fs73em1t30` |
| Region / plan | `frankfurt` / `starter`, preserve existing service values |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Health check | `/api/health` |
| Persistent disk | Existing `jarvis-data`, 1 GB, mount `/var/data` |
| Database path | `DATABASE_PATH=/var/data/jarvis.db`, active value verified in Shell |
| Runtime mode | `NODE_ENV=production` |
| Owner secrets | Existing `JARVIS_OWNER_USERNAME`, `JARVIS_OWNER_PASSWORD` |
| Auto-deploy | Blueprint currently declares `autoDeployTrigger: commit` |

The build requires dev dependencies even when `NODE_ENV=production`. `tsx` is a
runtime dependency and `npm start` runs `node --import tsx server/index.ts` in
production mode. Using the loader directly avoids the CLI's extra IPC process;
it was tested with dev dependencies removed. A successful Vite build alone does
not verify server startup. Keep Node within the declared `>=20.19 <25` range;
local application verification used Node 24.19.0. Actual Render runtime was
`v24.21.0`, with `1003794432` bytes free on mounted `/var/data` on 15 October.
The conservative backup space requirement then was `67503648` bytes. Recheck
available space before release; the tools also enforce their own space checks.

No Render settings or secrets were changed. In the user-confirmed **My Workspace**,
the service is live on `main` at `a21a3a9b4877ce31afc8eec28ae5557854f01b01`,
deploy `dep-db2k2kmi0phs738s20k0`, finished 6 October 2026 at 18:44:34 UTC.
Its build/start commands, healthcheck, region/plan, disk and auto-deploy match
the table. Main's Blueprint omits the build command, but the dashboard already
has it; PR #7 makes the source declaration consistent. No active build/start
setting change is proposed. The PR's application code is not deployed.

The connector returned no historical log rows. The user supplied the earlier
sequence `Empty build command; skipping build` then `tsx: not found`; it is
recorded as user-provided evidence, not connector-recovered output. Missing
old log rows do not block release. The current dashboard build command is
already correct. Secure browserAuth sign-in succeeded on 15 October and the
active DATABASE_PATH, Node and free space were read from the existing instance.
Only filesystem metadata was read; no SQLite connection or backup was opened.
The service is managed by Blueprint `exs-db1vjsu7bikc73bt8gdg`. On 19 October
the user reported Auto Sync = Yes from the dashboard. This is attributed user
evidence, not a new connector observation or authorization to change it.
The process-permission probe remains unverified: the session ended and secure
reauthentication timed out. Shell indicated SSH needs
a public key; a working owner-device SFTP connection has not been established.

## Mobile review and later production action

1. Review [PR #7](https://github.com/thebloodlineisreallycooking-ui/Jarvis-/pull/7),
   [the operations review](RENDER_OPERATIONS_REVIEW.md) and the pinned
   [executable release runbook](RELEASE_RUNBOOK.md). Next single dashboard action:
   open **jarvis-private → Shell** and confirm that the terminal is visible.
   Change no settings. The subsequent read-only process-permission check and
   owner-device access preparation are specified in the runbook.
2. The proposed private off-disk backup target is the owner's passcode-protected
   iPad, local iSH `/root/JARVIS-backuper/<backup-id>/`. The runbook identifies
   SSH/SFTP permissions, source installation, transfer and hash checks. No
   database may enter GitHub, this chat, a public link or a new paid service.
3. Keep PR #7 draft and unmerged until the remaining access prerequisites and a
   separate production decision are complete. The production plan temporarily
   disables auto-deploy and the linked Blueprint's Auto Sync, replaces the start command
   with a maintenance-only listener and obtains/verifies the native backup
   before merge or migration. This is an intentional temporary operational
   change, not a correction of today's already valid build/start settings.
4. Use the exact commit guards and resumable restore commands in the runbook.
   Maintenance never starts JARVIS; a restart remains in maintenance. Restore
   quarantines DB/WAL/SHM and pairs schema 1 with the exact old source. Render
   Rollback does not restore disk data and can reinstate an unsafe start command.
5. Physical iPhone/iPad Safari acceptance happens **after a separately approved
   deployment** to the existing service. There is no mobile-accessible PR preview.
   Check real keyboard opening/closing, portrait/landscape, text scaling, safe
   areas, focus and short-height reachability. Emulation is not a keyboard test.

No production backup, installation, setting change, merge or deploy has been
performed. The runbook estimates a 30-minute maintenance window, subject to
actual size/access, and gives the complete release and rollback order.

Production startup provisions the owner only for an empty database, disables
registration, and requires later startups to match that sole username. Changing
the password environment variable does not change an existing password. This
stage does not rotate credentials or alter the production owner.

## Local verification

Use a disposable test database, never `/var/data/jarvis.db` or a downloaded
production database.

```sh
npm ci --include=dev
npm run typecheck
npm test
npm run build
git diff --check
node scripts/verify-production.mjs
node --import tsx scripts/verify-recovery.mjs
```

The production verification script creates a temporary runtime copy and random
owner credentials. With `NODE_ENV=production`, it installs and builds, removes
dev dependencies, starts the real npm start command, verifies the static page,
health/login/cookie/command endpoints, restarts the process and checks persistence,
then verifies Demo and logout. It cleans up temporary data and never prints the
credentials. It does not alter the working checkout's installed dependencies.

The recovery verifier reads the pinned baseline source from local git history
and rehearses WAL backup, migration, old-code incompatibility and offline
restoration using synthetic temporary databases. It now exercises the actual
`scripts/ops/` implementation, including private control and interrupted restore
recovery. It never reads DATABASE_PATH or accepts a production database argument.
The separate operations CLI is fixed to the existing Render service/path and
requires the maintenance listener. Its commands are in the runbook. The local
process-inspection fixture covers real test-process descriptors; full same-user
/proc access must pass on Render before any backup/migration. It fails closed.
For this operations-only follow-up, rerun the recovery verifier, syntax and diff
checks; the earlier complete application suite need not be repeated.

The browser script starts a separate production server and local HTTPS proxy with
a temporary certificate. Build first. Playwright is a verification-only external
tool; it is not required by the application. With Playwright installed outside the
repo and its browsers/system libraries available:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.js \
JARVIS_REVIEW_ENGINES=chromium \
JARVIS_REVIEW_OUTPUT=/tmp/jarvis-etapp-1-review \
node scripts/verify-browser.mjs
```

Use `JARVIS_REVIEW_ENGINES=chromium,webkit` where both engines are available.
Screenshots and results must stay outside the repository. The script creates only
synthetic test content and does not access Render. Reduced height, 200% root text
and simulated visibility events do not verify every Safari/OS accessibility
setting or real keyboard behavior.

## Data behavior and recovery limits

Migration 2 assigns a durable, unique, auto-incrementing message sequence. For
legacy rows it uses timestamp then existing SQLite row order (`rowid`) to settle
ties. It cannot reconstruct unknown historical chronology or prove which older
reply belongs to a command. New pairs are inserted user first in one transaction,
listed by sequence, and returned directly from that same transaction.

The current task contract supports only `open`. Mapping parses the actual stored
status and new writes are validated by SQLite triggers. An unsupported historical
status is preserved and produces a server error instead of being hidden. Such
legacy data needs a deliberate, separately reviewed correction.

401 clears session-bound client data; 403 is an access error. Network/5xx failures
preserve content/drafts and offer retry. A failed command might have reached the
server even if its response was lost. Refresh Live data before resending; commands
are not automatically retried and this stage does not add idempotency keys.
Demo data/drafts are held only in memory and disappear on reload or confirmed
logout/session expiry. Failed logout remains visibly unconfirmed.
