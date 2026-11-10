# PRE-INTEGRATION — utvecklingsplan och kravmatris

Uppdrag mottaget 10 november 2026. Målet är **PRE-INTEGRATION READY**: en
lokalt verifierad app före riktiga GroqCloud-/Fish Audio-anrop och mikrofon.
Detta är inte en release eller ett besked om färdig produktionsbackup.

## Verifierad utgångspunkt

- GitHub-läsning och git-fetch: main `a21a3a9b4877ce31afc8eec28ae5557854f01b01`.
- PR #7 är öppen, draft och omergad; head
  `6abfbb0572f526fa9ad7c52f429c74ea2c1226ff` på `codex/etapp-1-stabil-grund`.
- Alla basfiler kommer från den head-committen. Ren lokal checkout, inga
  ocommittade användarändringar. En checkout används.
- Ny branch `codex/pre-groq-fish-foundation`, skapad även via GitHub-connectorn.
  Ny draft-PR ska ha `codex/etapp-1-stabil-grund` som bas och bero på PR #7.
- Öppna PR #4/#5 är äldre hostingvarianter; deras heads skiljer sig från main
  endast i tidigare hosting-/progressdetaljer. Inget annat foundationarbete hittat.
- Baslinje: typecheck, 31 tester, build och diff-check passerar. Första npm ci
  misslyckades på otillgänglig standardcache; ny cache under arbetskatalogen
  löste installationen utan ändring av lockfilen eller paketversioner.

## Genomförandeval och ordning

P-numren nedan definierar detta uppdrag, inte historiska Phase A–E/Etapp 1.
React/TypeScript/Vite/Express/SQLite och tre vyer behålls. Nya kontrakt använder
Zod. Nya framåtriktade migrationer ändrar inte migration 1–2 eller driftkitet.
Tasks får versionskontroll; samtal och idempotenta operationer binds till konto.
Historik använder sekvenscursor. Demo och utkast stannar i klientminnet.
Providergränser testas via injektion, aldrig via Live-flaggor eller credentials.

| Del | Avgränsade krav | Status vid start |
| --- | --- | --- |
| P0 | Källor, behörigheter, baslinje, branch, separat draft-PR | Bas/branch/baslinje korrekt; PR återstår |
| P1 | Små domänmoduler, delade validerade kontrakt, bevarad sessionssemantik | Återstår |
| P2 | Skapa/lista/redigera/slutföra/återöppna/radera, versioner, filter/sök, Demo, ägarskap | Återstår |
| P3 | Flera samtal, namn/arkiv, legacyhistoria, begränsad cursor, scroll, utkast, semantiska turer | Återstår |
| P4 | Beständig payloadbunden idempotens, atomisk lokal effekt, manuellt retry/status, avbrott/logout | Återstår |
| P5 | Tre vyer, 44px/16px/fokus/dialog, 320/390/430/820, 200%, kort höjd, verkliga tillstånd | Grund korrekt; nya flöden återstår |
| P6 | Session/owner, Origin, 429, kropp/text/sida/samtidighet, säkra fel/loggar/cache/rendering | Session/owner korrekt; övrigt återstår |
| P7 | Chat/transkription/talsynteskontrakt, capability, avstängd standard, testprovider, SSE/context/budget | Återstår |
| P8 | Ljudmetadata/validering/tillstånd/avbrott, Voice Focus, överlämning utan mikrofon | Mikrofon av; övrigt återstår |
| P9 | Regressioner, migration/recovery, ren produktionsstart, browser, dokument/commits/PR/handoff | Baslinje korrekt; slutverifiering återstår |

Matrisen utökas med konkreta krav och verifieringsbevis vid leverans.

## Produktionsstopp och fortsättningspunkt

Ingen merge, deployment, produktionsomstart, Render-inställning, credential,
ägare, produktionsdatabas, återställning, automatik eller betald resurs ändras.
Driftkitet `dade9b6...` lämnas orört. Senaste Render-observation är 9 november,
inte en ny kontroll i detta uppdrag. Backup på Render är historiskt bekräftad;
privat kopia/hash/slutverifiering/exakt skapandetid återstår. Ägarens nya underlag
anger skapad iSH-katalog och visad SFTP-anslutning, inte färdig överföring.

Senaste verifierade bas: `6abfbb0572f526fa9ad7c52f429c74ea2c1226ff`.
Nästa konkreta uppgift: delade kontrakt, framåtmigration och task-/samtals-
operationer med tester. Riktiga providers och fysisk Safari hör till separat
senare uppdrag; produktionsrelease är fortsatt stoppad.
