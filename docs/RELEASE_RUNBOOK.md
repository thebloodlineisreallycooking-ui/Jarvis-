# Etapp 1 — körplan för backup, release och återställning

## Aktivt backupgodkännande 22 oktober 2026

Ägaren har nu godkänt driftkit, pausad automatik, särskilt underhåll och backup
på Render samt iSH. Skärmlås med kod är bekräftat. Äldre formuleringar nedan om
saknat backupgodkännande eller enhetslås är historiska och ersätts av
[aktuell produktionsstatus](PRODUCTION_BACKUP_STATUS.md).
Driftkitet är installerat enligt ägarens iSH-underlag den 23 oktober; upprepa
inte installationen. Auto Sync är pausad enligt ägaren och auto-deploy Off är
direkt verifierat. Render Maintenance Mode är nu på enligt connectoravläsning
efter ägarens bekräftelse den 23 oktober (inställning uppdaterad 12:18 svensk tid).
Webappen är stängd för publika anrop. Backup och särskilt underhållsstartprogram
återstår; `npm start` kvarstår och verkligt skrivstopp är ännu inte verifierat.
Nästa steg är det låsta underhållsstartkommandot i steg 3, med gamla revisionen.
Arbetet fortsätter via ägarens dashboard och iSH.
Merge, PR-deployment, migration och återställning
är inte godkända. Stanna efter verifierad backup på båda målen med underhåll
och pausad automatik kvar; fortsätt inte körplanens releasesteg.

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

