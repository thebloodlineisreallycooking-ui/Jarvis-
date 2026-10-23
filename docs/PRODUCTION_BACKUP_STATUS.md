# Produktionsbackup — kontrollpunkt 23 oktober 2026

## Underhållsprogrammet live — privat runtimekontroll och backup återstår

Ägaren startade den godkända manuella deploymenten med gamla revisionen.
Render-connectorn verifierar `dep-dbdnalcs728c73cic4qg`, commit
`a21a3a9b4877ce31afc8eec28ae5557854f01b01`, som **live** sedan
`2026-10-23T14:56:03.179969Z` (16:56 svensk tid). Den tidigare live-deployen
`dep-db2k2kmi0phs738s20k0` är nu `deactivated`.

En riktad runtimeavläsning visar att underhållsprogrammet rapporterade klar
start kl. 16:55:57 på instans `srv-db1vle3bc2fs73em1t30-6vg4j`, med app och
migrationer ej startade. Hela startkommandot är oförändrat och korrekt.
Render Maintenance Mode är fortsatt på, auto-deploy Off och inga konkurrerande
deployer syns bland de senaste fem resultaten. Blueprint Auto Sync No är
tidigare ägarbekräftat. Webappen förblir stängd för publika anrop.

Nästa steg är `client.mjs status` via befintlig SSH/iSH för rätt tjänst,
gammal `deployedCommit`, `applicationStarted: false`, `busy: false` och
`restorePending: false`. Statuskommandot läser inte databasinnehåll.
Backupoperationens processgrind måste därefter bekräfta att ingen annan process
håller databasen eller dess sidofiler öppna innan SQLite-backupen börjar.
Denna processgrind och databasschemat är ännu inte kontrollerade på nya instansen.

Ingen backup har skapats eller överförts i detta steg. PR #7 är fortsatt
öppen, draft och omergad; PR-koden är inte driftsatt. Inga migrationer eller
återställningar har körts. Installation och underhållsdeployment ska inte
upprepas. Bara sanerad status sparas här, inga loggfiler eller skärmbilder.

## Underhållsstartkommando sparat — tidigare kontrollpunkt samma dag

Efter ägarens dashboardbild verifierade connectorn hela Start Command:

```sh
node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/maintenance.mjs
```

Tjänstens inställning uppdaterades `2026-10-23T12:45:45.825123Z`
(14:45 svensk tid). Render Maintenance Mode är fortsatt på och auto-deploy
Off. Byggkommando, main-branch, healthcheck och disk är oförändrade.
De fem senaste deployresultaten visar ingen ny, pågående eller köad deployment;
den gamla live-deployen är fortfarande `dep-db2k2kmi0phs738s20k0` från 6 oktober,
med `a21a3a9b4877ce31afc8eec28ae5557854f01b01`. Sparad inställning bevisar därför
inte att underhållsprogrammet kör eller att den gamla appens processer stoppats.

Nästa godkända steg enligt körplanens steg 3 är **Manual Deploy → Deploy a
specific commit** med exakt `a21a3a9b4877ce31afc8eec28ae5557854f01b01`.
Det aktiverar underhållsstartprogrammet med den gamla koden. Connectorns
deployverktyg saknar argument för specifik commit, så denna åtgärd sker via
ägarens dashboard. Vänta på live-status och kör sedan den privata
`client.mjs status`-kontrollen via befintlig SSH innan backup.

Webappen är fortfarande stängd för publika anrop. Verkligt skrivstopp är ännu
inte verifierat. Ingen backup eller migration har körts. PR #7 är fortsatt
öppen, draft, omergad och odriftsatt. Blueprint Auto Sync No är tidigare
ägarbekräftat. Kitinstallationen ska inte upprepas.

## Render Maintenance Mode på — tidigare kontrollpunkt samma dag

Efter ägarens bekräftelse den 23 oktober verifierade Render-connectorn
`maintenanceMode.enabled: true` på rätt tjänst. Tjänstens uppdateringstid är
`2026-10-23T10:18:00.57773Z` (12:18 svensk tid). Webappen är nu stängd för
publika anrop under det godkända avbrottet. Detta edge-läge stoppar inte
applikationens processer: Start Command är fortfarande `npm start`.

Auto-deploy är fortsatt Off. Ingen pågående eller köad deployment syns i de
fem senaste resultaten. Live-revision och GitHubs main är fortfarande
`a21a3a9b4877ce31afc8eec28ae5557854f01b01`; PR #7 är öppen, draft och omergad.
Blueprint Auto Sync No är tidigare användarbekräftat.

Nästa redan godkända steg är att ersätta Start Command med exakt:

```sh
node /var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/maintenance.mjs
```

