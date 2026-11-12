# Samlad release: PR #7–9, schema 3

Kontrollpunkt 12 november 2026. **Förberedd och lokalt verifierad; inte utförd i produktion.**
Ägaren har godkänt merge av den förberedda kedjan. Det är inte godkännande att
installera det nya driftkitet, ändra Render, deploya, migrera, återställa eller
öppna appen. Dessa produktionsåtgärder ska beslutas som ett separat paket.
Detta dokument ersätter schema-2-releasedelen i [äldre körplan](RELEASE_RUNBOOK.md).
Backupuppdraget är klart; inga nya iSH-steg eller överföringar behövs nu.

## Exakta mål och lås

| Del | Värde |
| --- | --- |
| Workspace / tjänst | My Workspace / jarvis-private |
| Service / Blueprint | `srv-db1vle3bc2fs73em1t30` / `exs-db1vjsu7bikc73bt8gdg` |
| Region / plan / disk | Frankfurt / befintlig Starter / jarvis-data 1 GB, `/var/data` |
| Produktionsdatabas | `/var/data/jarvis.db` |
| Aktiv gammal kod | `a21a3a9b4877ce31afc8eec28ae5557854f01b01` |
| Installerat gammalt kit | `dade9b6c16df3e0ec61484e0ff10dd558744d695` |
| Förberett nytt kit | `3c8c7110a9d58200ad0333dc0278e5374355cb0a`, `schema3-capture-v1` |
| Verifierad samlad kodkandidat | `64aad39e4d515f4de8c45c97a3112fa3e4b3a8b4` |
| Build / health | `npm ci --include=dev && npm run build` / `/api/health` |
| Site | `https://jarvis-private-zobh.onrender.com` |

Kandidaten innehåller appkoden från samtliga tre PR:er. Efterföljande
körplansändringar är enbart dokumentation. Välj denna exakta kandidat i
**Deploy a specific commit**, inte automatiskt senaste main.

Render avläst 12 november: auto-deploy Off, Maintenance Mode på, start via gamla
kitets `maintenance.mjs`, live-deploy `dep-dbdnalcs728c73cic4qg` på gamla SHA:n.
Senaste fem deployer innehåller ingen pågående/köad deployment. Blueprint Auto
Sync No är tidigare ägarbekräftat, inte en ny connectoravläsning. Kontrollera det
igen inför produktionspaketet. Repositoryts `render.yaml` har `npm start` och
`autoDeployTrigger: commit`; dashboardens avsiktliga underhållsvärden ska bestå.
Ingen Blueprint Sync, återaktiverad automatik, ny tjänst, diskändring eller
hemlighets-/ägarändring ingår. Pre-deploy-command förblir tomt.

## Backup som redan är färdig

- ID: `backup-52746269-cf73-4e3c-85bc-fb4402f049d8`.
- Skapad `2026-11-09T15:05:34.202Z`; schema 1; snapshot 36864 byte, manifest 520 byte.
- SHA-256: `9dd80e4f8fac3fcec0e204b219d9fabd5d37b80f98a905be1de4951816a21e08`.
- Render: `/var/data/jarvis-backups/backup-52746269-cf73-4e3c-85bc-fb4402f049d8/`.
- iPhone/iSH: `/root/JARVIS-backuper/backup-52746269-cf73-4e3c-85bc-fb4402f049d8/`.

Båda kopiornas storlek/hash är verifierade genom ägarens terminalunderlag.
Render `verified: true`, iSH `snapshot.db: OK`. Filerna har 0400, katalogerna
0700. [Backupslutrapporten](PRODUCTION_BACKUP_STATUS.md) skiljer evidenskällorna.
Ingen databas eller detaljmanifest ska lämna dessa privata mål via chat/GitHub.

## Vad det nya kitet klarar

Det gamla kitet avvisar schema 3. Det nya kan validera och göra WAL-korrekt
`capture` av schema 1, 2 och 3, inklusive schema-3-tabellerna `conversations`
och `operations` samt slutförda uppgifter. Framtida/icke sammanhängande schema
eller oväntade tabeller avvisas. Baseline-`backup` kräver fortfarande gamla
kodrevisionen och schema 1. Befintligt backupmanifest fungerar oförändrat.

