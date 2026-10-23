# Progress

## Produktionsbackup: automatiken pausad — 23 oktober 2026

Blueprint Auto Sync No är bekräftat av ägaren. Auto-deploy Off är dessutom
direkt verifierat med Render-connectorn på rätt tjänst. Gammal live-commit,
`npm start` och underhåll av kvarstår; inga aktiva/köade deployer syns i de fem
senaste resultaten. Backup och driftkitinstallation återstår. Nästa steg är
en läsande kontroll via iSH före installation, utan databasöppning.
Se [aktuell kontrollpunkt](PRODUCTION_BACKUP_STATUS.md). Inga kodändringar,
migrationer, PR-deployer eller merge har utförts i denna uppföljning.

## Produktionsbackup godkänd, väntar på dashboardåtkomst — 22 oktober 2026

Ägaren har godkänt driftkit, paus av automatiken, särskilt underhåll och verifierad
backup på Render/iPhone; kodlås på telefonen är bekräftat. Tidigare besked nedan
om saknat godkännande eller enhetslås är därmed historiska.
[Sanerad kontrollpunkt](PRODUCTION_BACKUP_STATUS.md) dokumenterar exakt scope,
kontrollerade källhashar, driftläge och nästa steg. Connectorn visar fortfarande
gammal live-commit, `npm start`, auto-deploy på och underhåll av. Säker
dashboardinloggning returnerade `declined`; inga produktionsändringar utfördes.
Ingen backup, migration, merge eller PR-deployment har körts. PR #7 förblir draft.
Endast dokumentation ändras här; full testsvit upprepas inte.
Kontrollpunkten sparades externt som `ebd38a32ca5066d25d73d6bc36b3ffe0fedba94c`.
Efter ny fortsättningsinstruktion återupptogs säker inloggning via GitHub/Google;
Google-kontovalet returnerade `declined`. Driftläget är fortsatt oförändrat av
detta arbete. Nästa manuella steg är en aktuell avläsning av Blueprint Auto Sync.

## Åtkomstkontroll 22 oktober 2026 — aktuell status

Denna status ersätter tidigare öppna åtkomstpunkter nedan. Underlaget är
användartillhandahållna terminalbilder från iSH på iPhone, inte en ny direkt
connectoravläsning. Inga bilder, nycklar, loggfiler eller databaser sparas i repot.

- 21 oktober: SSH inloggning och separat SFTP `pwd`/`bye` lyckades mot
  `srv-db1vle3bc2fs73em1t30@ssh.frankfurt.render.com`. SFTP visade
  `/opt/render/project/src`; inga filer överfördes. Användaren hade registrerat
  sin publika SSH-nyckel själv. Privat nyckel/lösenfras stannar på enheten.
- Runtime: rätt service-ID, commit `a21a3a9b4877ce31afc8eec28ae5557854f01b01`,
  `DATABASE_PATH=/var/data/jarvis.db`, Node `v24.21.0`. `df -h` visade
  `/var/data` monterad, 958 MiB tillgängligt (avrundat). PR #7 var inte driftsatt.
- iSH på ägarens **iPhone** rapporterade 171,5 GiB tillgängligt (avrundat).
  Backupmålet är `/root/JARVIS-backuper/<backup-id>/` på denna enhet; iPad krävs
  inte. Ingen backupmapp eller backup har skapats genom dessa kontroller.
- 22 oktober: `sameUserProcReadable: true`, `processInspectionErrors: []`,
  `databaseHolderProcesses: 1`. Behörighetskontrollen passerade. Ett öppet
  DB-handtag är väntat under drift; backup/restore kräver fortfarande noll
  DB-hållande processer i det särskilda underhållsläget.
- Frankfurt-fingeravtrycket matchades mot Renders officiella SSH-dokumentation
  före acceptans. Klienten visade också `client_global_hostkeys_private_confirm:
  server gave bad signature for ED25519 key 0`. SSH/SFTP fungerade trots detta;
  orsaken är inte fastställd. Ingen host-key-kontroll har stängts av.