Detta ska starta det installerade underhållsprogrammet med den gamla revisionen,
utan app eller migrator. Vänta därefter på rätt live-instans och kontrollera
status enligt körplanen. Verkligt skrivstopp är ännu inte verifierat. Ingen
backup, migration, återställning eller PR-deployment har utförts i detta steg.
Render Maintenance Mode ska lämnas på medan arbetet fortsätter.

## Driftkit installerat — tidigare kontrollpunkt samma dag

Användarens iSH-underlag från 23 oktober kl. 11:24 visar att den granskade
SSH-installationen avslutades med `Pinned operations kit installed; application
unchanged.` Före installation visade separat SSH-kontroll rätt gamla commit,
`DATABASE_PATH=/var/data/jarvis.db` och `KIT_MISSING`. Installationen ska inte
upprepas. Resultatet är användartillhandahållet runtimeunderlag, inte en direkt
Shell-körning av agenten.

Installerad version är `dade9b6c16df3e0ec61484e0ff10dd558744d695`, med endast
`client.mjs`, `database.mjs` och `maintenance.mjs` i
`/var/data/jarvis-ops/dade9b6c16df3e0ec61484e0ff10dd558744d695/`.
Installern kontrollerade de tre SHA-256-värdena nedan före atomisk installation,
skapade katalogen med 0700 och filerna med 0400 samt synkroniserade till disk.
Den öppnar ingen databas och startar varken applikation eller migrator.

Efter installationsunderlaget verifierade connectorn fortfarande auto-deploy
Off, `npm start`, Render Maintenance Mode av och samma gamla live-commit.
Ingen pågående eller köad deployment syns bland de fem senaste resultaten.
PR #7 är fortsatt öppen, draft och inte mergad. Ingen produktionsbackup,
migration eller PR-deployment har genomförts. Appens underhållsavbrott har ännu
inte startats. Blueprint Auto Sync No är fortsatt användarbekräftat.

Nästa redan godkända steg är att aktivera Render Maintenance Mode på befintliga
tjänsten, följt av det separata underhållsstartkommandot enligt körplanen.
Edge-läget ensamt stoppar inte appens processer. Backup får köras först när
underhållsprocessen är live och kontrollerna visar verkligt skrivstopp.
Denna installationsstatus ersätter tidigare uppgifter nedan om saknat driftkit.

## Automatik pausad 23 oktober

Ägaren bekräftade att Blueprint Auto Sync ändrats från Yes till No.
Detta är användarbekräftat, inte en direkt dashboardavläsning av agenten.
Ägaren stängde därefter av tjänstens auto-deploy; Render-connectorn verifierade
`autoDeploy: no`, `autoDeployTrigger: off` och tjänstens uppdateringstid
`2026-10-23T04:57:06.150902Z`. Samma repository, tjänst och main-branch kvarstår.
Start är fortfarande `npm start` och Render Maintenance Mode är av.
De fem senaste deployerna innehåller ingen pågående eller köad deployment;
den gamla live-committen är oförändrad. Ingen backup eller driftkitinstallation
har utförts av detta arbete. Nästa steg sker via befintlig SSH i iSH:
läs aktuell runtime-commit, DATABASE_PATH och om den låsta kitkatalogen redan
finns innan installation. Appen är fortfarande i normal drift enligt dessa
driftinställningar; inget underhållsavbrott har inletts.

Denna kontrollpunkt ersätter nedanstående uppgifter från 22 oktober om att
automatiken fortfarande är på och att nästa steg är att läsa Auto Sync.

## Godkännande och stoppunkt

Ägaren har uttryckligen godkänt installation av det granskade driftkitet,
paus av Blueprint Auto Sync och auto-deploy, det särskilda underhållsläget,
konsekvent SQLite-backup samt verifierade kopior på Render och iSH på iPhone.
Det nödvändiga avbrottet är godkänt. Skärmlås med kod och användning av Face ID
är bekräftade av ägaren. Inget ytterligare godkännande för dessa steg behövs.

Merge/deployment av PR #7, migration, återställning, återaktivering av automatiken,
radering och nya betalda resurser ingår inte. Efter genomförd backup ska appen
lämnas i det särskilda underhållsläget och detta tydligt rapporteras.

## Historiskt läge före produktionsåtgärderna den 22 oktober

Läsande Render- och GitHub-kontroller utfördes den 22 oktober. Inga
produktionsmutationer har utförts i denna kontrollpunkt.