**Restore återgår endast till den godkända schema-1-baslinjen och gamla koden.**
Schema-3-capture är en verifierad separat bevarandekopia inför denna rollback;
den är inte ett stöd för automatisk schema-3→schema-3-restore. Efter återöppning
får man inte återställa november-9-backupen utan beslut om senare skrivningar
och eventuell dataräddning. Kitet kastar inte bort capture eller karantän.
Enbart kodrollback kan inte ersätta databasåterställning.

## Lokalt verifierat inför merge

På kandidatens källkod passerade `npm run typecheck`, **67 tester i 7 filer**,
`npm run build`, `git diff --check`, ren installation/build med NODE_ENV=production,
dev-pruning och faktisk serverstart via `scripts/verify-production.mjs`.
`node --import tsx scripts/verify-recovery.mjs` passerade med syntetiska databaser:
ursprungliga kitets WAL-backup, migration 1→3, sju tabellers bevarande inklusive
operationskvitton, processgrind, ogiltiga scheman, avbruten restore och återstart
under underhåll, återställd schema 1 samt gamla serverns skrivförmåga.

App/UI/server/kontrakt/paket/render.yaml är oförändrade mot PR #9:s tidigare
kodleverans. Dess 54 Chromium-fall och 36 kontrastpar är tidigare verifiering,
inte nya körningar i detta driftarbete. Fysisk Safari återstår. Inga tester har
skrivit till produktionen. Dokumentens shell-/Node-exempel syntaxkontrollerades. Baselinekontrollen
(godkänd oförändrad källa och avvisad ändring) samt intern acceptans kördes
med separata syntetiska databaser och lokalt startad server den 12 november.

## Produktionspaket efter separat godkännande

Appen är redan stängd. Planera ungefär 15–30 minuter för kitbyte, låst deploy,
kontroller och öppning, med 10–20 minuter extra reserv för rollback. Det är en
planeringsbedömning, inte ett uppmätt löfte; håll underhåll vid fel och rapportera
status direkt. Utför ett beroende steg åt gången och invänta dess utfall.

### 1. Kontrollera fryst utgångsläge

Läs tjänst/Blueprint och senaste deployer. Kräv Auto Sync No, auto-deploy Off,
Maintenance Mode på, gamla SHA:n och tomt pre-deploy-command. Inga köade/pågående
deployer. Bevara befintliga inställningar och originalbackup. Vid avvikelse:
stopp, utred; installera eller skapa inte en alternativ produktionsmetod.

Från tjänstens befintliga Shell/SSH, arbetskatalog `/opt/render/project/src`:

```sh
node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/client.mjs status
```

Kräv rätt service, gammal kod, rätt databasväg, `applicationStarted: false`,
`restorePending: false`, `busy: false`, stödd Node 20.19+ till och med 24.x.
Senast observerad runtime är Node 24.22.1; cirka 1 GB tillgängligt. Läs aktuell
storlek/utrymme igen genom kontrollen i steg 3. Saknad processinspektionsbehörighet
är ett stopp, inte skäl att kopiera en öppen databas.

### 2. Installera och aktivera endast det nya underhållsprogrammet

Verifiera nedanstående tre offentliga källfiler mot den låsta GitHub-committen.
Installationen öppnar inte databasen eller appen och lämnar gamla kitet kvar.

| Fil | SHA-256 |
| --- | --- |
| client.mjs | `ac9947b7040b07f4f935b3580086c1584034e516f25c5423f30809fa1c61674d` |
| database.mjs | `9a9405c899aa24186ee2dfa8fe96a9d5323a88922afef77dea739daef5640373` |
| maintenance.mjs | `e91843d664d38c57bd63a1e4e70a2d6284d476fcd3f4d7c98e60acf4548ddb68` |

