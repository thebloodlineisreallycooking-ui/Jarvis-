# Provideröverlämning — stopp före verklig integration

## Aktualisering 12 november 2026

Backupuppdraget är färdigt på Render och iPhone. [Samlad schema-3-körplan](SCHEMA_3_RELEASE_RUNBOOK.md)
är förberedd med testat nytt driftkit; det är ännu inte installerat i produktion.
Merge är godkänd separat. Deployment/återöppning och fysisk Safari återstår före
produktionsgrunden kan godkännas. Ingen ytterligare bred funktion-/UI-etapp krävs.
Nedanstående providergränser är fortfarande avstängda; verkliga adaptrar,
credentials, kostnadskontroll, ljuddecoder/format och enhetsprov är nästa
separat avgränsade integrationsuppdrag, inte del av mergeuppdraget.

Denna branch förbereder GroqCloud för chat/transkription och Fish Audio för
text till ljud. Detta är projektets planerade fördelning, inte ett påstående
att leverantörerna saknar andra funktioner. **Inga riktiga anrop, nycklar,
modeller, voice-ID:n, mikrofonprov eller uppspelningar har använts.**

## Implementerad servergräns

| Gräns | In/ut | Användning i denna leverans |
| --- | --- | --- |
| `ChatProvider.stream` | Eget `ChatInput` med fast systemtext och separata user/assistant-turer; `AsyncIterable<{text}>` | Autentiserad `POST /api/chat/stream`, testad med injicerad provider |
| `TranscriptionProvider.transcribe` | Tillfälliga bytes + validerad ljudmetadata → validerad text och `sv`/`en` | `transcribeAudio` i servern, syntetiska tester; ingen publik ljuduppladdning eller mikrofonväg |
| `SpeechProvider.synthesize` | Validerad text + `sv`/`en` → tillfälliga bytes + validerad ljudmetadata | `synthesizeSpeech` i servern, syntetiska tester; ingen browser-TTS |
| `GET /api/capabilities` | `available/unconfigured/disabled` och säker orsak per förmåga | Kräver session; klienten kan inte aktivera providers |

Koden finns i `server/providers/{contracts,chat,audio}.ts`, delade kontrakt i
`shared/{contracts,stream,audio}.ts` och SSE-klienten i `web/src/stream.ts`.
`createApp` accepterar serverinjektion från testharness. Produktionsstarten
använder alltid `unconfiguredProviders()`. Varken queryparameter, Live/Demo,
nyckelns existens eller en klientflagga kan välja en fixture/aktivera AI.

## Textströmning, historik och återhämtning

Fetch-streamad SSE med samma HttpOnly-sessionscookie och strikt Origin.
Autentisering, validering, ägarskap, arkivstatus och samtidighetsgräns sker före
ny generation. Ingen WebSocket, automatisk EventSource-reconnect eller kö.

Varje händelse innehåller `operationId`, `conversationId`, stigande `index`,
`type`. SSE `id` är `operationId:index`. Flödet är `start`, noll eller flera
`delta`, exakt ett `terminal` om anslutningen fortfarande fungerar. Terminalen
innehåller operationens beständiga kvitto. Klienten avvisar fel identitet,
ordningsluckor, förändrade dubletter, fel terminal och för stora ramar; exakta
dubletter ignoreras. UTF-8 avkodas inkrementellt, även när bytes/event delas.
Efter terminal eller sessionsslut tillämpas inga sena events.

En ny provideroperation sparar sin användartur i en kort lokal transaktion.
Anropet körs därefter utanför SQLite-transaktion. Vid slut sparas högst en
assistenttur plus slutkvitto atomiskt. Eventuell deltext vid fel/timeout/stopp
märks `delivery: interrupted`; inga tokenmeddelanden eller ljudfiler sparas.
Vid hård processkrasch kan endast användarturen finnas sparad; den ännu ej
committade deltexten går förlorad. På serverstart markeras kvarvarande pending
som `unknown`, utan ny generation. Omladdning läser enbart data.

Samma request-ID + samma validerade payload returnerar kvittot. Annan payload
eller operation med samma konto/ID ger 409. Pending replay ger
`OPERATION_PENDING`; GET `/api/operations/:id` visar status. Slutförd/misslyckad/
avbruten/okänd generation körs aldrig igen med samma ID. Ett nytt uttryckligt
försök kräver ny avsikt och nytt ID. Klientens "Stoppa mottagning" avbryter
anslutningen; det säger inte att sparad data eller leverantörskostnad ångrats.
Serverresultatet läses manuellt när nätet fungerar.

## Appgränser, inte leverantörslöften

| Resurs | Gräns |
| --- | --- |
| Inmatad text / uppgiftstitel / samtalsnamn | 2 000 / 200 / 100 JS-strängenheter efter trim |
| Kontext | Senaste högst 24 godkända hela turer, totalt högst 12 000 JS-strängenheter; bara aktuellt konto/samtal, inga avbrutna assistentturer eller systemnotiser |
| Genererat svar / chunk | Högst 12 000 / 512 JS-strängenheter |
| Providerdeadline | 30 s totalt; signal vidarebefordras; 1 s extra begränsning för terminalleverans |
| Klientdeadline | 35 s totalt; inget automatiskt återförsök |
| Samtidighet | Högst 2 per konto och 8 i serverprocessen; 429 + Retry-After |
| SSE-inläsning | 4 MiB totalt, 128 000 tecken per ram, högst 12 002 ordnade events |
| Ljud | Högst 4 MiB och deklarerad varaktighet 60 s; `sv`/`en` |
| Talsyntestext | Högst 4 000 JS-strängenheter |
| Kandidatformat | `audio/wav`/`wav`, `audio/webm`/`webm`, `audio/mp4`/`mp4`; MIME/format/byteantal måste matcha |
| Valfri ljudmetadata | 8–48 kHz, 1 eller 2 kanaler |