Förberedd 14 oktober, kompletterad med verifierad runtime 15 oktober 2026 för
[PR #7](https://github.com/thebloodlineisreallycooking-ui/Jarvis-/pull/7).
**Detta är ett granskningsbart förslag. Produktionsbackup, inställningsändringar,
merge, deployment och skrivande produktionskontroller är inte utförda eller
godkända. Endast läsande drift- och filsystemsmetadata har kontrollerats.**

Driftverktygen är färdiga och den befintliga syntetiska återställningsövningen
har återanvänts med dem. Aktiv `DATABASE_PATH`, Node och ledigt diskutrymme är
verifierade. Användaren avläste Auto Sync = Yes den 19 oktober 2026. Före
produktionsstart återstår bekräftat skärmlås med kod på backuptelefonen
och separat produktionsbeslut. SSH/SFTP och processåtkomst är nu verifierade
genom användarunderlaget ovan.
Gamla loggar och fysisk Safari är inte förhandsblockerare. Safari kontrolleras
efter separat godkänd deployment. Backup ska dessutom vara verifierad på båda
målen innan merge eller migration tillåts.

## Exakt mål och revisionslås

| Uppgift | Värde |
| --- | --- |
| Workspace | `My Workspace`, `tea-db1vdfmk1f9s738hca00` |
| Befintlig tjänst | `jarvis-private`, `srv-db1vle3bc2fs73em1t30` |
| Dashboard | https://dashboard.render.com/web/srv-db1vle3bc2fs73em1t30 |
| Repository / branch | `thebloodlineisreallycooking-ui/Jarvis-` / `main` |
| Aktiv gammal kod / återställningskod | `a21a3a9b4877ce31afc8eec28ae5557854f01b01` |
| Aktiv gammal deploy | `dep-db2k2kmi0phs738s20k0`, live 6 oktober 18:44:34 UTC |
| Föreslagen releasecommit och driftkit | `dade9b6c16df3e0ec61484e0ff10dd558744d695` |
| PR-branch | `codex/etapp-1-stabil-grund` |
| Kopplad Blueprint | `exs-db1vjsu7bikc73bt8gdg`; kopplingen synlig i inloggad dashboard, Auto Sync = Yes enligt användarens dashboardavläsning 19 oktober 2026 |
| Region / plan / instanser | `frankfurt` / befintlig `starter` / 1 |
| Disk / DB | `jarvis-data`, `dsk-db1vlebbc2fs73em1tmg`, 1 GB, `/var/data/jarvis.db` |
| Byggkommando, behåll | `npm ci --include=dev && npm run build` |
| Ordinarie start / healthcheck | `npm start` / `/api/health` |
| Privat kontroll | Befintliga tjänstens Shell/SSH; lokal port på `127.0.0.1`, autentisering i fil med läge 0600 |

Releasecommitten innehåller all Etapp 1-kod och driftverktygen. Den efterföljande
PR-committen ändrar bara dokumentation och låser denna körplan till ovanstående
kod. Deploya den uttryckliga SHA:n, inte en rörlig branchreferens. Vid senare
kodändring måste förslaget och relevanta kontroller uppdateras.

Planera ett **30 minuters underhållsfönster**. Rimlig arbetsuppskattning är
15–30 minuters stängning om databasen är liten och SSH/överföring är förberedd;
återställning kan lägga till 10–20 minuter. Detta är ingen uppmätt garanti.
Uppskattningen justeras efter storlek och åtkomst. Avbrottet börjar när
underhåll aktiveras och slutar efter godkända kontroller. Diskanslutningen
innebär dessutom instansbyte med avbrott; ingen ny tjänst eller preview skapas.

## Verifierad runtime och läsande kontroll före fönstret

Följande lästes 15 oktober i den befintliga tjänstens inloggade Shell,
instans `6hxdk`, efter säker browserAuth-inloggning och användarens enhetsgodkännande.
Ingen SQLite-anslutning öppnades; endast valda miljövärden, mountinfo, stat och
statfs användes. Inga hemligheter eller databasrader hämtades.

| Uppgift | Verifierat värde |
| --- | --- |
| Service / commit | `srv-db1vle3bc2fs73em1t30` / `a21a3a9b4877ce31afc8eec28ae5557854f01b01` |
| Aktiv DATABASE_PATH | `/var/data/jarvis.db` |
| Faktisk Node | `v24.21.0`, inom deklarerat intervall |
| `/var/data` monterad | `true` |
| Ledigt utrymme | `1003794432` byte, cirka 1,00 GB / 957 MiB |
| DB / WAL / SHM filstorlek | `4096` / `61832` / `32768` byte |
| Konservativt backupkrav vid avläsningen | `67503648` byte; utrymmet räckte med god marginal |

Detta är en tidpunktsobservation, inte ett löfte om utrymmet vid release.
Följande kontroll kan upprepas utan backup eller databasläsning före fönstret.

I befintliga tjänstens **Shell**, kör följande enda kommando. Det läser bara
utvalda icke-hemliga miljövärden och filsystemsmetadata; ingen SQLite-fil öppnas.
Resultatets JSON får återges, men inga omgivande miljövärden eller terminalbilder.

```sh
node <<'NODE'
const fs = require('node:fs');
const disk = fs.statfsSync('/var/data', { bigint: true });
console.log(JSON.stringify({ service: process.env.RENDER_SERVICE_ID, commit: process.env.RENDER_GIT_COMMIT, DATABASE_PATH: process.env.DATABASE_PATH ?? null, node: process.version, freeBytes: String(disk.bavail * disk.bsize), mounted: fs.readFileSync('/proc/self/mountinfo', 'utf8').split('\n').some(line => line.split(' ')[4] === '/var/data') }, null, 2));
NODE
```

Förväntat: rätt tjänst och gammal SHA enligt tabellen, DB-path exakt ovan,
`mounted: true`, Node inom `>=20.19 <25`. Utrymmets tillräcklighet beräknas
också av backupkommandot mot faktiska DB/WAL/SHM-storlekar: minst
**64 MiB + 4 × sammanlagd filstorlek** ledigt. Återställning kräver dessutom
backupens storlek + 64 MiB ledigt vid körningen. Inget skript utökar disken,
raderar tidigare backuper eller ändrar ägaruppgifter för att få kontrollerna
att passera. Avvikelse innebär stopp och ett nytt konkret förslag.

Connectorn saknar dessa runtimefunktioner, men den godkända webbläsarvägen
fungerade 15 oktober och ersätter det äldre 502-hindret i rapporteringen.
Sessionen avslutades senare. Ett nytt säkert inloggningsförsök gav timeout;
en ny kontroll av tjänstesidan visade inloggning. Resultatet av den då påbörjade
processkontrollen saknades; SSH-kontrollen 22 oktober ovan ersätter detta hinder. Den 19 oktober svarade användaren Yes
på den uttryckliga frågan om Blueprintens Auto Sync. Detta är användarens
avläsning, inte en ny connector-/webbläsarkontroll eller ett ändringsgodkännande.
Det gör inte de tidigare verifierade runtimevärdena okända igen.

Processåtkomsten kontrollerades framgångsrikt via SSH den 22 oktober.
Följande är referenskommandot för läsande omkontroll, utan databasläsning:

```sh
node <<'NODE'
const fs = require('node:fs');
const errors = new Set(), holders = new Set();
const targets = ['', '-wal', '-shm', '-journal'].map(s => '/var/data/jarvis.db' + s);
for (const pid of fs.readdirSync('/proc').filter(s => /^\d+$/.test(s))) {
  try {
    const uid = Number(fs.readFileSync(`/proc/${pid}/status`, 'utf8').match(/^Uid:\s+(\d+)/m)?.[1]);
    if (uid !== process.getuid()) continue;
    for (const fd of fs.readdirSync(`/proc/${pid}/fd`)) {
      try {
        const path = `/proc/${pid}/fd/${fd}`;
        if (targets.includes(fs.readlinkSync(path).replace(/ \(deleted\)$/, ''))) holders.add(pid);
        fs.statSync(path);
      } catch (e) { if (!['ENOENT', 'ESRCH'].includes(e.code)) errors.add(e.code || 'unknown'); }
    }
  } catch (e) { if (!['ENOENT', 'ESRCH'].includes(e.code)) errors.add(e.code || 'unknown'); }
}
console.log(JSON.stringify({ sameUserProcReadable: errors.size === 0, processInspectionErrors: [...errors], databaseHolderProcesses: holders.size }, null, 2));
NODE
```

Kräv `sameUserProcReadable: true` och inga inspektionsfel. Öppna DB-handtag är
förväntade medan appen är igång; detta kommando stoppar ingenting. Den faktiska
backupoperationen kräver sedan noll DB-handtag under underhåll. Vid åtkomstfel
ska planen korrigeras innan fönstret bokas; skyddet får inte kopplas ur.

## Konkret privat backupmål och åtkomst

Förslaget använder två kopior:

1. **Render:** `/var/data/jarvis-backups/<backup-id>/snapshot.db` och
   `manifest.json`, katalog 0700, stängda filer 0400. Inget ligger i webbroten.
2. **Utanför Render:** ägarens iPhone (skärmlås med kod ska bekräftas), i den kostnadsfria
   [iSH-appens](https://ish.app/) lokala filsystem:
   **`/root/JARVIS-backuper/<backup-id>/`**. Ingen delningslänk, publik fil,
   GitHub-uppladdning, ChatGPT-uppladdning eller iCloud Drive-mapp används.
   Appinstallation, utrymme och SSH/SFTP-åtkomst är verifierade genom
   användarunderlaget ovan; enhetslåset återstår att bekräfta. iSH ska hållas i förgrunden under överföring.

Ägaren förvarar filerna och eventuell återställningsjournal privat. Behåll båda
kopiorna minst 30 dagar efter godkänd release/Safari-kontroll, eller längre vid
öppet felärende. Ingen automatisk radering ingår. Enhetslås och tillräckligt
lokalt utrymme (minst dubbla backupstorleken) måste finnas. Privat nyckel och
backup ska inte exporteras från enheten till chatten.

Åtkomster som krävs, och som inte antas finnas redan:

- Render-konto med åtkomst till just denna tjänsts Shell och, vid senare
  godkännande, startkommando, maintenance, auto-deploy och deploy av specifik SHA.
- Tjänsten styrs av Blueprint `exs-db1vjsu7bikc73bt8gdg`: rätt att tillfälligt
  stänga av dess Auto Sync och senare återställa Yes, det användaravlästa
  ursprungsvärdet. Bekräfta att det är oförändrat vid det godkända fönstrets start.
- Ägarens SSH-nyckel finns på iPhone och publik nyckel är registrerad enligt
  användaren; lyckad SSH/SFTP-anslutning syns i underlaget. Privat nyckel och
  lösenfras lämnar inte enheten.
- GitHub-rättighet att granska och senare merga PR #7; merge är separat godkännande.

På iPhone kan `apk add openssh-client` i iSH installera klienten. Återanvänd en
befintlig godkänd SSH-nyckel. Om ingen finns, skapa först `/root/.ssh` med
`mkdir -p /root/.ssh` och `chmod 700 /root/.ssh`. Kör sedan
`ssh-keygen -t ed25519 -f /root/.ssh/jarvis_render_ed25519`, med privat lösenfras,
och registrera endast
`.pub` under Render **Account Settings → SSH Public Keys** efter godkännande.
Använd SSH-adressen:

```text
srv-db1vle3bc2fs73em1t30@ssh.frankfurt.render.com
```

Kontrollera Frankfurt-fingeravtrycket mot
[Render SSH](https://render.com/docs/ssh) innan första anslutningen accepteras:
`SHA256:dBRrCEA0tBkvaYLzzDw/mzaANw6nUJO961Zx806spZs`.
Använd den befintliga instansen, aldrig en betald ephemeral shell-instans.

## Varför appen inte kan starta under återställningen

Den tillfälliga Start Command är exakt:

```sh
node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/maintenance.mjs
```

Programmet importerar **varken server, migrator eller npm-start**. Det svarar
200 med `status: maintenance, applicationStarted: false` på `/api/health` och
503 på alla andra offentliga URL:er. Backup/restore nås enbart via autentiserad
loopback-kontroll. En ny slumpnyckel lagras i
`/var/data/jarvis-ops/control.json` (0600, överordnad katalog 0700). Visa aldrig
den filen. Den publika servern har inga drift- eller filnedladdningsrutter.

Render stoppar den gamla diskanslutna instansen före den nya. Vänta tills just
underhållsinstansen är live och dess privata `status` svarar. Varje operation
kontrollerar dessutom samtliga processer med samma UID via `/proc` och vägrar
om någon håller DB/WAL/SHM/journal öppen, eller om inspektionen saknar behörighet.
Förbjud parallella manuella DB-kommandon under fönstret. Enbart grön Render-status
eller Render Maintenance Mode räcker inte: edge-läget stoppar inte processen.

Vid processavbrott startar Render **samma underhållsprogram igen**. Det finns
ingen automatisk väg vidare till appen. Återställningen journalför filbytet,
karantänsätter den gamla DB:n och dess WAL/SHM tillsammans, installerar en
verifierad kopia atomiskt och lämnar appen avstängd. Ett avbrott återupptas med
samma backup-ID. Även de senare app-startkommandona nedan vägrar starta med fel
commit, saknad/tom databas eller kvarvarande återställningsjournal.

## Efter separat godkännande: installera det låsta driftkitet

Följande kod kopierar **bara tre offentliga källkodsfiler** till tjänstens disk.
Den öppnar inte databasen och startar ingenting. Repositoryts offentliga status
verifierades via GitHub. Varje fil låses både till commit-URL och SHA-256.
Kör i den befintliga tjänstens Shell från repositoryroten, normalt
`/opt/render/project/src`, efter det separata godkännandet.

```sh
node --input-type=module <<'NODE'
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
const check = (ok, message) => { if (!ok) throw Error(message); };
const kit = 'dade9b6c16df3e0ec61484e0ff10dd558744d695';
const expected = {
  'client.mjs': 'ac9947b7040b07f4f935b3580086c1584034e516f25c5423f30809fa1c61674d',
  'database.mjs': '4d4c9dc4cd49ee3a5df28242673673c9a33379d770419cb975a33e82a20f7392',
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

## Efter separat godkännande: backup och release i ordning

1. **Innan merge:** bekräfta oförändrade runtimevärden, godkänd processinspektion,
   iPhone-målet och fungerande SSH/SFTP. På iPhone: kontrollera ledigt utrymme med
   `df -k /root` och prova endast anslutning/`pwd`/`bye` före backupbeslutet;
   inga databasfiler hämtas i åtkomstkontrollen.
   Läs aktuell SHA en gång till. Om main/aktiv kod har ändrats från basen: stopp.
   Installera driftkitet ovan. Ändra inte hemligheter, owner, branch, disk,
   region, plan, build eller healthcheck.
2. Sätt den kopplade Blueprintens **Settings → Auto Sync → No**, därefter
   tjänstens **Auto-Deploy → Off**, så att synk inte återställer `npm start`
   eller auto-deploy under återställning. Kontrollera att inga deployer är köade.
   De ursprungliga värdena dokumenteras privat för senare återställning.
3. Aktivera Render **Maintenance Mode** och låt pågående anrop avslutas. Sätt
   Start Command till det rena underhållskommandot ovan. En inställningsändring
   kan utlösa deploy. Använd **Manual Deploy → Deploy a specific commit** med
   gamla SHA:n om en separat deployment behövs. Vänta på underhållsinstansen,
   anslut Shell på nytt (deploy stänger gamla Shell/SSH-sessioner), och kör:

   ```sh
   node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/client.mjs status
   ```

   Kräv rätt service, `deployedCommit` = gamla SHA:n,
   `applicationStarted: false`, `busy: false`, `restorePending: false`.
   Inga andra program får öppna databasen. Stopp vid permission-/processfel;
   kringgå aldrig kontrollen genom att kopiera DB-filer direkt.
4. Skapa native SQLite-backup, med appen stoppad:

   ```sh
   node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/client.mjs backup srv-db1vle3bc2fs73em1t30
   ```

   Kommandot kräver schema 1, befintlig ensam ägare, giltiga task-statusar,
   integritet, foreign keys och utrymme. Det använder `better-sqlite3.backup`,
   kontrollerar oförändrad källa, validerar tabellantal, normaliserar **kopian**
   till DELETE-journal, stänger den och beräknar SHA-256. Utdata innehåller bara
   backup-ID, hash, byteantal och schemanummer. Bevara ID/hash i privat journal.
   Detaljmanifestet och DB:n ska aldrig bifogas PR/chatten.
5. För över båda filerna direkt till iPhone. Ersätt `BACKUP-ID` nedan med det
   returnerade `backup-...`-värdet. Sätt en shellvariabel på iPhone (icke-hemlig),
   skapa mappen och öppna SFTP med den godkända nyckeln:

   ```sh
   JARVIS_BACKUP_ID='BACKUP-ID'
   mkdir -p "/root/JARVIS-backuper/$JARVIS_BACKUP_ID"
   chmod 700 /root/JARVIS-backuper "/root/JARVIS-backuper/$JARVIS_BACKUP_ID"
   sftp -i /root/.ssh/jarvis_render_ed25519 srv-db1vle3bc2fs73em1t30@ssh.frankfurt.render.com
   ```

   I SFTP-prompten, använd det verkliga ID:t på varje rad:

   ```text
   lcd /root/JARVIS-backuper/BACKUP-ID
   get /var/data/jarvis-backups/BACKUP-ID/snapshot.db
   get /var/data/jarvis-backups/BACKUP-ID/manifest.json
   bye
   ```

   Kontrollera på iPhone, med den 64 tecken långa SHA-256 som backupkommandot gav:

   ```sh
   cd "/root/JARVIS-backuper/$JARVIS_BACKUP_ID"
   printf '%s  snapshot.db\n' 'SHA256-FRÅN-BACKUPKOMMANDOT' | sha256sum -c -
   chmod 400 snapshot.db manifest.json
   ```

   Kräv `snapshot.db: OK`. Filerna är nu en separat privat kopia. På Render:

   ```sh
   node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/client.mjs verify BACKUP-ID srv-db1vle3bc2fs73em1t30
   ```

   Kräv `verified: true`, schema 1 och samma hash. Fortsätt inte vid avvikelse.
   En kopia på enbart Render-disken är inte tillräckligt.
6. **Först när backupgrinden är klar:** merga PR #7 enligt separat godkännande.
   Auto-deploy/synk ska fortfarande vara avstängda. Använd ingen automatisk
   squash/rebase som gör den granskade filuppsättningen oklar; kontrollera
   merge-resultatets filinnehåll mot godkänd PR. Välj sedan **Manual Deploy →
   Deploy a specific commit → `dade9b6c16df3e0ec61484e0ff10dd558744d695`**,
   medan Start Command fortfarande är rent underhåll. Bygge sker utan disk;
   nya koden finns på instansen men migrationen har inte startat. Kontrollera
   `client.mjs status` igen med den nya SHA:n och `applicationStarted: false`.
7. Släpp igenom bara den godkända koden med följande tillfälliga Start Command:

   ```sh
   if [ "$RENDER_GIT_COMMIT" = "dade9b6c16df3e0ec61484e0ff10dd558744d695" ] && [ -s /var/data/jarvis.db ] && [ ! -e /var/data/jarvis-ops/restore-pending.json ]; then npm start; else exec node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/maintenance.mjs; fi
   ```

   Spara, och välj samma specifika SHA igen om inställningsändringen startar
   en annan revision. Fel SHA går till underhåll utan att importera servern.
   Migration 2 körs bara vid den uttryckligen godkända appstarten. Håll Render
   Maintenance Mode på tills de interna kontrollerna nedan har passerat.
8. Kör de riktade interna kontrollerna nedan. Öppna därefter tjänsten för ägaren
   genom att stänga av Render Maintenance Mode. Utför den fysiska Safari-listan.
   Under detta acceptansfönster används bara den avtalade kontrolluppgiften,
   Demo och in-/utloggning, inga andra nya Live-data.
9. Efter godkänd acceptans: verifiera att `main` innehåller exakt godkänd
   applikationskod och registrera merge-SHA:n. Återgå till ordinarie `npm start`
   och återställ avläst ursprungligt Blueprint Auto Sync-värde och On Commit
   endast som del av det godkända avslutet. En sådan inställningsändring/synk kan
   deploya merge-SHA:n: invänta den och upprepa health/inloggning/omladdning,
   utan ytterligare kontrolluppgift. Om återställning behövdes, följ istället
   stoppregeln i återställningsavsnittet; återaktivera inte nya main av misstag.

## Intern verifiering efter deployment, före Safari

Endast efter godkännande av release **inklusive en avsiktlig produktionsuppgift**.
Följande använder befintliga miljövärden i minnet; det skriver aldrig ut dem,
cookies, uppgiftstexter eller historik. Kör från repositoryroten i nya instansen.
Det skapar exakt en beständig uppgift: **Granska JARVIS efter Etapp 1**. Kör inte
om blint vid nätverksfel; kontrollera först om uppgiften redan sparats.

```sh
node <<'NODE'
(async () => {
  const check = (ok, message) => { if (!ok) throw Error(message); };
  check(process.env.RENDER_SERVICE_ID === 'srv-db1vle3bc2fs73em1t30', 'Wrong service');
  check(process.env.RENDER_GIT_COMMIT === 'dade9b6c16df3e0ec61484e0ff10dd558744d695', 'Wrong release commit');
  check(process.env.DATABASE_PATH === '/var/data/jarvis.db', 'Wrong database path');
  const Database = require('better-sqlite3');
  const db = new Database(process.env.DATABASE_PATH, { readonly: true, fileMustExist: true });
  try {
    check(db.prepare('SELECT MAX(version) FROM schema_migrations').pluck().get() === 2, 'Wrong schema');
    check(JSON.stringify(db.pragma('integrity_check')) === '[{"integrity_check":"ok"}]', 'Integrity failed');
    check(db.pragma('foreign_key_check').length === 0, 'Foreign keys failed');
  } finally { db.close(); }
  const base = `http://127.0.0.1:${process.env.PORT || 10000}`;
  let cookie = '';
  const call = (path, method = 'GET', body) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
  const get = async path => { const r = await call(path); check(r.status === 200, 'Read check failed'); return r.json(); };
  check((await get('/api/health')).status === 'ok', 'Application is not ready');
  const login = await call('/api/auth/login', 'POST', { username: process.env.JARVIS_OWNER_USERNAME, password: process.env.JARVIS_OWNER_PASSWORD });
  check(login.status === 200, 'Owner login failed');
  const setCookie = login.headers.get('set-cookie') || '';
  check(/HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie) && /SameSite=Strict/i.test(setCookie), 'Cookie attributes failed');
  cookie = setCookie.split(';')[0];
  try {
    const before = (await get('/api/tasks')).tasks.length;
    const response = await call('/api/commands', 'POST', { mode: 'live', text: 'Lägg till en uppgift att Granska JARVIS efter Etapp 1' });
    check(response.status === 201, 'Live write failed; inspect before retrying');
    const saved = await response.json();
    check(saved.persisted && saved.messages.length === 2 && saved.messages[0].role === 'user' && saved.messages[1].role === 'assistant', 'Live pair failed');
    const history = (await get('/api/messages')).messages;
    const first = history.findIndex(m => m.id === saved.messages[0].id);
    check(first >= 0 && history[first + 1]?.id === saved.messages[1].id, 'Persisted order failed');
    check((await get('/api/tasks')).tasks.length === before + 1, 'Saved task not retained');
    const demo = await call('/api/commands', 'POST', { mode: 'demo', text: 'Add a task to verify Demo separation' });
    check(demo.status === 200 && (await demo.json()).persisted === false, 'Demo failed');
    check((await get('/api/tasks')).tasks.length === before + 1, 'Demo changed Live tasks');
    check((await get('/api/messages')).messages.length === history.length, 'Demo changed Live history');
  } finally {
    check((await call('/api/auth/logout', 'POST')).status === 204, 'Logout failed');
  }
  check((await call('/api/tasks')).status === 401, 'Session remained active');
  console.log('PASS: release schema/integrity, owner session, one intended Live task, order, Demo and logout.');
})().catch(() => { console.error('Release check failed. Keep maintenance enabled; inspect privately before retry or restore.'); process.exitCode = 1; });
NODE
```

Ett lyckat Render-healthcheck ensamt verifierar inte skrivförmåga; den gamla
servern får 200 på health även när Live-skrivningar mot schema 2 misslyckas.

## Återställning under samma stoppade acceptansfönster

Detta är den förberedda återställningsvägen, inte ett godkännande att utföra den.
En restore tar bort **alla** ändringar efter backupen, inklusive kontrolluppgift,
meddelanden och sessionsändringar. Den kan återinföra sessioner som loggats ut
sedan backupen. Om normal användning redan återupptagits: stoppa skrivningar,
bevara felläget och be ägaren besluta om databortfall eller framåtriktad fix;
återställ inte automatiskt. En granskad framåtriktad fix bevarar nya data.

1. Render Maintenance Mode på; Auto-Deploy och Blueprint Auto Sync fortfarande
   av. Byt Start Command tillbaka till **rent underhåll** enligt ovan. Vänta
   tills den underhållsinstansen är live och anslut Shell igen. Kontrollera
   `status`, rätt service och `applicationStarted: false`. Ett avbrutet/felande
   bygge är inte bevis för att gamla appen har stoppats. Kör inga DB-filbyten
   före fungerande underhållskontroll. Kör inte Render **Rollback**: den kan
   återta tidigare `npm start` innan databasen är återställd.
2. Om databasen är läsbar, bevara felläget med separat native backup:

   ```sh
   node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/client.mjs capture srv-db1vle3bc2fs73em1t30
   ```

   Capture accepterar schema 1 eller 2 och ger ett nytt backup-ID. Det ersätter
   inte pre-release-backupen. Vid integritetsfel eller utrymmesbrist: originalets
   filer behålls av restore i privat karantän; radera dem inte. Ingen migration
   eller automatisk datarensning försöks.
3. Använd den verifierade **schema-1-backupens ursprungliga ID**, inte capture-ID:

   ```sh
   node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/client.mjs verify BACKUP-ID srv-db1vle3bc2fs73em1t30
   node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/client.mjs restore BACKUP-ID srv-db1vle3bc2fs73em1t30
   node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/client.mjs status
   ```

   Kräv `restored: true`, `schema: 1`, rätt `requiredCodeCommit` och därefter
   `restorePending: false`. Hash kontrolleras innan öppning, sedan integritet.
   Karantän finns under `/var/data/jarvis-ops/quarantine-<id>/`. Ingen original-
   backup eller karantän raderas. Vid avbruten operation: behåll Start Command,
   återanslut till underhåll och kör **samma restore-ID igen**. `restore-pending.json`
   styr återupptagningen; radera aldrig journalen för hand och starta inte appen.
4. Om Render-kopian saknas: installera driftkitet på samma befintliga disk om
   det behövs och håll tjänsten i underhåll. Skapa med Shell `umask 077` och
   `mkdir -m 700 /var/data/jarvis-backups/BACKUP-ID` (föräldern 0700). Om katalogen
   redan finns: verifiera befintlig kopia först, skriv inte över originalet.
   Återför `snapshot.db` och `manifest.json` från samma iPhone-mapp med SFTP `put`
   till den nya katalogen, sätt båda till 0400 och kör `verify`/`restore` ovan.
   Ingen DB-fil mellanlagras i ChatGPT eller GitHub. En faktiskt förlorad disk
   kräver separat åtgärdsbeslut; denna plan skapar inte en ersättningsresurs.
5. Efter lyckad restore, använd följande **kodlåsta** Start Command:

   ```sh
   if [ "$RENDER_GIT_COMMIT" = "a21a3a9b4877ce31afc8eec28ae5557854f01b01" ] && [ -s /var/data/jarvis.db ] && [ ! -e /var/data/jarvis-ops/restore-pending.json ]; then npm start; else exec node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/maintenance.mjs; fi
   ```

   Välj **Manual Deploy → Deploy a specific commit →
   `a21a3a9b4877ce31afc8eec28ae5557854f01b01`**. Byggkommandot behålls och
   installerar dev-beroenden, där gamla kodens `tsx` finns. Om sparandet först
   deployar nya main körs bara underhåll; den gamla databasen migreras inte igen.
6. Kontrollera aktiv SHA, schema 1, integritet och inloggning. Läs de återställda
   listorna. Verifiera en avsiktlig Live-skrivning endast enligt det godkända
   rollbackbeslutet; kontrollera både kommando och svar via deras ID:n, samt
   omladdning, Demo och logout. Gamla koden har sitt gamla ordningsfel, så ny
   ordningsgaranti får inte krävas av återställd basversion. Health ensam räcker
   inte. Återöppna för ägaren först efter godkänd kontroll.
7. **Lämna kodlåst gammal start, Auto-Deploy Off och Auto Sync No** efter rollback.
   Återgå inte till fritt `npm start`/On Commit så länge main innehåller migration 2.
   En ny kodrelease eller en separat granskad revert-PR behövs före normalisering.
   Detta förhindrar att nästa synk automatiskt migrerar den återställda DB:n.

## Fysisk Safari efter separat godkänd deployment

Ingen mobilåtkomlig PR-preview finns. Skapa ingen ny betald tjänst. När den
befintliga tjänsten har driftsatts enligt separat beslut och öppnats för ägaren:

- iPhone och iPad Safari: logga in, öppna alla tre vyer med befintligt innehåll.
- Öppna/stäng skärmtangentbordet, växla stående/liggande, nå kommandofält,
  felmeddelande och återförsök även med kort tillgänglig höjd.
- Prova större text, safe areas, synlig fokus, tryckytor och lång historik.
- Med reducerad rörelse: inga dekorativa animationer, även pseudoelement.
  Bakgrund/återgång ska pausa/återuppta enligt synlighet utan att tappa utkast.
- Växla Live/Demo och kör endast Demo under denna kontroll; Live-uppgiften från
  internkontrollen finns kvar, Demo är tydligt märkt och försvinner vid reload.
  Bekräfta logout och att privata listor/utkast töms.

Tidigare Chromium-vyer 390/430/820 och reducerad höjd är emulering. Det är inte
ett fysiskt Safari-tangentbordstest. Safariutfallet avgör om releasen accepteras
eller om den definierade felvägen används.

## Lokal verifiering och gränser

`node --import tsx scripts/verify-recovery.mjs` passerar med syntetiska temporära
data och bascommitens verkliga server. Övningen använder samma driftfunktioner
som ovan: native WAL-backup, bevarade fem tabeller, migration, gamla kodens
Live-fel trots frisk health, återställda gamla skrivningar/konto-isolering,
checksumma, privata kontrollrutter, avvisad öppen DB/felaktig backup samt avbrott
både mitt i DB/WAL-karantän och efter atomisk installation. Appen startas aldrig
av underhållsprogrammet. Syntaxkontroll och `git diff --check` passerar.

Den lokala executor-miljön begränsar andra processers `/proc` och Unix-sockets.
Därför använder driftverktyget autentiserad loopback-TCP och testets process-
inspektion en fixture med den verkliga testprocessens filhandtag. Produktion
har ingen sådan override: den läser `/proc` och stoppar vid saknad behörighet.
Detta ska verifieras av backupgrinden på Render innan migration; inget påstående
om redan testad produktionsåtkomst görs. Den fulla applikationstestsviten har inte
körts om för denna fristående driftkod; tidigare 31 tester, bygge, produktions-
start och Chromium är dokumenterade i Etapp 1-rapporten.

Källor för driftmekaniken: [Render Disks](https://render.com/docs/disks),
[SSH/Shell](https://render.com/docs/ssh), [Deploys](https://render.com/docs/deploys),
[Maintenance Mode](https://render.com/docs/maintenance-mode),
[Blueprint Auto Sync](https://render.com/docs/infrastructure-as-code),
[Rollbacks](https://render.com/docs/rollbacks),
[SQLite Backup API](https://www.sqlite.org/backup.html) och
[SQLite WAL](https://www.sqlite.org/wal.html).
