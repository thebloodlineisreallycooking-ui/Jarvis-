# Etapp 1 — Render-granskning och återställningsplan

Granskad 14 oktober 2026, cirka 10:10–10:20 UTC (12:10–12:20 svensk tid).
Avser [PR #7](https://github.com/thebloodlineisreallycooking-ui/Jarvis-/pull/7)
på `codex/etapp-1-stabil-grund`. Jämförd applikationsrevision:
`56978a89e9bffefc4b863ceafdc0a331ec8f3799`. Denna uppföljning ändrar
dokumentation och lägger till en lokal återställningsövning, inte applikationen.

**Releasebesked: INTE REDO FÖR PRODUKTIONSRELEASE ÄNNU.**
Bygg-/startinställningarna är redan rätt och den lokala återställningsövningen
passerar. Produktionsbackup, verifierad återställningsåtkomst och kontroll av
verklig databasplacering saknas fortfarande. Se de konkreta grindarna nedan.
PR:n förblir ett utkast. Inget har mergats, driftsatts eller ändrats i Render.

## Observerad tjänst och jämförelse

Användaren godkände uttryckligen **My Workspace**. Render-anslutningens
`list_services` och `get_service` matchade tjänsten via exakt repository-URL,
inte bara dess namn. `get_deploy`, `list_deploys` och `list_events` användes
för drifthistoriken. Alla angivna tider i tabellerna är UTC.

| Uppgift | Observerat i Render | PR #7 / slutsats |
| --- | --- | --- |
| Workspace | `My Workspace`, `tea-db1vdfmk1f9s738hca00` | Godkänt urval |
| Tjänst | `jarvis-private`, `srv-db1vle3bc2fs73em1t30` | Samma befintliga tjänst |
| Repository | `https://github.com/thebloodlineisreallycooking-ui/Jarvis-` | Exakt matchning |
| Branch | `main` | PR:n har samma basbranch; arbetsbranchen är inte driftsatt |
| Aktiv commit | `a21a3a9b4877ce31afc8eec28ae5557854f01b01` | PR:ns bas; Etapp 1-koden är ännu inte i produktion |
| Aktiv deploy | `dep-db2k2kmi0phs738s20k0`, status `live`, klar 2026-10-06 18:44:34 | Bekräftad tidigare deployment |
| Byggkommando | `npm ci --include=dev && npm run build` | Exakt samma som PR:ns `render.yaml` |
| Startkommando | `npm start` | Exakt samma yttre kommando |
| Vad npm start kör | Bascommit: `NODE_ENV=production tsx server/index.ts` | PR: `NODE_ENV=production node --import tsx server/index.ts`; `tsx` flyttas till runtime-beroenden |
| Healthcheck | `/api/health` | Matchar; kontrollerar endast `SELECT 1`, inte meddelandeskrivning |
| Auto-deploy | `yes`, trigger `commit` | Matchar `autoDeployTrigger: commit`; framtida main-merge kan starta release |
| Region / plan / runtime | `frankfurt` / `starter` / `node` | Matchar; ska bevaras |
| Disk | `jarvis-data`, `dsk-db1vlebbc2fs73em1tmg`, 1 GB, `/var/data` | Exakt matchning |
| Instanser / underhåll | 1 instans; maintenance mode av; inte suspenderad | Befintligt driftläge; inget ändrat |
| PR previews | Av | Ingen Render-preview av PR #7 har verifierats |
| Root directory | Tom, repositoryroten | Förenligt med npm-scripts |
| `DATABASE_PATH` | Aktivt miljövärde ej exponerat av anslutningens läsverktyg | Blueprint kräver `/var/data/jarvis.db`; diskmontering bevisar inte att appen använder den |
| `NODE_ENV`, ägarvariabler | Aktiva miljövärden ej lästa | Båda npm-startvarianterna sätter production. Befintliga ägarhemligheter ska behållas; inga värden har hämtats |

[Tjänsten i Render](https://dashboard.render.com/web/srv-db1vle3bc2fs73em1t30).

**Konkreta skillnader:** `main` saknar `buildCommand` i Blueprinten trots att
dashboarden redan har rätt kommando. PR #7 kodifierar det befintliga värdet.
Ingen korrigering av aktivt byggkommando, startkommando, healthcheck, region,
plan eller disk föreslås. Kvarstående faktisk skillnad är applikationsrevisionen:
PR:ns startscript, beroendeklassning, migration och klientfixar är inte driftsatta.
Blueprinten anger ingen explicit branch; tjänstens faktiska `main` ska behållas.

## Deployhändelser och loggbegränsning

| Tid 2026-10-06 | Observation från Render Events / Deploys |
| --- | --- |
| 18:36:53–18:36:55 | Bygge/deploy misslyckades, exitkod 1, deploy `dep-db2jvfbl550s73bf3l3g` |
| 18:37:08 / 18:37:31 | Bygge lyckades; deployment misslyckades med exitkod 127, `dep-db2jvfle9v9s73bfham0` |
| 18:37:38 / 18:37:51 | Bygge lyckades; ytterligare deployment misslyckades med exitkod 127, `dep-db2jvmf1cpss73dijr3g` |
| 18:43:30 | Ny deployment utlöst av ändring av `build command` |
| 18:43:46 / 18:44:34 | Bygge och deployment lyckades; denna deploy är fortfarande markerad `live` |

Loggfrågor för 6 oktober 18:36–18:47 (build/app), hela 6 oktober utan
typfilter samt 13 oktober till granskningstillfället returnerade **noll rader**,
`hasMore=false`. Detta är inte bevis för felfri drift eller för en viss
loggretention. Events bekräftar exitkoderna men inte vilken binär/orsak som
gav 127. Ingen gammal felorsak har därför tillskrivits `tsx` som ett observerat faktum.

Dashboardens kompletterande läsning nådde en inloggningssida. Anslutningen har
inte läsverktyg för aktiva miljövariabler, ledigt diskutrymme eller tillgängliga
backuper. Dessa uppgifter är fortfarande okontrollerade. Den externa
hälsoläsningen kunde inte nå URL:en genom webbverktyget; `live` ovan är Render-
metadata, inte ett nytt lyckat HTTP-/inloggningstest. Produktionsdatabasen har
inte öppnats, kopierats eller laddats ned. Inga råloggar sparas i repositoryt.

## Varför kodrollback inte räcker

Bascommitens server använder `INSERT INTO messages VALUES(?,?,?,?,?,?)`.
Migration 2 inför `sequence`, alltså sju kolumner. Den gamla servern får
SQLite-felet `table messages has 7 columns but 6 values were supplied` när
ett Live-kommando skrivs. Kommandotransaktionen rullas tillbaka, även dess nya
uppgift. Healthcheck kan samtidigt svara 200. Demo bevisar inte Live-skrivförmåga.

Migrationen körs i en transaktion vid serverstart, före ägarvalidering och
HTTP-listen. Ett fel inne i migrationen rullar tillbaka transaktionen. Ett
senare startfel rullar däremot inte tillbaka en redan slutförd migration.
Varken gammal eller ny migrator har någon automatisk nedgradering.

Render-rollback återställer inte diskdata. Tillgängliga gamla byggartefakter
måste kontrolleras; den observerade gamla deployen är inte ett löfte om framtida
rollback-tillgänglighet. Se [Render Rollbacks](https://render.com/docs/rollbacks).

Två möjliga återhämtningsvägar måste skiljas åt: en granskad framåtriktad
korrigering som förstår schema 2 och behåller nya data, eller gammal kod ihop
med en verifierad backup från schema 1. Det finns ingen färdig automatisk
produktionsåterställning i PR:n.

## Backup före en separat godkänd release

Följande är ett förslag för en behörig driftoperatör, **inte utförda åtgärder**.
Ägaren behöver inte klistra in lösenord, tokens eller databasfiler i chatten.

1. Bestäm underhållsfönster, ansvarig operatör och tillåten återställningstid.
   Registrera gammal commit/deploy ovan och exakt godkänd releasecommit.
   Låt `main` vara oförändrad tills backupgrinden är klar. Förslaget är temporärt
   **Auto-Deploy Off** under release/återställning, med kontrollerad Blueprint-
   synk så att inställningen inte skrivs över. Bekräfta att inga deployer är köade.
   Dessa produktionsändringar kräver ett senare, uttryckligt releasebeslut.
2. Aktivera Render Maintenance Mode för att blockera offentlig trafik. Låt
   pågående anrop avslutas och stoppa även interna anrop/manuella skrivningar.
   Håll skrivstoppet genom backup, migration och acceptanskontroll. Underhållsläget
   stoppar inte själva processen och blockerar inte privat nätverk eller SSH;
   det är inte ensamt ett databaslås. Se [Maintenance Mode](https://render.com/docs/maintenance-mode).
3. I den befintliga tjänstens runtime Shell/SSH: kontrollera utan att visa
   hemligheter att `DATABASE_PATH` är `/var/data/jarvis.db`, att filen finns,
   Node-versionen stöds och att diskens lediga utrymme räcker för backup,
   migreringens nya meddelandetabell, index och WAL med marginal. Läs faktiskt
   schemanummer och kontrollera integritet/foreign keys samt okända task-statusar.
   Om schema inte är 1, konton inte motsvarar befintlig ägare eller kontrollen
   fallerar: avbryt och utred utan att skriva om data eller ägaruppgifter.
4. Skapa en unik privat katalog utanför webbroten, med katalogläge 0700 och
   `umask 077`. Öppna källan med installerad `better-sqlite3` och
   `{ readonly: true, fileMustExist: true }`. Använd **SQLite Online Backup API**
   via `await db.backup(uniqueBackupPath)` och invänta lyckat resultat före close.
   Importera inte `openDatabase`, migratorn eller den nya serverstarten för att
   läsa källan: de kan migrera den. Bibliotekets runtime-beroende finns även i
   den gamla revisionen. SQLite-backupen fångar även committed WAL-data.
5. Öppna endast backupkopian separat, kör `PRAGMA integrity_check` (enbart `ok`),
   `PRAGMA foreign_key_check` (inga rader), kontrollera schema 1 och jämför
   tabellernas antal/nycklar under skrivstoppet. Normalisera **kopian** till
   `journal_mode=DELETE`, stäng den och kontrollera att den är en fristående
   databas utan nödvändig WAL. Beräkna SHA-256 på den stängda filen och notera
   UTC-tid, bascommit, schema, storlek och kontrollresultat i privat driftjournal.
   Inga kontouppgifter, sessionshashar eller uppgiftstexter ska publiceras.
6. Behåll originalbackupen orörd. För över en verifierad kopia till en av ägaren
   godkänd, krypterad plats utanför tjänstens disk; jämför checksumma efter
   överföringen. Ange ansvarig, åtkomst och retention. En enda kopia på samma
   disk skyddar inte mot diskförlust. Inget sådant exportmål har valts eller
   någon överföring utförts i denna granskning.
7. Repetera återställning/migration på en isolerad kopia i den godkända
   driftmiljön, utan offentlig exponering. För denna granskning har motsvarande
   flöde endast körts med syntetiska data lokalt. Kopian får inte återanvända
   produktionsdatabasens sökväg eller logga dess privata innehåll.

SQLite [backup-API](https://www.sqlite.org/backup.html) och
[better-sqlite3 backup](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#backupdestination-options---promise)
stöder denna konsekventa backupmetod. Kopiera inte bara en öppen `jarvis.db`
med `cp`: WAL hör till databasens beständiga tillstånd. Kopiera inte heller
DB/WAL/SHM separat medan skrivningar pågår. Se [SQLite WAL](https://www.sqlite.org/wal.html#the_wal_file).

Enligt [Render Persistent Disks](https://render.com/docs/disks) är disken endast
tillgänglig i runtime, inte i build/pre-deploy/one-off-job. Lägg därför inte
backupen i `buildCommand` eller `preDeployCommand`. Render avråder från
disk-snapshot som återställningsmetod för en egen databas. Dess snapshots är
inte den verifierade SQLite-backup som denna release behöver. Tillgängliga
snapshots och deras innehåll har inte kontrollerats här. Diskanslutningen innebär
också ett avbrott vid byte av instans; lova inte noll nedtid.

## Samordnad återställning vid fel

1. Håll offentlig och intern skrivtrafik stoppad och auto-deploy kontrollerad.
   Kontrollera vilket schema som faktiskt finns; dra ingen slutsats enbart av
   röd/grön deployment. Samla en ny konsekvent backup av felläget för eventuell
   dataräddning om databasen fortfarande går att läsa. Behåll pre-release-backupen.
2. Föredra en granskad framåtriktad korrigering om användbar ny data har skrivits.
   Återställning till pre-release-punkten förlorar ALLT därefter: uppgifter,
   meddelanden och sessionsändringar. Den kan även återinföra sessioner som
   loggats ut efter backupen. Återföring av senare data kräver en separat plan;
   blanda inte manuellt gamla och nya databastabeller.
3. För den här planens **offline-filåterställning** måste samtliga processer och
   DB-anslutningar vara stängda och hindras från automatisk återstart. Bara
   Maintenance Mode, en stoppad deploy eller ett enstaka process-kill bevisar
   inte detta. Behörig operatör måste före release demonstrera en runtime-väg
   där disken är åtkomlig men appen hålls avstängd, exempelvis en separat granskad
   underhålls-startwrapper som återställer före start av vald gammal revision.
   Ingen sådan väg har installerats eller verifierats på Render här. **Om den
   inte kan säkras ska filåterställning inte utföras och releasen stoppas.**
4. Med alla anslutningar stängda: håll det misslyckade generationens DB och
   eventuella `-wal`/`-shm` tillsammans i privat karantän. Skriv inte över en
   öppen fil och kombinera aldrig gammal WAL med återställd DB. Lägg en kopia
   av den verifierade, stängda backupen på exakt `/var/data/jarvis.db`, med rätt
   ägare/filrättigheter. Kontrollera checksumma före öppning, sedan integritet,
   foreign keys och schema 1. Behåll backuporiginalet och karantänen.
5. Starta exakt den gamla revisionen `a21a3a9...`, med befintliga oförändrade
   ägarhemligheter. Starta inte PR-koden först: den skulle migrera backupen igen.
   Verifiera inloggning, innehåll och ett uttryckligen godkänt Live-kommando,
   därefter omladdning, meddelanden, Demo-isolering och utloggning. Healthcheck
   ensam är otillräcklig. Sådana skrivande produktionskontroller är inte utförda
   och ingår endast i en framtida separat godkänd release/återställning.
6. Återöppna trafik först efter godkänd kontroll. Återställ auto-deploy/synk
   endast när `main` pekar på den kod som ska fortsätta köras. Spara privat
   återställningsjournal och kvarvarande backup. Ta inga destruktiva genvägar.

Filhanteringskraven följer även [SQLite corruption guidance](https://www.sqlite.org/howtocorrupt.html).
En native SQLite-återföring i en transaktion kan vara ett annat angreppssätt,
men är inte den offline-metod som repeterats här och ska inte improviseras i drift.

## Lokal repetition och återstående grindar

Kör från denna branch med installerade dev-beroenden och bascommiten i git:

```sh
node --import tsx scripts/verify-recovery.mjs
```

Godkänd 14 oktober 2026. Skriptet hämtar den verkliga gamla migratorn/servern
från bascommiten och använder en egen temporär katalog, två syntetiska konton
och slumpmässigt testlösenord. Det accepterar ingen produktionssökväg.
Det verifierar backup från öppen WAL-databas, alla fem tabellers innehåll,
migration och omöppning, gammal servers 500 på Live trots 200 på health,
bevarad backupchecksumma, offline-återställning, gamla serverns fungerande
Live-skrivning och konto-isolering. Det visar också förlust av en post-backup-
uppgift vid återställning. Testdatabaser städas bort. Inga produktionsdata används.

| Grind | Status / exakt återstående steg |
| --- | --- |
| Rätt workspace, repo, tjänst, branch och aktiv commit | Klart via Render-anslutningen |
| Build/start/health/auto-deploy/disk jämfört med PR | Klart; ingen aktiv inställningskorrigering behövs |
| Historiska deployloggar | Blockerat: noll loggrader; Events ger utfall/exitkod. Läs eventuellt sparade loggar i dashboard eller dokumentera accepterad evidenslucka; gissa inte rotorsak |
| Aktiv DB-placering och runtime-förutsättningar | Kvar: bekräfta `DATABASE_PATH`, stödd Node och utrymme via behörig dashboard/Shell; inga hemligheter behöver delas |
| Backup och verklig restore-beredskap | Releaseblockerare: godkänn operatör/fönster/exportmål, skapa och verifiera native backup, visa fungerande stopp/återställningsväg på befintlig tjänst |
| Lokal kod- och återställningsverifiering | Klart: tidigare 31 tester, typkontroll, bygge, produktionsstart och Chromium; ny återställningsövning godkänd |
| Fysisk iPhone/iPad Safari | Kvar: tangentbord, begränsad höjd, safe areas, större text och fokus på fysisk enhet; emulering ersätter inte detta |
| Merge/release/produktionskontroller | Ej utfört och inte godkänt i detta uppdrag |

För mobil: öppna PR #7 och denna rapport. Öppna sedan tjänsten i Render,
**Environment**, och bekräfta enbart att `DATABASE_PATH=/var/data/jarvis.db`;
visa inte ägarvärden. Under **Events/Deploys** kan eventuellt kvarvarande
icke-hemliga bygg-/startloggrader kompletteras. Förbered driftoperatör och
backupmål enligt planen. Tryck inte Merge, Manual Deploy, Rollback eller Save
Settings innan ett separat releasebeslut. Etapp 2 har inte påbörjats.