- En interaktiv session bröts med `Broken pipe`. De efterföljande direkta
  SSH-kommandona lyckades. Håll iSH i förgrunden och kör varje kontroll som ett
  komplett fjärrkommando; en lokal `localhost`-prompt är inte Render.

**Kvar före produktionsbeslut:** bekräfta skärmlås med kod på backuptelefonen.
Därefter kan det redan dokumenterade förslaget läggas fram för separat beslut.
Installerat driftkit, produktionsbackup, ändrade driftinställningar, merge och
deployment är fortfarande inte godkända eller utförda av detta arbete.
En verklig backup med verifierad hash på båda målen krävs före migration.
Fysisk Safari kontrolleras efter separat godkänd deployment.

Föreslagen kodrelease/driftkit är oförändrad:
`dade9b6c16df3e0ec61484e0ff10dd558744d695`. Återställning använder schema-1-backup
med `a21a3a9b4877ce31afc8eec28ae5557854f01b01`, under det exakta
underhållsstartkommando som anges i [körplanen](RELEASE_RUNBOOK.md).
Endast dokumentation ändrades i denna uppföljning; inga testsviter upprepades.

## Current scope — Etapp 1: stable foundation

Updated 19 October 2026. The requested source corrections and executable
backup/restore preparations are implemented and locally verified. Actual Render
DATABASE_PATH, Node and free space were verified on 15 October. The user
reported Blueprint Auto Sync = Yes on 19 October. Remaining access gates are
process-inspection permissions and the owner's private iPad/SFTP destination. Production operations remain unapproved and unperformed.
Physical Safari belongs after separately approved deployment; unavailable old
connector logs do not block release. No next-stage capabilities added.

## Verified source and GitHub delivery

