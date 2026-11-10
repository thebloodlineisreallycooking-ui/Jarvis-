# PRE-INTEGRATION — leveransrapport

10 november 2026. **PRE-INTEGRATION READY.** P0–P9 är klara inom det
auktoriserade utvecklingsuppdraget. Den detaljerade [kravmatrisen](PRE_INTEGRATION_PLAN.md)
anger status och bevis per avgränsat krav. AI och röst är fortfarande ej anslutna.

## Vad användaren kan göra

- Skapa uppgifter med kontroll eller svenska/engelska kommandon, söka/filtrera,
  ändra titel, slutföra, återöppna och bekräfta fysisk radering. Ändringar består
  efter omladdning/serveromstart. En gammal version ger konflikt och omläsning.
- Skapa och välja samtal, byta namn, arkivera/återöppna och läsa äldre historik.
  Trådbyte bevarar separata utkast i minnet. Ett sent svar hör till tråden och
  läget där operationen startades.
- Återhämta ett tappat svar manuellt med samma request-ID, utan en andra uppgift
  eller dubbla meddelanden. Ett nytt avsiktligt likadant kommando får ett nytt ID.
- Prova hela uppgiftsflödet i Demo utan API-skrivningar. Demo och alla privata
  utkast försvinner vid reload eller bekräftat sessionsslut.
- Skriva vanlig text i Live; den sparas med en tydlig systemnotis om saknad AI.
  Voice Focus erbjuder text och visar **Röst ej ansluten**.

## Ursprung och GitHub

