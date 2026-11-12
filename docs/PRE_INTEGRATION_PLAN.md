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
  [Draft-PR #8](https://github.com/thebloodlineisreallycooking-ui/Jarvis-/pull/8)
  har `codex/etapp-1-stabil-grund` som bas och beror på PR #7.
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

| Del | Avgränsade krav | Slutstatus |
| --- | --- | --- |
| P0 | Källor, behörigheter, baslinje, branch, separat draft-PR | Klart |
| P1 | Små domänmoduler, delade validerade kontrakt, bevarad sessionssemantik | Klart |
| P2 | Skapa/lista/redigera/slutföra/återöppna/radera, versioner, filter/sök, Demo, ägarskap | Klart |
| P3 | Flera samtal, namn/arkiv, legacyhistoria, begränsad cursor, scroll, utkast, semantiska turer | Klart |
| P4 | Beständig payloadbunden idempotens, atomisk lokal effekt, manuellt retry/status, avbrott/logout | Klart |
| P5 | Tre vyer, 44px/16px/fokus/dialog, 320/390/430/820, 200%, kort höjd, verkliga tillstånd | Klart i desktopemulering; fysisk Safari är senare scope |
| P6 | Session/owner, Origin, 429, kropp/text/sida/samtidighet, säkra fel/loggar/cache/rendering | Klart |
| P7 | Chat/transkription/talsynteskontrakt, capability, avstängd standard, testprovider, SSE/context/budget | Klart med injicerade fixtures |
| P8 | Ljudmetadata/validering/tillstånd/avbrott, Voice Focus, överlämning utan mikrofon | Klart med syntetiska bytes och rena tillstånd |
| P9 | Regressioner, migration/recovery, ren produktionsstart, browser, dokument/commits/PR/handoff | Klart; begränsningar redovisade |

## Slutlig kravmatris

**Klart** betyder implementerat och testat inom denna etapps scope.
**Redan korrekt** betyder bevarat och återkontrollerat. Inga utvecklingskrav
lämnas som återstår. Verkliga providers, fysisk Safari och produktion är
uttryckliga senare grindar, inte påstådda testresultat.

Bevisförkortningar: **F** = `tests/foundation.test.ts`, **D** =
`tests/stable-data.test.ts`, **A** = `tests/phase-a.test.ts`, **W** =
`tests/workspace.test.ts`, **P** = `tests/providers.test.ts`, **S** =
`tests/stream.test.ts`, **B** = `scripts/verify-browser.mjs`, **R** =
`scripts/verify-recovery.mjs`, **Prod** = `scripts/verify-production.mjs`.
Exakta kommandon, revision och begränsningar finns i [rapporten](PRE_INTEGRATION_REPORT.md).

| ID | Avgränsat krav | Status och konkret bevis |
| --- | --- | --- |
| P0.1 | Läsa AGENTS, senaste kontrollpunkter, kod/config/lock/tester/scripts/docs | Klart; källinventering i rapporten, en checkout, ren utgångspunkt |
| P0.2 | Verifiera läsning, separat branchskrivning och riktig PR var för sig | Klart; connectorläsning/branch/PR #8 samt lyckad git-push och remote-SHA |
| P0.3 | Verifiera main, PR #7, andra öppna PR och samma bas för alla filer | Klart; SHA ovan, #4/#5 granskade; branch direkt från #7-head |
| P0.4 | Egen branch och beroende draft-PR, fryst #7, ingen force-push | Klart; #8 mot #7-branch; main och #7-head fortsatt oförändrade |
| P0.5 | Baslinje, plan, avgränsning och kontinuerliga checkpoints | Klart; 31 baslinjetester, denna matris, PROGRESS och fyra utvecklingscheckpoints |
| P0.6 | Respektera utvecklings-/produktionsgränsen och historisk backup | Redan korrekt; inga Render-/provider-/mikrofonåtgärder; separat status nedan |
| P1.1 | Behålla stack, owner/session, tre vyer och visuell identitet | Redan korrekt; A, W, B, Prod; inga nya beroenden |
| P1.2 | Små domän-/auth-/provider-/UI-moduler utan generell plattform | Klart; `server/domain`, `server/auth.ts`, `server/providers`, `web/src/components` |
| P1.3 | Zod vid tillitsgränser och oförändrad 401/403/5xx/nätsemantik | Klart; F, W, P, S; fel läge/samtal/operation avvisas |
| P2.1 | Skapa/lista/titeländra/slutföra/återöppna/radera efter reload/restart | Klart; F, A, W, B, Prod |
| P2.2 | Ny statusmigration utan ändring av migration 1–2; bevara gamla fält | Klart; migration 3, D, F, R; bytejämförelse av första två SQL-migrationerna |
| P2.3 | Använda update/completion/version konsekvent; upprepad status är no-op | Klart; F; ändring ökar version, återöppning tömmer completion-tid |
| P2.4 | Trimmad titel/längd/ID/patch/status; svensk/engelsk parser utan trunkering | Klart; F; tomma/ofullständiga kommandon avvisas |
| P2.5 | Optimistisk låsning, 409 och läsning av aktuell resurs | Klart; F, Prod; konflikt visar väg till omläsning, inget tyst overwrite |
| P2.6 | Begriplig raderingsbekräftelse, fysisk delete och bevarad historia/FK | Klart; B testar rätt titel/Escape/fokus; F, Prod testar historik/replay |
| P2.7 | Filter öppna/slutförda/alla, antal och enkel textsökning | Klart; F, B; begränsade sidor och escapade LIKE-tecken |
| P2.8 | Full Demo-livscykel i minnet med unika separata ID | Klart; W, B; negativa task-ID, demo-prefixed UUID, noll API-mutationer |
| P2.9 | Ägarskap från session, samma 404 för främmande/saknad resurs | Klart; F, A; konto kan inte skickas som patchfält |
| P3.1 | Skapa/välja/byta namn/arkivera/återöppna samtal | Klart; F, W, B; arkiverad tråd spärrar nya operationer |
| P3.2 | Binda nya meddelanden/operationer till konto/tråd/startläge | Klart; F, W, P, B; sena svar följer ursprungstråden |
| P3.3 | Legacyhistorik i ett standardsamtal, bevarade ID/text/tider/sequence | Klart; D, F, R; `legacy-<konto>` utan uppdiktade par/tasklänkar |
| P3.4 | Begränsad cursorhistorik utan luckor/dubletter när nya turer kommer | Klart; F; fast ceiling, strikt before, konto-/trådbunden cursor |
| P3.5 | Bevara scrollankare; följ bara slutet när användaren redan är där | Klart; B; äldre 74-meddelandeshistorik och hoppknapp för nytt innehåll |
| P3.6 | Utkast per tråd/läge endast i minnet, rensas vid reload/logout/401 | Klart; W, B; inga localStorage/sessionStorage/cacheposter |
| P3.7 | Vanlig text sparas med sann system_notice, skapar ingen task/AI-illusion | Klart; F, P; semantiska kind-fält, synlig avstängd AI-status |
| P4.1 | ID före sändning, samma ID vid retry, nytt ID för ny lika avsikt | Klart; F, W, B |
| P4.2 | Beständig konto-/kind-/payload-/tråd-/lägesbunden idempotens; 409 vid skillnad | Klart; F, P; kanonisk validerad payload i SQLite |
| P4.3 | Lokal effekt, exakt kommandopar och kvitto i samma transaktion | Klart; F injicerar insertfel och verifierar full rollback; D ordning |
| P4.4 | Replay efter taskändring/radering/restart visar ursprungligt kvitto | Klart; F, Prod; klient läser nuvarande task/samtal separat |
| P4.5 | Manuellt retry/status; pending/success/failure/cancelled/unknown utan jobbmotor | Klart; W, P, B; inga automatiska skrivloopar |
| P4.6 | Timeout/klientavbrott får inte påstå att sparad effekt är ogjord | Klart; W, P, B; okänt resultat och samma-ID-återhämtning |
| P4.7 | Logout/401 invalidierar sena loads/commands/retries/streams | Klart; W, S, B; misslyckad logout lämnas obekräftad |
| P4.8 | Pending provideroperation vid restart blir unknown utan ny generation | Klart; P, `recoverPendingOperations` vid serverstart |
| P5.1 | Tasks och samtal nåbara i tre befintliga vyer | Klart; B i tomt/fyllt läge vid 320/390/430/820 px |
| P5.2 | 44×44-kontroller, 16px-input, labels, tabbordning/dialog/returfokus | Klart; B inklusive dialogens Tab-loop, Escape och bekräftad radering |
| P5.3 | Långa svenska titlar/URL/text, 200 procent text och 320px reflow | Klart; B mäter inga horisontella överflöden, långa data och HTML renderas som text |
| P5.4 | Empty/loading/error/forbidden/session-ended/unknown hjälper vidare | Klart; W, B; befintligt innehåll/utkast bevaras vid tillfälliga fel |
| P5.5 | Core/status visar verklig operation; ingen påstådd lyssning/AI-ready | Klart; W, B; röst ej ansluten, busy och partial tydligt märkta |
| P5.6 | Reducerad rörelse inklusive pseudo och paus när sidan är dold | Redan korrekt; B verifierar pseudoanimationer och simulerad visibilitychange |
| P5.7 | Kort höjd, fokus, navigation under operation, tangentbord/klick | Klart; B vid 360px höjd; ingen swipe/röstnavigation/offlinekö tillagd |
| P6.1 | HttpOnly/Secure/SameSite, owner oförändrad, publik register av i produktion | Redan korrekt; A, Prod; sessionsgenerering återanvänd |
| P6.2 | Strikt Origin och dokumenterade proxy-/lokala testantaganden | Klart; F, Prod, B; explicit harnessundantag, ingen generell CORS |
| P6.3 | Login-/mutationsgränser, 429 och Retry-After, minnesåterställning dokumenterad | Klart; F; 10/15min login, 120/min mutation, högst 10 000 buckets |
| P6.4 | Body/text/titel/sida/samtidighet begränsas på server | Klart; F, P, S; tal och gränsprov i rapport/handoff |
| P6.5 | Säker textrendering och fasta fel/loggar utan hemligt innehåll | Klart; F, P, B; React-text, CSP, inga stack-/SQL-/providerfel till klient |
| P6.6 | Privata API-svar no-store och kontoavgränsade | Klart; F, P, A; även fel/capability/stream får privata cacheheaders |
| P7.1 | Tre små providerkontrakt används i testade flöden | Klart; P; stream, transkription→samma kommando och separat syntes |
| P7.2 | Avstängd produktionsstandard, säkert PROVIDER_NOT_CONFIGURED | Klart; P, Prod; factory läser inga nycklar/fixtures |
| P7.3 | Autentiserad servercapability, klient kan inte aktivera provider | Klart; P; query-/modeflagga ändrar ingen capability |
| P7.4 | En fetch-SSE-transport med auth före stream, chunk/deadline/abort | Klart; P, S; faktisk lokal HTTP-disconnect, ingen WebSocket |
| P7.5 | Stabil eventidentitet/ordning/slut, split UTF-8, dubletter/sena events | Klart; S, W; partiell text skiljs från terminalt kvitto |
| P7.6 | Högst en partiell assistanttur märkt interrupted; ingen tokenlagring/reload-generation | Klart; P; kvitto och deltext atomiska, kraschgräns i handoff |
| P7.7 | Auktoriserad aktuell context, hårda budgeter, historia ej systemtext | Klart; P; 24 turer/12 000 strängenheter, ingen falsk tokenizer-/kostnadsmätning |
| P7.8 | Server-only nyckelpolicy/tomma exempel och framtida auktoriserade taskverktyg | Klart; `.env.example`, PROVIDER_HANDOFF; ingen autonom verktygsmotor |
| P8.1 | Ljudformat/MIME/bytes/längd/språk samt avbrott/fel kontrakterade | Klart; P, `shared/audio.ts`; metadata/signatur är inte verklig codec-/durationverifiering |
| P8.2 | Rena tillstånd testade: permission/dubbeltryck/bakgrund/lås/stop/nät/autoplay | Klart; P; run-ID ignorerar sena resultat |
| P8.3 | Voice Focus med text, ingen mikrofon/uppladdning/browser-TTS | Klart; B instrumenterar noll mikrofon-/syntesanrop; inga ljud-HTTP-rutter |
| P8.4 | Tillfälligt ljud och konkret framtida adapter-/enhetskedja | Klart; PROVIDER_HANDOFF; inga ljudfiler/cache/voice-cloning/wake words |
| P8.5 | Aktuella officiella docs ska styra framtida modell/voice/format/pris | Klart som överlämningskrav; inga adapter-ID/priser låsta i grunden |
| P9.1 | Relevanta regressioner, typecheck/test/build/diff | Klart; 65 tester i 6 filer, exakta kommandon i rapporten |
| P9.2 | Ren install/build, dev-pruning och verklig NODE_ENV=production-start | Klart; Prod; tsx fungerar som produktionsberoende |
| P9.3 | Migration/FK/integritet/rollback/restart och kod↔schema-tabell | Klart; D, F, R; okänd/ofullständig schemahistoria avvisas |
| P9.4 | Syntetisk återställning och oförändrat installerat kit | Klart; R; schema-3-capture avvisas, ingen produktionsåterställning utförd |
| P9.5 | Browserprov och ärlig åtskillnad mot fysisk Safari/provider | Klart i Chromium; WebKit blockerat av saknad binär, fysisk Safari senare scope |
| P9.6 | SPEC/PROGRESS/plan/API/schema/krav/handoff, små commits och riktig PR | Klart; dokumentlänkar och GitHub-verifierad kodcheckpoint i rapporten |
| P9.7 | Inga secrets/DB/ljud/loggar/screenshots/buildfiler i repo | Klart; granskade staged paths/diff; privata syntetiska artefakter utanför checkout |
| P9.8 | Framtidsnamn och alla kända idéer kvar som backlog, inget mer byggs | Klart; SPEC bevarar JARVIS TRADING och JARVIS PRODUCT DEVELOPMENT samt hela namngivna backloggen |
| P9.9 | Separata slutstatusar och exakt nästa provideruppdrag | Klart; rapport + handoff; stopp före credentials, riktiga anrop och mikrofon |

## Produktionsstopp och fortsättningspunkt

Ingen merge, deployment, produktionsomstart, Render-inställning, credential,
ägare, produktionsdatabas, återställning, automatik eller betald resurs ändras.
Driftkitet `dade9b6...` lämnas orört. Senaste Render-observation är 9 november,
inte en ny kontroll i detta uppdrag. Backup på Render är historiskt bekräftad;
privat kopia/hash/slutverifiering/exakt skapandetid återstår. Ägarens nya underlag
anger skapad iSH-katalog och visad SFTP-anslutning, inte färdig överföring.

Senaste verifierade kodcheckpoint:
`c6794bda7406ea5873d0fe0b95ac7dd4f32bf421`, sparad på GitHub i draft-PR #8.
Slutrapporten och matrisen följer i en separat dokumentcommit; exakt senaste
PR-head verifieras i leveransbeskedet. Nästa uppdrag är enbart den separat
avgränsade [provideröverlämningen](PROVIDER_HANDOFF.md). Börja inte automatiskt.
Produktionsbackupens återstående privata steg och release-stoppet kvarstår.