Detta är konservativa produktgränser, **inte tokenräkning, kostnadstak,
uppmätta providerlatensvärden eller verifierat Safari-formatstöd**. Riktiga
adaptrar måste mappa till och verifiera leverantörens aktuella modell-, token-,
fil-, format- och prisgränser. Ljudvalideringen kontrollerar metadata, byteantal
och enkel filsignatur; den är ingen decoder och kan inte bevisa faktisk längd.
Verifierad varaktighet/codec före verklig uppladdning hör till nästa uppdrag.

Systemtext sätts bara på servern. Historik och framtida citerade dokument
ligger i data-/meddelandefält och får aldrig lyftas till systeminstruktioner.
Providertext renderas som React-text. Fel innehåller bara fasta koder,
aldrig providerexception, prompt, token, stack eller SQL. Inga providerverktyg
exekveras av modellen i denna grund.

## Framtida begränsade taskverktyg

| Verktyg | Serverauktorisering och villkor |
| --- | --- |
| Lista / läsa uppgift | Konto från session; begränsad sida/sökning; samma 404 för saknad/främmande resurs |
| Skapa | Validerad titel, öppet ägt samtal, konto från session, nytt avsikts-ID; samma lokala transaktion/idempotens |
| Byta titel / slutföra / återöppna | Ägd uppgift, aktuell version, tillåtna patchfält och status; 409 vid konflikt |
| Radera | Ägd uppgift, aktuell version och uttrycklig begriplig bekräftelse med rätt titel innan servereffekt |

Tabellen är integrationspolicy, inte en implementerad autonom verktygsmotor.
Provider-output får aldrig välja `accountId`, köra shell/kod eller ändra
behörigheter. Alla framtida verktygsargument måste valideras på servern.

## Framtida röstkedja

Användartryck → verifierad capability → mikrofonbehörighet → inspelning →
explicit stopp → tillfällig uppladdning och transkription → validerad text →
**samma samtals-/request-ID-flöde som textinmatning** → textresultat → valfri
Fish-talsyntes → användarstyrd uppspelning med stopp.

`voiceTransition` är en ren modell för permission, recording, transcribing,
text_ready, submitting, synthesizing, playback_ready, playing, stopped/error.
Ett run-ID ignorerar sena ljudresultat. Dubbeltryck startar inte en andra kedja.
Nekad behörighet ger begripligt fel. Stopp/bakgrund/lås invalidierar kedjan;
transkriptions- och nätfel kräver medvetet nytt försök. Blockerad autoplay
återgår till väntan på användartryck. Text som redan skickats kan vara sparad
även om den efterföljande ljudkedjan stoppas.

Voice Focus visar nu **Röst ej ansluten** och erbjuder text. Inga
`getUserMedia`-anrop, inspelningar, uppladdningar, browser-TTS, wake words,
bakgrundslyssning, full duplex, voice cloning eller telefonsamtal ingår.
Tillfälliga syntetiska bytes i testerna skrivs inte till repo eller databas.

## Nästa separat avgränsade provideruppdrag

1. Läs aktuell officiell dokumentation på nytt innan adapterval:
   [Groq chat](https://console.groq.com/docs/text-chat),
   [Groq transkription](https://console.groq.com/docs/speech-to-text),
   [Groq API](https://console.groq.com/docs/api-reference),
   [Fish utvecklare](https://fish.audio/developers/),
   [Fish dokumentation](https://docs.fish.audio/).
   Verifiera aktuella modell-/voice-ID:n, formatsupport, servertransport,
   avbrott, autentisering, gränser och kostnadskontroll; inga ID:n/priser låses här.
2. Tillför servercredentials via ett säkert host-/vaultflöde efter separat
   auktorisering. Aldrig i chat, git, VITE-variabler, klientbundle, URL eller logg.
   Tomma exempel finns i `.env.example`; de aktiverar ingenting.
3. Implementera riktiga Groq-chat- och transkriptionsadaptrar samt Fish-talsyntes
   bakom de befintliga gränserna. Validera verkliga utdata; behåll domän/API/UI
   oberoende av providerformat. Aktivera inte fixtures genom Live-flaggor.
4. Gör uttryckligt avgränsade verkliga providerprov: authfel, limits, strömning,
   kostnadsbudget, nätavbrott, timeout, stopp, samtidighet, restart, felaktiga
   ljudformat, ingen automatisk kostsam replay. Rapportera verkliga observationer.
5. Efter separat godkänd deployment: fysisk iPhone/iPad Safari. Prova tillåtna
   inspelningsformat, faktisk varaktighet/bytegräns, permission denied,
   dubbeltryck, tangentbord/safe areas, lås/bakgrund, nätbyte, långsam uppkoppling,
   avbruten transkription/TTS, autoplay block, uppspelningsstopp och sessionsslut.

Överlämningen är inte tillstånd att börja dessa steg. Produktionsbackup och
versionsanpassad releaseplan måste hanteras separat. Ingen ny betald preview.
