# Etapp 1 — Render-granskning och återställningsplan

Granskad 14 oktober 2026, kompletterad med inloggad runtimekontroll 15 oktober.
Avser [PR #7](https://github.com/thebloodlineisreallycooking-ui/Jarvis-/pull/7)
på `codex/etapp-1-stabil-grund`. Jämförd applikationsrevision:
`56978a89e9bffefc4b863ceafdc0a331ec8f3799`. Den första uppföljningen lade till dokumentation och en lokal återställningsövning.
Den senaste tillför körbara driftverktyg i `scripts/ops/`, fortfarande utan
ändring av applikationskoden. Föreslagen release-/kitcommit är
`dade9b6c16df3e0ec61484e0ff10dd558744d695`.

**Releasebesked: FÖRBEREDELSERNA ÄR KODADE OCH LOKALT VERIFIERADE;
PRODUKTIONSRELEASE FÅR INTE STARTAS ÄNNU.** Aktiv DB-path, Node-version och
fritt utrymme är verifierade. Kvar är Blueprintens Auto Sync-värde,
processinspektionens åtkomst samt SSH/SFTP och det privata iPad-målet.
Därefter krävs ett separat beslut om backup/inställningar/merge/deploy.
Den körbara, commit-låsta [releaseplanen](RELEASE_RUNBOOK.md) anger hela ordningen,
underhållsstart, backup, verifiering, avbrott och exakt återställning. Historisk
loggretention och fysisk Safari är inte förhandsblockerare. Safari sker efter
godkänd deployment. PR:n är fortfarande ett utkast; produktion är oförändrad.

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
| Blueprint | `exs-db1vjsu7bikc73bt8gdg`, koppling synlig i inloggad dashboard | Auto Sync-värdet ännu inte avläst; måste låsas under releasefönstret |
| Region / plan / runtime | `frankfurt` / `starter` / `node` | Matchar; ska bevaras |
| Disk | `jarvis-data`, `dsk-db1vlebbc2fs73em1tmg`, 1 GB, `/var/data` | Exakt matchning |
| Instanser / underhåll | 1 instans; maintenance mode av; inte suspenderad | Befintligt driftläge; inget ändrat |
| PR previews | Av | Ingen Render-preview av PR #7 har verifierats |
| Root directory | Tom, repositoryroten | Förenligt med npm-scripts |
| `DATABASE_PATH` | `/var/data/jarvis.db`, avläst i aktiv Shell 15 oktober | Matchar PR:n; inte härlett från diskmonteringen |
| Faktisk Node | `v24.21.0`, avläst i samma Shell | Inom PR:ns `>=20.19 <25`; lokal appverifiering använde 24.19.0 |
| Diskutrymme | `1003794432` byte ledigt; `/var/data` monterad | Cirka 1,00 GB; konservativt backupkrav `67503648` byte vid avläsningen |
| DB/WAL/SHM storlek | `4096` / `61832` / `32768` byte, endast filmetadata | Inget innehåll läst; faktisk konsistens verifieras först vid godkänd backup |
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
gav 127. **Användartillhandahållet underlag:** användaren återgav den tidigare
Render-loggens följd `Empty build command; skipping build` och `tsx: not found`.
Det dokumenteras som användarens logguppgift, inte som rader återhämtade genom
connectorn. Det stödjer den redan korrigerade build-/tsx-förklaringen. Att
connectorn inte längre returnerar de gamla raderna blockerar inte release.

Connectorn saknar läsverktyg för runtimevärden. Det tidigare 502-hindret i
browserAuth övervanns 15 oktober: användaren genomförde säker Google-inloggning
och enhetsgodkännande, och rätt tjänsts inloggade Shell kunde läsas. På instans
`6hxdk` verifierades service-ID, gammal SHA och runtimevärdena ovan med enbart
filmetadata och utvalda icke-hemliga miljövärden. Inga ägarhemligheter lästes.

Resultatet från en påbörjad extra `/proc`-åtkomstkontroll hann inte verifieras.
Sessionen avslutades senare; en säker återinloggning gav timeout och en ny
tjänstesida visade inloggning. Därför är processåtkomsten och Blueprintens
Auto Sync-värde kvarstående läskontroller. Shell visade att SSH kräver en
registrerad publik nyckel; någon fungerande SFTP-anslutning är inte verifierad.

Den externa hälsoläsningen kunde inte nå URL:en genom webbverktyget; `live`
ovan är Render-metadata, inte ett nytt lyckat JARVIS HTTP-/inloggningstest.
Produktionsdatabasen har inte öppnats, kopierats eller laddats ned. Inga råloggar
eller terminalbilder sparas i repositoryt.

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
med en verifierad backup från schema 1. PR:n har nu ett körbart underhålls- och återställningsverktyg, men det har inte
installerats eller körts i produktion. Ingen automatisk produktionsåterställning
aktiveras av att denna PR skapas eller mergas.

## Konkret körbar produktionsplan

Den tidigare generella driftplanen har ersatts av
[RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md), låst till kit-/releasecommit
`dade9b6c16df3e0ec61484e0ff10dd558744d695`. Den omfattar:

- Installation av tre SHA-256-verifierade källkodsfiler på befintliga disken.
- Exakt tillfällig Start Command som endast kör `maintenance.mjs`. Appen och
  migratorn importeras aldrig; en omstart återgår till samma underhåll.
- Privat autentiserad loopback-kontroll, process-/filkontroller och native
  SQLite-backup med schema/ägare/integritet/FK/antal/utrymme/hash-verifiering.
- Privat mål på ägarens iPad i iSH: `/root/JARVIS-backuper/<backup-id>/`,
  överfört direkt via Render SSH/SFTP, med checksumma och 30 dagars retention.
- Avstängd auto-deploy och den kopplade Blueprintens Auto Sync under fönstret.
- Merge först efter backupgrinden, specifik release-SHA, och ett startkommando
  som håller fel commit, saknad DB eller pågående restore i underhåll.
- Riktad verifiering med en avsiktlig Live-uppgift och separat fysisk Safari-
  acceptans efter godkänd deployment; ingen ny betald preview.
- Resumabel offline-restore med privat DB/WAL/SHM-karantän och kodlåst gammal
  start. Render Rollback-knappen används inte för databasåterställningen.

Planerad stängning: reservera 30 minuter, uppskattat 15–30 minuter vid liten
databas och förberedd åtkomst. Eventuell återställning kan tillföra 10–20 minuter.
Det är en arbetsuppskattning, inte uppmätt kapacitet eller garanterad återtid.

## Verifiering och status per återstående delkrav

Den befintliga `node --import tsx scripts/verify-recovery.mjs` har återanvänts
och passerar med driftverktygens faktiska backup/restore-funktioner. Den testar
öppen WAL-backup, fem tabellers innehåll, migration/omöppning, gamla serverns
Live-fel trots 200 health, återställda skrivningar/konto-isolering och förlust
av post-backup-data. Nya kontrollfall täcker privata kontrollrutter, fel tjänst/
ägare, öppen DB, skadad backup, ogiltigt ID, och återupptagning efter avbrott
mitt i karantänsättning med kvarvarande WAL/SHM samt efter atomisk installation.
Alla data är syntetiska och temporära. Syntax- och diffkontroll passerar.

Den lokala processvakten använder en `/proc`-fixture med verkliga filhandtag
för testprocessen eftersom executorn begränsar andra processers metadata.
Produktionsingången använder alltid `/proc` och avbryter vid oläsbara handtag
för samma UID. Den kontrollen måste passera i underhåll innan backup/migration.
Detta är en explicit åtkomstgrind, inte ett kvarlämnat krav att uppfinna en
stoppmetod. Inga Render-inställningar eller produktionsdata har ändrats.

| Delkrav | Status / exakt återstående steg |
| --- | --- |
| Rätt workspace, repo, tjänst, branch och aktiv commit | Klart via connectorn, oförändrat vid omkontroll |
| Build/start/health/auto-deploy/disk jämfört med PR | Klart; dashboardens ordinarie värden är redan korrekta |
| Historiskt build-/tsx-fel | Klart som tydligt attribuerat användarunderlag; gamla connectorloggar krävs inte |
| Aktiv DB-path, Node och fritt utrymme | Klart via inloggad Shell 15 oktober; värden och marginal ovan |
| Blueprint Auto Sync / full processinspektion | Blockerat av avslutad dashboardsession och timeout vid återinloggning; exakt läskontroll i körplanen |
| Körbar backup och tydlig stopp-/restore-väg | Klart lokalt; verkliga driftverktyg och återanvänd övning, installation/backup ännu inte godkända |
| Privat backupmål | Konkret föreslaget: ägarens iPad/iSH; enhetsutrymme, SSH-nyckel/Render-behörighet och SFTP måste bekräftas |
| Relevanta regressioner | Klart: fokuserad återställningsövning och syntax/diff; hela appsviten har inte upprepats utan appändring |
| Fysisk Safari | Planerad efter separat godkänd deployment, ingen ny preview |
| Produktionsbackup/inställningar/merge/deploy | Ej utfört; separat beslut krävs efter åtkomstgrindarna |

Nästa enda åtgärd på mobil: öppna den kopplade Blueprintens **Settings** från
tjänstens Blueprint-länk och läs **Auto Sync** (Yes/No), utan att ändra värdet.
Därefter följer process- och backupåtkomstkontrollerna i körplanen.
Begär inte lösenord, tokens, DB-filer,
hela miljölistor eller nya historiska loggar. Produktionsåtgärder förblir ett
förslag tills förutsättningarna är verifierade och ägaren uttryckligen godkänt.
Etapp 2 har inte påbörjats.