| Kontroll | Resultat |
| --- | --- |
| Workspace / tjänst | `My Workspace` / `jarvis-private`, `srv-db1vle3bc2fs73em1t30` |
| Repository / branch | Exakt begärt GitHub-repo / `main` |
| Live-deploy / kod | `dep-db2k2kmi0phs738s20k0` / `a21a3a9b4877ce31afc8eec28ae5557854f01b01` |
| Senaste deployment | `dep-dbb7mhs9v7es73aesl9g`, avbruten 19 oktober; inte startad av detta arbete |
| Konkurrerande deployment | Ingen pågående eller köad i de fem senaste returnerade deployerna; kontrollera igen före ändring |
| Start / bygge / healthcheck | `npm start` / `npm ci --include=dev && npm run build` / `/api/health` |
| Auto-deploy | På, trigger `commit` |
| Blueprint Auto Sync | Senast användaravläst **Yes** den 19 oktober; aktuell dashboardavläsning saknas |
| Underhåll | Render Maintenance Mode **av**; särskilt underhållsstartkommando inte installerat som startinställning |
| Disk | Befintlig `jarvis-data`, 1 GB, monterad på `/var/data` enligt connectorn |
| Databasschema | Inte avläst direkt i denna kontroll; backupgrinden kräver schema 1 |
| PR #7 | Öppen, draft, inte mergad; head vid kontroll `21a7a87357680382fa34e06bc913c53b6a5527cb` |
| Produktionsbackup | Inte skapad eller verifierad av detta arbete; inget backup-ID, byteantal eller backuphash finns att rapportera |

Tidigare användarunderlag verifierar `DATABASE_PATH=/var/data/jarvis.db`,
Node `v24.21.0`, cirka 958 MiB ledigt på Render, fungerande SSH/SFTP,
iPhone-utrymme och läsbar processinspektion. Detta är tidigare observationer,
inte nya runtimeavläsningar. En öppen DB-process observerades under normal drift;
backupgrinden måste senare bekräfta noll skrivande/DB-hållande processer.

## Verktygsversion och verifierade checksummor

Låst version: `dade9b6c16df3e0ec61484e0ff10dd558744d695`.
GitHubs tree för denna commit jämfördes med lokala Git-blob-ID:n för alla tre
filerna. Lokal SHA-256 matchade körplanens låsta värden:

| Fil | SHA-256 |
| --- | --- |
| `client.mjs` | `ac9947b7040b07f4f935b3580086c1584034e516f25c5423f30809fa1c61674d` |
| `database.mjs` | `4d4c9dc4cd49ee3a5df28242673673c9a33379d770419cb975a33e82a20f7392` |
| `maintenance.mjs` | `e91843d664d38c57bd63a1e4e70a2d6284d476fcd3f4d7c98e60acf4548ddb68` |

Källversionen verifierades före installation. Installern i
[körplanen](RELEASE_RUNBOOK.md) verifierade nedladdade bytes igen innan den
rapporterade lyckad installation enligt användarunderlaget ovan.

## Historik: dashboardåtkomst och övergång till iSH

Render-connectorn kan läsa tjänst och deployer men erbjuder inte ändring av
Blueprint Auto Sync, startkommando eller auto-deploy och saknar runtime-Shell.
Dashboarden visade inloggningssidan. Det stödda säkra inloggningsflödet returnerade
`declined`; inget nytt inloggningsförsök eller alternativ credentialflöde gjordes.
Appen har inte stängts av medan åtkomsten saknas.

Efter ägarens nya instruktion att fortsätta återupptogs det säkra flödet:
Render → GitHub → Google. Kontovalet hos Google returnerade åter `declined`.
Inloggning till Render är inte verifierad och inga produktionsåtgärder följde.
Ingen privat nyckel, lösenfras eller lösenord begärdes i chatten.

Nästa säkra manuella steg är att läsa aktuell **Settings → Auto Sync** på
Blueprint `exs-db1vjsu7bikc73bt8gdg`, utan ändring, så ursprungsvärdet registreras.
Fortsätt sedan den redan godkända körplanen med en verifierad åtgärd åt gången.
Innan en inställningsändring kan utlösa synk/deployment måste automatiken vara
pausad och deployments kontrollerade på nytt. Installera endast de tre driftfilerna.

Avsedda backupmål, ännu utan skapad/verifierad backup vid denna kontrollpunkt:
`/var/data/jarvis-backups/<backup-id>/` på Render och
`/root/JARVIS-backuper/<backup-id>/` i iSH. DB och detaljmanifest ska gå direkt
med befintlig SFTP mellan dessa mål. Inga sådana filer har hämtats till ChatGPT,
lagts i GitHub eller publicerats. Matchande SHA-256 och exakt storlek måste
fortfarande verifieras på båda platserna innan separat releasebeslut.

Endast dokumentation har ändrats. Ingen full testsvit körs om för denna
statusuppdatering; `git diff --check` används före sparandet.