- Full git clone based on `main` commit
  `a21a3a9b4877ce31afc8eec28ae5557854f01b01` (merged PR #6).
  GitHub and local refs matched; `main` was unchanged when rechecked on 15 October.
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
- Verified operations-kit checkpoint:
  `dade9b6c16df3e0ec61484e0ff10dd558744d695`, tree
  `e5baaf2f89dd81b0d8285f2b30f9718c471ac75b`. This is the pinned proposed code
  release; the subsequent runbook checkpoint changes documentation only.

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
  followed by success after a build-command change. Connector log queries
  returned zero rows. The user supplied the earlier sequence `Empty build
  command; skipping build` then `tsx: not found`; this is explicitly attributed
  user evidence, not recovered connector output. Old log absence is not a gate.
- Secure browserAuth sign-in and user device approval succeeded on 15 October.
  Existing instance `6hxdk` reported the expected service ID/baseline SHA,
  `DATABASE_PATH=/var/data/jarvis.db`, Node `v24.21.0`, mounted `/var/data`, and
  `1003794432` bytes free. DB/WAL/SHM file sizes were 4096/61832/32768 bytes;
  the conservative backup requirement was 67503648 bytes. No DB was opened.
- The signed-in service links to Blueprint `exs-db1vjsu7bikc73bt8gdg`. The user
  reported Auto Sync = Yes on 19 October; this is attributed dashboard evidence.
  The extra /proc-permission probe result remains unverified. The browser
  session ended; supported reauthentication timed out and a fresh service page
  showed sign-in. Previously captured runtime evidence remains valid for its
  observation time. Shell indicated SSH needs a registered public key; no
  successful owner-device SFTP connection or backup destination is claimed.
- No new successful HTTP health/in-app production test is claimed from the
  Render `live` status. Only whitelisted runtime values and filesystem metadata
  were read; no secrets or database rows were retrieved.
- No production deploy, restart, merge, settings/secret/owner change, resource
  creation or database-content read/download/write was performed.

## Review handoff

Open PR #7, `docs/RENDER_OPERATIONS_REVIEW.md` and `docs/RELEASE_RUNBOOK.md`.
The latter gives executable pinned source installation, exact maintenance-only
start and commit guards, native consistent backup, direct owner-iPad transfer,
release smoke and resumable offline recovery paired with old code. A restart
during restore starts maintenance again, never the application. The approved
synthetic recovery exercise now exercises these actual operations functions.

Keep the draft unmerged. Next single dashboard action: open jarvis-private →
Shell and confirm that the terminal is visible. Change no settings. Then
complete the documented read-only process-permission and owner-device/SFTP
access checks. The proposed backup target is private iSH storage on the owner's
passcode-protected iPad, not GitHub/chat/public storage. No backup has been made.
Only after access prerequisites are resolved should the owner decide on the
concrete production plan and 30-minute window. A verified backup on both targets
must precede merge/migration. Physical Safari follows separately approved
deployment. Restore loses post-backup changes and can revive older sessions;
normal use stays frozen through acceptance. Etapp 2 is not started.


## Release preparation checkpoint — 14 October 2026

- Added runtime-only operations in `scripts/ops/`: a maintenance HTTP listener
  that never imports the app or migrations, authenticated loopback control,
  native SQLite backup/verification and resumable offline restoration. The
  production entry points are fixed to the existing service and database path.
  No operations tool has been installed or run on Render.
- Reused and extended `scripts/verify-recovery.mjs` with the same synthetic
  baseline exercise. It now calls the actual operations implementation, rejects
  an open database, wrong service/owner, damaged backups and invalid IDs, and
  checks maintenance-only responses and private control authentication.
  Interrupted restore after quarantine (including committed WAL/SHM) and after
  atomic installation both resume successfully without starting the app.
- Focused recovery verification and JavaScript syntax/diff checks pass. The
  previous 31-test/application/build/browser evidence remains valid; no full
  application suite was repeated for these independent operations scripts.
  The executor restricts inspection of other processes' `/proc` entries: the
  local process-guard fixture uses the real test process's descriptors. The
  production command still inspects all same-user processes and fails closed
  if it lacks permission. Its actual Render permission check remains a gate
  before backup/migration, not an assertion that runtime access was tested.
- Read-only service metadata was rechecked and is unchanged. The supported
  browser authentication flow offered Google; after the user's choice it
  encountered `502 / Connection refused`. No authenticated Render dashboard
  session was verified at that checkpoint. This access limitation was superseded
  by the successful 15 October runtime observation recorded above.
- The user supplied historical lines `Empty build command; skipping build`
  followed by `tsx: not found`. This is user-provided evidence, not recovered
  connector output. Missing old connector logs are not a release blocker.
- Physical Safari verification belongs after a separately approved deployment,
  since this PR has no mobile-accessible preview. No paid preview is proposed.
- A pinned, executable release runbook follows in the documentation checkpoint.
  It specifies the existing service, commit-guarded start commands, an owner-only
  iPad backup target through SSH/SFTP, release checks and the exact rollback.
  Backup/settings/merge/deploy remain unapproved and unperformed.

## Release runbook checkpoint — 15 October 2026

- Finished `docs/RELEASE_RUNBOOK.md` and reconciled setup, operations review and
  requirement report with observed runtime facts and remaining access gates.
  All five documentation files are saved together on the same branch/PR.
- The proposed code release and operations-kit hashes remain pinned to `dade9b6...`.
  This checkpoint changes no application or operations implementation. Shell
  snippets and embedded Node programs are syntax-checked; kit hashes and API
  expectations are checked against that pinned source, and `git diff --check`
  passes. The existing full suite and recovery rehearsal were not rerun for
  documentation-only edits.
- The installer, backup, device transfer, setting changes, merge, migration,
  smoke write and restore are proposals only. Read-only runtime inspection is
  the only production action performed. Remaining authorization boundaries are
  explicit; no data or credentials are attached to the public repository.

## Auto Sync checkpoint — 19 October 2026

- The user answered Yes to the explicit question about the linked Blueprint's
  Auto Sync setting. Recorded as user-provided dashboard evidence, not an
  independent live-tool observation or production authorization.
- Updated all five release documents on the existing branch and PR #7. The
  pinned code release and maintenance/backup/restore implementation are unchanged.
- Next step is opening the existing service's Shell for the read-only process
  permission check. Private iPad/SFTP access remains unverified.
- Documentation diff check passes. No test suite rerun for this factual update;
  no Render settings, backups, database operations, merge or deployment performed.