| Referens | Verifierat värde |
| --- | --- |
| Main / historisk produktionskod | `a21a3a9b4877ce31afc8eec28ae5557854f01b01` |
| Fryst PR #7-head och gemensam bas | `6abfbb0572f526fa9ad7c52f429c74ea2c1226ff` |
| PR #7 | Öppen draft, omergad; `codex/etapp-1-stabil-grund` |
| Utvecklingsbranch | `codex/pre-groq-fish-foundation` |
| Leverans | [Draft-PR #8](https://github.com/thebloodlineisreallycooking-ui/Jarvis-/pull/8), bas `codex/etapp-1-stabil-grund`; beror på #7 |
| Plancheckpoint | `77a4e381287a644ad0321f14f33b9fe808d8ba36` |
| Tasks/samtal/operationer | `45dff7ee37a75b5136fc216559253bec3a0cf484` |
| Slutlig verifierad kod | `c6794bda7406ea5873d0fe0b95ac7dd4f32bf421` |

Kodcheckpointen är pushad och dess fulla SHA verifierad genom både `ls-remote`
och GitHub-connectorns PR-head. Slutmatris/rapport/spec/historiska förtydliganden
sparas därefter i en separat dokumentcommit. Leveransbesked/PR beskriver dess
exakta head; ingen produktkod ändras efter den verifierade kodcheckpointen.
Ingen force-push, merge eller ändring av main/PR #7 har gjorts.

Vid start lästes AGENTS, senaste PROGRESS och driftstatus, package/lock, samtliga
TS/Vite/Vitest-konfigurationer, render.yaml, server/app/index/db/migrationer,
shared-kontrakt, klientens api/workspace/main/styles, tester och alla tre
verifieringsskript samt README, SPEC, SETUP, ETAPP_1_REPORT,
RENDER_OPERATIONS_REVIEW och RELEASE_RUNBOOK. Nya moduler har också granskats.
Öppna PR #4/#5 avsåg äldre hostingvarianter; inget tidigare foundationarbete
hittades. En ren checkout från samma #7-head användes genom hela arbetet.

## API och operationer

Alla privata rutter kräver sessionscookie och härleder konto från sessionen.
Skrivningar kräver samma Origin. `requestId` är ett klientgenererat UUID.
Task-/kommandoskrivningar har dessutom `conversationId` och `mode: "live"`;
konversationsskrivningar binds till Live på servern. Okända indatafält avvisas.

| Metod och `/api`-väg | Kontrakt / beteende |
| --- | --- |
| POST `/auth/login`, `/auth/logout` | Befintlig ägarsession; logout kräver session. Publik registerfunktion är avstängd i production |
| GET `/health` | Oautentiserad enkel DB-liveness; bevisar inte skriv-/schemakompatibilitet |
| GET `/tasks` | `status=all/open/completed`, `search`, `limit`, `cursor`; `tasks`, filterrelevanta `counts`, `nextCursor` |
| GET `/tasks/:id` | Aktuell ägd uppgift; samma 404 för saknad och annan användares ID |
| POST `/tasks` | Envelope + `title`; beständigt operationskvitto, HTTP 201 |
| PATCH `/tasks/:id` | Envelope + aktuell `version` och `title` och/eller `status`; 409 vid versionskonflikt |
| DELETE `/tasks/:id` | Envelope + `version`; fysisk radering, historiken kvar |
| GET `/conversations` | Begränsad cursorlista, både öppna och arkiverade |
| GET `/conversations/:id` | Aktuellt samtal; används även efter ett historiskt mutationskvitto |
| POST `/conversations` | `requestId`, `title`; samma ID ger samma ursprungliga samtalskvitto |
| PATCH `/conversations/:id` | `requestId`, `version`, `title` och/eller `status=open/archived`; samma-ID-replay och CAS |
| GET `/conversations/:id/messages` | `limit`, `cursor`; stigande `sequence` i varje sida samt `nextCursor` |
| POST `/commands` | Envelope + `text`; lokal parser eller sparad text med `system_notice` |
| GET `/operations/:id` | Beständigt task-/command-/chatkvitto eller pending/unknown-status |
| GET `/capabilities` | Autentiserad serverberäknad chat/transcription/speech-status och säker orsak |
| POST `/chat/stream` | Envelope + text; fetch-SSE med testprovider, annars 503 `PROVIDER_NOT_CONFIGURED` |

Task-/command-/chatkvitton innehåller request-/samtals-ID, status, ursprunglig
task eller raderat ID, högst två meddelanden, `persisted` och säker felkod.
Direkta taskkontroller producerar inga påhittade samtalsturer. Textkommandon
sparar exakt användartur och command_result/system_notice med effekten och
kvittot i samma transaktion. Samtalsmutationer returnerar `{conversation}`;
okänt resultat återhämtas genom samma idempotenta mutation och aktuell GET,
inte genom task-/chatstatusrutten.

Samma konto/ID med annan validerad payload eller operationstyp ger 409.
Slutförda kvitton ändras inte när uppgiften senare ändras/raderas. UI läser
aktuellt innehåll separat och validerar dess läge/identitet. Lokal rollback
lämnar ingen halv effekt eller ofullständigt meddelandepar. Providerarbete
ligger utanför SQLite-transaktion; detaljer om stream/avbrott/restart finns i
[PROVIDER_HANDOFF](PROVIDER_HANDOFF.md).

Tidigare `/messages`- och kommandokontrakt ersätts av trådbundna kontrakt.
En framtida release måste uppdatera klient och server tillsammans. Detta är
inte ett löfte att en redan öppen gammal klient kan fortsätta skriva.

## Datamodell och historik

| Tabell | Nytt / bevarat |
| --- | --- |
| `accounts`, `sessions` | Befintliga ägare/lösenord/sessioner bevaras. Ett standardsamtal skapas atomiskt vid nytt lokalt konto |
| `tasks` | ID/konto/titel/status/skapandetid bevaras; `updated_at`, `completed_at`, `version`; nya ID återanvänds inte efter delete |
| `conversations` | Sammanhörande konto/ID, titel, open/archived, tid och version. Äldre konto får `legacy-<id>` / “Tidigare samtal” |
| `messages` | Befintliga ID/sequence/roll/innehåll/tid bevaras. Tillagt samtals-ID, nullable operations-ID, kind och delivery |
| `operations` | Primärnyckel konto/request-ID; Live, tråd, kind, kanonisk privat payload, status, beständigt resultat och tider |

Nya statusvärden är `open/completed` för uppgifter, `open/archived` för samtal
och `pending/succeeded/failed/cancelled/unknown` för operationer. Meddelandets
kind skiljer `user_input`, `command_result`, `system_notice`, `provider_response`
och `legacy`; `delivery` är `complete/interrupted`. Legacydata tilldelas inga
uppdiktade historiska par eller länkar till uppgifter. Okända gamla taskstatusar
bevaras i DB och avvisas vid läsning; de maskeras inte som öppna uppgifter.

Historikens cursor innehåller konto, samtal, strikt `before` och ett fast
sekvenstak från första sidan. Nya turer påverkar inte äldre sidors medlemskap.
Klienten slår samman på meddelande-ID och ordnar efter sequence. Task- och
samtalslistor använder fallande ID/rowid; taskcursor binds dessutom till filter
och sökning. Cursor är base64url-kodad JSON, inte en behörighet eller hemlighet:
servern kontrollerar alltid sessionens konto och resursernas ägarskap.

## Säkerhet, gränser och proxyantaganden

| Resurs | Faktisk gräns / policy |
| --- | --- |
| JSON-body | 32 KiB; 400 för trasig JSON, 413 för för stor body |
| Text / tasktitel / samtalsnamn | 2 000 / 200 / 100 JS-strängenheter efter trim; ingen tyst trunkering |
| Sidor | Standard 50, högst 100; cursor högst 512 tecken |
| Login/utvecklingsregister | 10 anrop per 15 minuter per socket-IP, delad räknare |
| Autentiserade domänmutationer | 120 per minut per konto; 429 och Retry-After |
| Rate-limit-minne | Högst 10 000 aktiva buckets per limiter; processlokalt, nollställs vid omstart |
| Provider | 2 samtidigt per konto, 8 per process; 30 s providerdeadline, 35 s klientdeadline |
| Kontext / svar / chunk | 24 turer och 12 000 strängenheter / 12 000 / 512; ytterligare SSE-/ljudgränser i handoff |
| SQLite | WAL, foreign_keys på, 3 s busy_timeout; all migration i transaktion |
| API-cache | `Cache-Control: private, no-store`, `Pragma: no-cache`; inga privata browsercacher |

Produktions-Origin jämförs exakt med `JARVIS_ORIGIN` om satt, annars
`https://<Host>`. TLS termineras före appen; den betrodda proxyn måste bevara
den publika Host-adressen och hindra godtyckliga alternativa värdnamn.
Ett explicit publikt `JARVIS_ORIGIN` rekommenderas vid framtida hostkonfiguration;
inget sådant produktionsvärde har ändrats här. `X-Forwarded-Host/Proto/For`
används inte som behörighets-/limiterunderlag. Loginbegränsningen kan därför
delas av användare bakom samma proxy; den är inte ett distribuerat skydd.

Originlösa anrop tillåts enbart för en explicit injicerad loopback-testharness
utan Fetch-Site-header. Produktionsstarten injicerar inte detta undantag.
Cross-site, saknad/null/fel Origin avvisas. Ingen generell CORS har införts.
Cookie är HttpOnly, SameSite Strict och Secure i produktion.

React renderar privata texter som text, inte HTML. CSP begränsar script och
anslutningar till self. Serversvar/loggar använder fasta koder och serverns
request-ID; privata prompts, cookies, SQL, stackar och providerexceptions loggas
inte. Nyckelvärden har varken lästs eller begärts. `.env.example` innehåller
endast tomma framtida providerfält; standardfactory läser dem inte.

## Migration, kompatibilitet och återställning

Migration **3** är ny och framåtriktad. SQL för migration 1 och 2 är oförändrad
mot den verifierade basen. Hela migreringen inklusive versionsregistrering är
transaktionell; FK-kontroll körs före commit och framtida/ofullständig
schemahistorik avvisas. Misslyckad öppning stänger DB-anslutningen.

| Kodrevision | Schema 1 | Schema 2 | Schema 3 |
| --- | --- | --- | --- |
| Main `a21a3a9…` | Stöds och återställningsprovat | Inkompatibel gammal positionsbaserad message-insert; historiskt dokumenterat | Inkompatibel; faktisk gammal kod får Live-fel trots health 200 i övningen |
| PR #7 `6abfbb0…` | Migrerar till 2 | Avsedd version | Ingen stödd bakåtkompatibilitet; gamla inserts saknar nya obligatoriska trådfält enligt kodgranskning |
| Ny kod `c6794bd…` | Migrerar via 2 till 3, syntetiskt provat | Migrerar till 3, syntetiskt provat | Stöds; upprepad start och persistens provade |

**En kodrollback ensam är inte återställning.** Den lokala övningen använder
verklig gammal källkod via `git show` och engångsdatabaser. Native SQLite-backup
inkluderar committad WAL, bevarar alla fem gamla tabeller och verifieras med hash,
integritet/FK. Övningen migrerar till 3, visar gammal kods skrivfel, stänger
appanslutningar, isolerar DB/WAL/SHM, återställer schema-1-snapshot och startar
matchande gammal kod. Avbruten quarantine/install återupptas under underhåll.
Återställning förlorar post-backup-skrivningar; skrivstopp eller uttryckligt
beslut om förlust/avstämning behövs före ett verkligt återställningsbeslut.

Installerat driftkit `dade9b6c16df3e0ec61484e0ff10dd558744d695` är oförändrat.
Dess schema-1-grind **avvisar schema-3-capture**, vilket testas. Kitets stöd för
backup/återställning av ny driftversion har inte utökats. Framtida samlad release
kräver en ny granskad, versionsanpassad driftplan och bedömning av backupens
aktualitet. Ingen driftinstruktion i denna rapport ger tillstånd att köra den.

Övningens `/proc`-kontroll använder en fixture för testprocessens egna handtag,
eftersom miljön begränsar andra processers filer. Riktig produktionskontroll
är oförändrad och måste senare verifieras på hosten. Ingen produktionsdata
hämtades och ingen faktisk Render-återställning eller migration utfördes.

## Faktisk verifiering och begränsningar

Kodunderlag: `c6794bda7406ea5873d0fe0b95ac7dd4f32bf421`. Node 24.19.0,
npm 11.9.0. Samtliga nedanstående kontroller passerade på denna kod; efteråt
ändrades endast dokumentation. Baslinjen hade 31 tester; slutresultatet är
**65 tester i 6 filer**. Testantalet omfattar parametriserade fall.

```sh
npm_config_cache=/workspace/work/npm-cache npm ci --include=dev
npm run typecheck
npm test
npm run build
git diff --check
npm_config_cache=/workspace/work/npm-cache node scripts/verify-production.mjs
node --import tsx scripts/verify-recovery.mjs
JARVIS_CHROMIUM_PATH=/usr/bin/chromium JARVIS_REVIEW_OUTPUT=/workspace/work/browser-review-final node scripts/verify-browser.mjs
```

Installationens ursprungliga npm-cache var inte skrivbar; arbetskatalogens cache
löste det utan paket-/lockändring. `verify-recovery` måste köras med `--import tsx`:
en körning utan loader avvisades av Node, varefter rätt kommando passerade.
Inga sådana misslyckade försök räknas som godkända kontroller.

Prod-skriptet gjorde en ren kopia, `npm ci --include=dev`, build, borttagning av
dev dependencies och verklig `npm start` med `NODE_ENV=production`, slumpad
syntetisk ägare och separat DB. Login/cookies, statisk sida, tasklivscykel,
serveromstarter, CAS/replay efter delete, avstängda providers, Demo-avvisning,
registerstopp och logout passerade. `tsx` fungerade efter pruning.

Browser: Playwright **1.62.1**, system-Chromium **154.0.8037.57**, lokal temporär
HTTPS-proxy. **36 layout-/skärmbildsfall**, inga runtimefel. Tomma/fyllda tre vyer
vid 320/390/430/820 px, långa svenska titlar/URL/HTML-text, 200 procent roottext,
360px tillgänglig höjd, 44px-kontroller/16px-inmatning, fokus/dialog/Escape,
tasklivscykel, tråd/arkiv/utkast, scrollankare, navigation under pågående anrop,
tappat serversvar/samma-ID-retry, Demo utan API-mutation, reload, misslyckad
logout/401/503, reduced motion och simulerad hidden-status passerade.
Instrumenteringen registrerade noll mikrofon-/browser-TTS-anrop. Ett urval
skärmbilder granskades visuellt. Artefakter stannar utanför git.

Browserproven hittade och verifierade korrigeringar av samtalsväljarnas label,
dialogens Tab-loop och composerbredd vid 320px/200 procent text. WebKits
förväntade binär `webkit-2336/pw_run.sh` saknas i miljön; WebKit verifierades
inte. Roottextförstoring är inte bevis för alla former av browserzoom.
Ingen fysisk iPhone/iPad Safari, riktigt OS-tangentbord, codec/inspelning,
autoplay, ljudkvalitet eller verklig providerlatens/kostnad har testats.
Dessa prov är uttryckligt avgränsade till nästa uppdrag efter separat godkänd
deployment; ingen betald preview skapades.

## Exakt ändrade filer mot PR #7-head

`A` = ny fil, `M` = ändrad. Inga filer raderade. Listan inkluderar denna
dokumentleverans. `package.json`, `package-lock.json`, configfiler, `render.yaml`,
AGENTS och hela `scripts/ops/` är oförändrade.

```text
M .env.example
M README.md
M docs/ETAPP_1_REPORT.md
M docs/JARVIS_SPEC.md
A docs/PRE_INTEGRATION_PLAN.md
A docs/PRE_INTEGRATION_REPORT.md
M docs/PRODUCTION_BACKUP_STATUS.md
M docs/PROGRESS.md
A docs/PROVIDER_HANDOFF.md
M docs/RELEASE_RUNBOOK.md
M docs/RENDER_OPERATIONS_REVIEW.md
M docs/SETUP.md
M scripts/verify-browser.mjs
M scripts/verify-production.mjs
M scripts/verify-recovery.mjs
M server/app.ts
A server/auth.ts
M server/db/database.ts
M server/db/migrations.ts
A server/domain/conversations.ts
A server/domain/operations.ts
A server/domain/tasks.ts
A server/http.ts
M server/index.ts
A server/providers/audio.ts
A server/providers/chat.ts
A server/providers/contracts.ts
A shared/audio.ts
M shared/contracts.ts
A shared/stream.ts
A tests/foundation.test.ts
A tests/helpers.ts
M tests/phase-a.test.ts
A tests/providers.test.ts
M tests/stable-data.test.ts
A tests/stream.test.ts
M tests/workspace.test.ts
M web/src/api.ts
A web/src/components/Conversations.tsx
A web/src/components/Dialog.tsx
A web/src/components/History.tsx
A web/src/components/Tasks.tsx
M web/src/main.tsx
A web/src/stream.ts
M web/src/styles.css
M web/src/workspace.ts
```

## Tre separata slutstatusar och fortsättningspunkt

| Spår | Status |
| --- | --- |
| Utveckling | **PRE-INTEGRATION READY**, P0–P9 verifierade; riktig draft-PR #8 |
| Produktionsbackup | **Inte fullständigt klar.** Render-snapshot är historiskt bekräftad; privat överföring av snapshot/manifest, matchande storlek/hash, slutlig Render-verifiering och exakt skapandetid återstår |
| Produktionsrelease | **Stoppad.** Ingen merge, deployment, omstart, produktionsmigration eller ändrad automatik/inställning/ägare/hemlighet har utförts |

Senaste driftobservation kommer från 9 november och ägarens underlag, inte en
ny Render-avläsning här. Skapad iSH-katalog och visad SFTP-anslutning bevisar
ingen färdig privat kopia. Den aktuella backupstatusen finns i
[PRODUCTION_BACKUP_STATUS](PRODUCTION_BACKUP_STATUS.md).

Nästa separat avgränsade uppdrag: säkra servercredentials, aktuella verifierade
modell-/voice-ID:n, verklig Groq-chat/transkription, verklig Fish-talsyntes,
kontrollerade providerprov och fysisk Safari. Se
[den konkreta överlämningen](PROVIDER_HANDOFF.md). Detta arbete slutar här och
ger inte automatiskt tillstånd att börja integrationen eller produktionsarbetet.