```sh
node --input-type=module <<'NODE'
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
const check = (ok, message) => { if (!ok) throw Error(message); };
const kit = '3c8c7110a9d58200ad0333dc0278e5374355cb0a';
const expected = {
  'client.mjs': 'ac9947b7040b07f4f935b3580086c1584034e516f25c5423f30809fa1c61674d',
  'database.mjs': '9a9405c899aa24186ee2dfa8fe96a9d5323a88922afef77dea739daef5640373',
  'maintenance.mjs': 'e91843d664d38c57bd63a1e4e70a2d6284d476fcd3f4d7c98e60acf4548ddb68'
};
check(process.env.RENDER_SERVICE_ID === 'srv-db1vle3bc2fs73em1t30', 'Wrong service');
check(process.env.DATABASE_PATH === '/var/data/jarvis.db', 'Unexpected DATABASE_PATH');
check(fs.realpathSync('/var/data') === '/var/data', 'Unexpected disk path');
check(fs.readFileSync('/proc/self/mountinfo','utf8').split('\n').some(s => s.split(' ')[4] === '/var/data'), 'Disk not mounted');
process.umask(0o077);
const root = '/var/data/jarvis-ops', target = `${root}/${kit}`;
fs.mkdirSync(root, { recursive: true, mode: 0o700 });
check(fs.lstatSync(root).isDirectory() && !fs.lstatSync(root).isSymbolicLink() && fs.statSync(root).uid === process.getuid(), 'Unsafe operations directory');
fs.chmodSync(root, 0o700);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [];
for (const [name, checksum] of Object.entries(expected)) {
  const response = await fetch(`https://raw.githubusercontent.com/thebloodlineisreallycooking-ui/Jarvis-/${kit}/scripts/ops/${name}`);
  check(response.ok, 'Source download failed');
  const bytes = Buffer.from(await response.arrayBuffer());
  check(hash(bytes) === checksum, 'Source checksum mismatch');
  files.push([name, bytes]);
}
if (fs.existsSync(target)) {
  check(fs.realpathSync(target) === target, 'Unsafe kit location');
  for (const [name] of files) check(hash(fs.readFileSync(`${target}/${name}`)) === expected[name], 'Existing kit differs');
} else {
  const stage = `${root}/install-${randomUUID()}`;
  fs.mkdirSync(stage, { mode: 0o700 });
  for (const [name, bytes] of files) {
    const fd = fs.openSync(`${stage}/${name}`, 'wx', 0o400);
    try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  }
  const stagedDirectory = fs.openSync(stage, 'r');
  try { fs.fsyncSync(stagedDirectory); } finally { fs.closeSync(stagedDirectory); }
  fs.renameSync(stage, target);
  const fd = fs.openSync(root, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
console.log('Pinned operations kit installed; application unchanged.');
NODE
```

Sätt sedan tjänstens **Start Command** exakt till:

```sh
node /var/data/jarvis-ops/3c8c7110a9d58200ad0333dc0278e5374355cb0a/maintenance.mjs
```

Behåll Maintenance Mode på. Om sparandet startar en deploy: följ den först;
starta inte en konkurrerande. Annars välj **Deploy a specific commit** med
`a21a3a9b4877ce31afc8eec28ae5557854f01b01` för att aktivera den nya startvägen.
Kräv live innan nytt SSH-kommando. En vanlig restart får inte användas som
bevis att en ny Start Command har aktiverats; status måste visa rätt version.

```sh
node /var/data/jarvis-ops/3c8c7110a9d58200ad0333dc0278e5374355cb0a/client.mjs status
```

Kräv `operationsVersion: "schema3-capture-v1"` samt samtliga steg-1-värden.
Underhållsprogrammet är den enda startvägen, även efter omstart; det importerar
varken app eller migration. Processgrinden i nästa steg bekräftar att inga
DB-hållande processer finns. En publik underhållssida ensam räcker inte.

### 3. Bekräfta backupens aktualitet utan att göra om den

Kör i tjänstens repositoryrot, utan andra samtidiga driftkommandon. Detta läser
källan och den befintliga kopian, jämför fullständiga rader/schema i minnet och
skriver endast ett säkert godkänt/underkänt besked. Inga rader eller hemligheter
skrivs ut. Förändrad källa innebär stopp och nytt backupbeslut, inte automatisk
överskrivning av november-9-backupen.

```sh
node --input-type=module <<'NODE'
import * as fs from 'node:fs';
import { productionConfiguration, loadDatabase, assertNoDatabaseUsers, verifyBackup, BASE_COMMIT } from '/var/data/jarvis-ops/3c8c7110a9d58200ad0333dc0278e5374355cb0a/database.mjs';
import { operation } from '/var/data/jarvis-ops/3c8c7110a9d58200ad0333dc0278e5374355cb0a/client.mjs';
const check = (ok, label) => { if (!ok) throw Error(label); };
try {
  const config = productionConfiguration();
  const status = await operation(config.controlFile, 'status');
  check(status.operationsVersion === 'schema3-capture-v1' && status.deployedCommit === BASE_COMMIT && status.serviceId === config.serviceId && status.databasePath === config.db, 'Wrong runtime');
  check(!status.applicationStarted && !status.busy && !status.restorePending, 'Maintenance not ready');
  assertNoDatabaseUsers(config);
  const Database = loadDatabase();
  const { path, manifest } = await verifyBackup(config, Database, 'backup-52746269-cf73-4e3c-85bc-fb4402f049d8');
  check(manifest.sha256 === '9dd80e4f8fac3fcec0e204b219d9fabd5d37b80f98a905be1de4951816a21e08' && manifest.bytes === 36864 && manifest.schema === 1 && manifest.sourceCommit === BASE_COMMIT, 'Wrong baseline');
  const size = ['', '-wal', '-shm'].reduce((n, suffix) => n + (fs.existsSync(config.db + suffix) ? fs.statSync(config.db + suffix).size : 0), 0);
  check(BigInt(status.availableBytes) >= BigInt(64 * 1024 * 1024 + 4 * size), 'Insufficient disk space');
  const source = new Database(config.db, { readonly: true, fileMustExist: true });
  let copy;
  try {
    copy = new Database(path, { readonly: true, fileMustExist: true });
    check(JSON.stringify(source.pragma('integrity_check')) === '[{"integrity_check":"ok"}]' && source.pragma('foreign_key_check').length === 0, 'Invalid source');
    const schemaSql = "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*' ORDER BY type,name";
    check(JSON.stringify(source.prepare(schemaSql).all()) === JSON.stringify(copy.prepare(schemaSql).all()), 'Source schema changed');
    for (const table of ['accounts','sessions','tasks','messages','schema_migrations']) {
      check(JSON.stringify(source.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()) === JSON.stringify(copy.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()), 'Source rows changed');
    }
  } finally { copy?.close(); source.close(); }
  assertNoDatabaseUsers(config);
  console.log('PASS: source equals verified schema-1 backup; no database holders; disk space sufficient.');
} catch { console.error('STOP: baseline preflight failed; keep maintenance; no migration or new backup.'); process.exitCode = 1; }
NODE
```

### 4. Deploya kandidatfilerna under fortsatt rent underhåll

Välj **Deploy a specific commit** `64aad39e4d515f4de8c45c97a3112fa3e4b3a8b4`.
Start Command är fortfarande nya kitets rena `maintenance.mjs`. Build kör inga
migrationer. Vänta på live och kontrollera status igen: exakt kandidat-SHA,
version `schema3-capture-v1`, app false, busy false, restorePending false.
Stopp vid fel; återställ inte databas för ett rent byggfel.

### 5. Avsiktlig första appstart och migration

Först nu, inom samma separat godkända releasepaket, sätt Start Command till:

```sh
if [ "$RENDER_GIT_COMMIT" = "64aad39e4d515f4de8c45c97a3112fa3e4b3a8b4" ] && [ -s /var/data/jarvis.db ] && [ ! -e /var/data/jarvis-ops/restore-pending.json ]; then npm start; else exec node /var/data/jarvis-ops/3c8c7110a9d58200ad0333dc0278e5374355cb0a/maintenance.mjs; fi
```

Aktivera med exakt samma kandidat om sparandet inte redan gör det. Starten kör
migrationerna 1→2→3. Maintenance Mode ska fortfarande blockera publika anrop.
Starta inte appen manuellt parallellt i SSH. Bekräfta rätt deploy/commit, schema
1,2,3 i `schema_migrations`, integritet och foreign keys med readonly SQLite
utan import av app/migrator. Health `ok` räcker inte ensam.

Följande interna kontroll läser autentiserade API:er och skapar sedan avslutar
en ägarsession; den skapar inga uppgifter eller kommandon. Credentials tas
endast från befintliga servervariabler och skrivs aldrig ut. Kör bara efter
den godkända appstarten, i repositoryroten:

```sh
node --input-type=module <<'NODE'
import Database from 'better-sqlite3';
const check = (ok, label) => { if (!ok) throw Error(label); };
let cookie;
const url = `http://127.0.0.1:${process.env.PORT || 10000}`;
const headers = { 'Content-Type': 'application/json', Origin: process.env.JARVIS_ORIGIN || url.replace('http:', 'https:') };
const call = (path, options = {}) => fetch(url + path, { ...options, headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) }, signal: AbortSignal.timeout(10000) });
try {
  check(process.env.RENDER_SERVICE_ID === 'srv-db1vle3bc2fs73em1t30' && process.env.RENDER_GIT_COMMIT === '64aad39e4d515f4de8c45c97a3112fa3e4b3a8b4' && process.env.DATABASE_PATH === '/var/data/jarvis.db', 'Wrong runtime');
  const db = new Database(process.env.DATABASE_PATH, { readonly: true, fileMustExist: true });
  try {
    check(JSON.stringify(db.prepare('SELECT version FROM schema_migrations ORDER BY version').pluck().all()) === '[1,2,3]', 'Wrong schema');
    check(JSON.stringify(db.pragma('integrity_check')) === '[{"integrity_check":"ok"}]' && db.pragma('foreign_key_check').length === 0, 'Invalid database');
  } finally { db.close(); }
  check((await (await call('/api/health')).json()).status === 'ok', 'Health failed');
  const login = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: process.env.JARVIS_OWNER_USERNAME, password: process.env.JARVIS_OWNER_PASSWORD }) });
  check(login.status === 200, 'Login failed');
  const setCookie = login.headers.get('set-cookie') || '';
  cookie = setCookie.split(';')[0];
  check(/HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie) && /SameSite=Strict/i.test(setCookie), 'Cookie flags failed');
  for (const path of ['/api/tasks', '/api/conversations']) check((await call(path)).status === 200, 'Private API failed');
  const response = await call('/api/capabilities');
  check(response.status === 200, 'Capabilities failed');
  const caps = await response.json();
  check(['chat','transcription','speech'].every(key => caps[key]?.state === 'unconfigured'), 'Providers unexpectedly enabled');
  check((await call('/api/auth/logout', { method: 'POST' })).status === 204, 'Logout failed');
  check((await call('/api/tasks')).status === 401, 'Session still valid');
  cookie = undefined;
  console.log('PASS: schema 3, integrity, health, owner login, private reads, disabled providers and logout.');
} catch {
  console.error('STOP: internal acceptance failed; keep public maintenance and investigate.'); process.exitCode = 1;
} finally {
  if (cookie) { try { await call('/api/auth/logout', { method: 'POST' }); } catch { console.error('Session cleanup not confirmed.'); } }
}
NODE
```

Varken providers eller nya workflows ska aktiveras. Om kontrollen misslyckas:
rapportera app-/schemastatus och välj antingen fortsatt felsökning under publik
spärr eller uttryckligen godkänd rollback nedan. Kör inte gamla servern på schema 3.

### 6. Öppna och kontrollera fysisk Safari

Efter godkänd intern kontroll: stäng av enbart Render Maintenance Mode enligt
releasebeslutet. Auto Sync och auto-deploy förblir av. På ägarens iPhone/iPad:
login, tre vyer, tangentbord/composer, lång historik, fokus/VoiceOver, större
OS-text/zoom, safe areas, fel och session. Ett medvetet syntetiskt Live-kommando
ska skapa exakt en uppgift och ett ordnat meddelandepar; reload ska bevara dem.
Demo får inte öka Live-antalet. Ingen mikrofon eller riktig provider ingår.
Bekräfta bara den avsedda testuppgiften före eventuell radering. Rapportera vad
som faktiskt testats på vilken enhet; Chromium/kort höjd är inte iPhone-tangentbord.

## Rollback — endast efter uttryckligt beslut för aktuell situation

1. Sätt Render Maintenance Mode på. Pausa all annan administration. Sätt
   **Start Command tillbaka till exakt det rena nya underhållskommandot i steg 2**.
   Aktivera med den nu driftsatta kandidaten om sparandet inte startar deploy.
   Vänta på live. Diskens gamla appinstans måste vara ersatt. Läs `client.mjs
   status`: version schema3-capture-v1, app false, busy false, pending false
   (pending true tillåts endast när samma påbörjade restore återupptas).
   Vid varje omstart körs endast underhåll. Att bara slå på en webbsida eller
   döda en PID är inte skrivstopp.
2. Bevara det nuvarande tillståndet med nya kitets `capture`. Den vägrar köra om
   någon process håller DB/sidofiler eller om restore redan pågår. Kör inte om
   en redan verifierad capture. Om en restore redan pågår, fortsätt steg 3 med
   samma original-ID och dess befintliga journal; skapa inte ny capture.

   ```sh
   node /var/data/jarvis-ops/3c8c7110a9d58200ad0333dc0278e5374355cb0a/client.mjs capture srv-db1vle3bc2fs73em1t30
   ```

   Anteckna returnerat backup-ID, bytes, schema och hash privat. Kör `verify`
   med just det returnerade ID:t och service-ID:t, inte ett gissat ID. Behåll
   snapshot/manifest på privata disken; välj separat privat SFTP-kopia vid behov.
   Om capture misslyckas: stopp, ingen restore eller alternativ filkopiering.
3. Återställ endast den färdiga baseline-backupen. Detta innebär att alla
   skrivningar efter backupens tidpunkt försvinner från den aktiva databasen.
   Capture och karantän bevaras. Före öppning är de nya skrivningarna begränsade
   till migration/acceptanssession; efter öppning krävs separat bedömning av
   användardata. Beslutet måste uttryckligen acceptera den aktuella dataeffekten.

   ```sh
   node /var/data/jarvis-ops/3c8c7110a9d58200ad0333dc0278e5374355cb0a/client.mjs restore backup-52746269-cf73-4e3c-85bc-fb4402f049d8 srv-db1vle3bc2fs73em1t30
   ```

   Kräv `restored: true`, schema 1, requiredCodeCommit `a21a3a9...`, app false.
   DB/WAL/SHM bevaras tillsammans i privat karantän. Kitet journalför/byter
   atomiskt och kontrollerar hash/schema innan journalen tas bort. Vid avbrott:
   lämna rena underhållsstarten, kör samma restorekommando igen efter status;
   ingen appstart eller manuell borttagning av journal/sidofiler.
4. Deploya **gamla exakta SHA:n** `a21a3a9b4877ce31afc8eec28ae5557854f01b01`
   under fortsatt rent nytt underhåll. Verifiera status och schema 1. Först
   därefter sätt den uttryckligen låsta gamla appstarten:

   ```sh
   if [ "$RENDER_GIT_COMMIT" = "a21a3a9b4877ce31afc8eec28ae5557854f01b01" ] && [ -s /var/data/jarvis.db ] && [ ! -e /var/data/jarvis-ops/restore-pending.json ]; then npm start; else exec node /var/data/jarvis-ops/3c8c7110a9d58200ad0333dc0278e5374355cb0a/maintenance.mjs; fi
   ```

   Aktivera samma gamla SHA, bekräfta health, gammalt login och gamla API-kontrakt
   enligt schema-2-planens rollbackkontroll. Öppna först efter godkänt resultat.
   Behåll automatiken av och alla original/backuper/karantäner.

Om Render-baseline saknas men iPhone-kopian finns: använd befintlig verifierad
SFTP-väg direkt mellan telefon och tjänst till en ny privat stagingkatalog,
verifiera storlek/hash mot tabellen och återetablera baselinefoldern utan att
skriva över något. Håll underhåll och fatta ett separat återhämtningsbeslut;
skicka aldrig filerna genom agentmiljö, chatten, GitHub eller publik länk.

## Vad som återstår före GroqCloud/Fish Audio

Ingen ytterligare bred feature-etapp eller UI-ombyggnad behövs före integration.
För produktionsgrunden återstår separat godkänt paket ovan och fysisk Safari
med åtgärd av eventuella verkliga fel. Därefter: avgränsad providerimplementation
enligt [PROVIDER_HANDOFF](PROVIDER_HANDOFF.md), säkra servercredentials,
aktuella modell-/voice-ID:n, kostnadsgränser, validerad faktisk ljudlängd/codec,
användarstyrd mikrofon/uppspelning, verkliga providerprov och fysisk Safari.
Dessa är integrationsarbetet, inte redan levererade funktioner. Ingen autonom
verktygsmotor, trading, companion eller fler workflows krävs för detta steg.

## Plattformskällor kontrollerade 11 november 2026

- [Render deploys](https://render.com/docs/deploys): specifik commit och deploylivscykel.
- [Persistent disks](https://render.com/docs/disks): beständig montering, en instans åt gången, avbrott vid byte.
- [Maintenance Mode](https://render.com/docs/maintenance-mode): blockerar publik trafik, lämnar processen körande och SSH tillgängligt.

Plattformsunderhåll ersätter därför aldrig det rena underhållsprogrammet och
processgrinden. Renders diskgenerella snapshots ersätter inte SQLite-backupen.
