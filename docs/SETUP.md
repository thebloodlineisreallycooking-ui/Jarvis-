# Setup and existing Render service

JARVIS is a private browser app for iPhone/iPad. The current command parser
supports task capture in English and Swedish; it is not a general AI assistant.
Groq, Fish Audio and native/desktop features are not integrated.

## Existing service: inspect before changing production

The user has previously opened JARVIS on Render. Use that existing service.
Do not create a replacement service or database from this document.

The 14 October read-only review matched the existing service to this repository.
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
| Database path | `DATABASE_PATH=/var/data/jarvis.db`; active environment value still needs confirmation |
| Runtime mode | `NODE_ENV=production` |
| Owner secrets | Existing `JARVIS_OWNER_USERNAME`, `JARVIS_OWNER_PASSWORD` |
| Auto-deploy | Blueprint currently declares `autoDeployTrigger: commit` |

The build requires dev dependencies even when `NODE_ENV=production`. `tsx` is a
runtime dependency and `npm start` runs `node --import tsx server/index.ts` in
production mode. Using the loader directly avoids the CLI's extra IPC process;
it was tested with dev dependencies removed. A successful Vite build alone does
not verify server startup. Keep Node within the declared `>=20.19 <25` range;
this work was verified on Node 24.19.0.

No Render settings or secrets were changed. In the user-confirmed **My Workspace**,
the service is live on `main` at `a21a3a9b4877ce31afc8eec28ae5557854f01b01`,
deploy `dep-db2k2kmi0phs738s20k0`, finished 6 October 2026 at 18:44:34 UTC.
Its build/start commands, healthcheck, region/plan, disk and auto-deploy match
the table. Main's Blueprint omits the build command, but the dashboard already
has it; PR #7 makes the source declaration consistent. No active build/start
setting change is proposed. The PR's application code is not deployed.

The connector returned no historical log rows. Events confirm earlier exit 127
deployments, then a successful deployment after a build-command change; they do
not establish which executable caused the old failures. Active environment
values and backup availability are not exposed by these read tools. Dashboard
fallback reached sign-in. Do not infer the actual DB location from its mount.
Preserve the existing service, disk and owner secrets; create no replacement.

## Mobile review and later production action

1. Open this work's GitHub PR in Safari and review **Files changed** and the
   verification report in `docs/ETAPP_1_REPORT.md`. No terminal is required.
2. Read `docs/RENDER_OPERATIONS_REVIEW.md`. In the existing Render service's
   **Environment** page, confirm only that `DATABASE_PATH=/var/data/jarvis.db`.
   Do not reveal owner credentials. Add any available non-secret historical
   build/start log lines from **Events/Deploys**; the connector returned none.
3. Keep PR #7 a draft and unmerged. Active auto-deploy is **On Commit** on main,
   so a merge can start production deployment. No production action is authorized
   by this documentation.
4. Arrange the separately approved maintenance window, native SQLite backup,
   secure backup destination and demonstrated offline restore access described
   in the operations review. Disk snapshots or the Render Rollback button do
   not establish a safe SQLite recovery path. Migration 2 runs during startup;
   old code is incompatible afterwards, even if healthcheck passes. A verified
   backup and matching old code must be restored together if reverting data.
5. After an approved release, check `/api/health`, sign in, create one intended
   Live task, refresh, test a Demo command, switch modes, and sign out. On actual
   iPhone/iPad Safari verify keyboard opening/closing, portrait/landscape, browser
   text scaling, safe areas and focus. Emulated viewport height is not a physical
   keyboard test.

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
restoration using synthetic temporary databases. It never reads DATABASE_PATH
or accepts a production database argument. This is not a production backup tool
and does not prove that Render Shell/restore access is available.

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
