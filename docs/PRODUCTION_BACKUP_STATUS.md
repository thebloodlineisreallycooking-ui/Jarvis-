# Produktionsbackup — kontrollpunkt 22 oktober 2026

## Godkännande och stoppunkt

Ägaren har uttryckligen godkänt installation av det granskade driftkitet,
paus av Blueprint Auto Sync och auto-deploy, det särskilda underhållsläget,
konsekvent SQLite-backup samt verifierade kopior på Render och iSH på iPhone.
Det nödvändiga avbrottet är godkänt. Skärmlås med kod och användning av Face ID
är bekräftade av ägaren. Inget ytterligare godkännande för dessa steg behövs.

Merge/deployment av PR #7, migration, återställning, återaktivering av automatiken,
radering och nya betalda resurser ingår inte. Efter genomförd backup ska appen
lämnas i det särskilda underhållsläget och detta tydligt rapporteras.

## Senaste faktiskt observerade läge

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

## Verifierad verktygskälla, ännu inte installerad av detta arbete

Låst version: `dade9b6c16df3e0ec61484e0ff10dd558744d695`.
GitHubs tree för denna commit jämfördes med lokala Git-blob-ID:n för alla tre
filerna. Lokal SHA-256 matchade körplanens låsta värden:

| Fil | SHA-256 |
| --- | --- |
| `client.mjs` | `ac9947b7040b07f4f935b3580086c1584034e516f25c5423f30809fa1c61674d` |
| `database.mjs` | `4d4c9dc4cd49ee3a5df28242673673c9a33379d770419cb975a33e82a20f7392` |
| `maintenance.mjs` | `e91843d664d38c57bd63a1e4e70a2d6284d476fcd3f4d7c98e60acf4548ddb68` |

Detta verifierar källversionen, inte installation på Render. Installern i
[körplanen](RELEASE_RUNBOOK.md) verifierar nedladdade bytes igen innan installation.
Kontrollera eventuell redan befintlig installation innan något upprepas.

## Åtkomsthinder och nästa säkra steg

Render-connectorn kan läsa tjänst och deployer men erbjuder inte ändring av
Blueprint Auto Sync, startkommando eller auto-deploy och saknar runtime-Shell.
Dashboarden visade inloggningssidan. Det stödda säkra inloggningsflödet returnerade
`declined`; inget nytt inloggningsförsök eller alternativ credentialflöde gjordes.
Appen har inte stängts av medan åtkomsten saknas.

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
