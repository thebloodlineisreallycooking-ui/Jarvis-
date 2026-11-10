# JARVIS — Quiet Cinematic Intelligence

## Leverans och avgränsning

UI-uppdraget 10 november 2026 levereras på `codex/jarvis-ui-refinement` i
[draft-PR #9](https://github.com/thebloodlineisreallycooking-ui/Jarvis-/pull/9).
Basen är PR #8-head `81dff79cac693e122e225e6a7afe6a5de9f6f8de`;
PR #8 bygger på den omergade PR #7. Main är `a21a3a9…`.
Verifierad kodcommit anges i [PROGRESS](PROGRESS.md). Alla fyra pass är klara.

Controller, API, domän, datalagring och sessions-/race-/Demo-skydd är bevarade.
Ingen server, migration, provider, hemlighet, backup eller driftkonfiguration
ändras. Ingen merge, deployment, betald preview eller ljudaktivering ingår.

## Principer och tokens

Djup mörk arbetsyta, neutrala läsytor och återhållen cyan. En stilla glaskärna
samlar identiteten; historik och skrivfält får utrymmet när arbete pågår.
Systemfont och lokala SVG-linjeikoner; inga externa font-/bildanrop eller nya paket.

| Roll | Värde |
| --- | --- |
| Grund / arbetsyta / panel / hover | `#05090F` / `#0A111B` / `#101B28` / `#162536` |
| Text / sekundär / dämpad | `#EDF4FA` / `#A6B8C9` / `#7F95AA` |
| Accent / fördjupning | `#64DCEF` / `#218AAB` |
| Demo / lyckat / fel | `#F1BA73` / `#79D5B4` / `#F18D9D` |
| Dekorativ linje / kontrollkant | `#243344` / `#576E83` |
| Mellanrum / radier | 4, 8, 12, 16, 24, 32, 48, 64 px / 8, 12, 18 px |

Brödtext/inmatning 16px, radavstånd 1,6–1,7; metadata 13–14px, små etiketter
12px. Centrala tryckytor minst 44×44px. Accentens mörka fördjupning används inte
som liten text. Dämpad text klarar minst 5,02:1 på de fyra basytorna; sekundär
text minst 7,63:1. Kontrollkant på panel är 3,28:1, accentfokus minst 9,63:1.
36 valda text-/kontrollkombinationer mäts i `verify-ui-design.mjs`.
Detta är mätning av färgpar, inte en fullständig WCAG-certifiering.

## Komposition och beteende

Mobil under 700px har en kolumn, sidscroll och tre bottenval: Samtal, Röst,
Verktyg, med fullständiga tillgänglighetsnamn. Samtal och uppgifter öppnas i
native modala sheets. Safe areas, dynamisk höjd och större text får plats.
700–1179px ger en kompakt rail. Från 1180px är sidomenyn 220px; kontextkolumnen
på 280px tillkommer först över 1350px när läsytan får tillräcklig bredd.
Desktop använder en avgränsad historikyta; mobilen använder dokumentets scroll.

Command Centers tomvy har en kärna på 120px mobil/180px desktop och två exempel
som bara fyller utkastet. Aktivt samtal har en 36px signatur. Användartext,
uppgiftsresultat, systemnotiser och delvisa svar har olika typetiketter och tid.
Historikpaging behåller läsankaret. Nytt innehåll följs bara nära slutet; annars
visas en explicit hoppkontroll. Tomma samtal får ingen falsk nyhetsmarkering.

Composer växer till högst 192px. Enter ger ny rad; Ctrl/Cmd+Enter skickar.
IME-bekräftelse och nedhållen tangent skickar inte. Live/Demo har egen verktygsrad
utan att minska textens bredd. Utkast, pågående anrop och sena svar hanteras av
den befintliga controllern. Status och osäkra resultat finns kvar nära handlingen.

Voice Focus har en egen koncentrerad komposition och användbart textfält.
Den säger **Röst ej ansluten** och har ingen klickbar mikrofon. Kapacitetslistan
skiljer fungerande uppgifter/samtal, serverns providerstatus och planerade
agenter/kunskapskällor. Ingen påhittad anslutning eller dokumentstatistik visas.

Uppgiftsrader har en checkbox, läsbar titel/status och en meny. Radering kräver
bekräftelse; okänd/pågående skrivning klarmarkeras inte i förväg. En kort lokal
bekräftelse följer faktiskt ändrat tillstånd. Sökning, filter och paging bevaras.
Login har svensk text, namngivna autofyllnadsfält och en diskret kärna. Första
besöket är neutralt; en avslutad aktiv session visas som ett eget tillstånd.
Dialoger fångar fokus, gör bakgrunden inert och återför fokus; nested dialoger
stängs var för sig. Viktiga fel bärs av beständiga paneler, inte enbart toast.

## Rörelse och framtida designspecifikation

Kontroller använder 120ms, dialoger 200ms och bekräftelse 320ms med gemensamma
kurvor. Vila är statisk. Arbete ger en begränsad puls; inga vågformer eller
låtsasmätningar. Reduced motion stänger av animationer/övergångar inklusive
pseudoelement. Hidden pausar CSS-rörelse. Inga dekorativa JavaScript-timers.

`web/fixtures/voice-states.html` är en separat utvecklingsentry för unconfigured,
permission, recording, transcribing, responding, speaking, stopped och failed.
Varje tillstånd säger **Designprototyp · Ingen ljudfunktion**. Framtida statustexter
finns inte i produktionsbundlen. Fixtures anropar varken API, mikrofon eller TTS.
JARVIS TRADING och JARVIS PRODUCT DEVELOPMENT ligger kvar enbart i roadmap.

## Fyra pass och konkreta revisioner

A (`c91f611`): tokens, typografi, SVG-ikoner, kärna och konsoliderad CSS.
B (`2df71da`): samtalsflöde, multiline composer, historik, navigation och recovery.
C (`dca4f39`): röstvy, kapaciteter, uppgifter, login och isolerade fixtures.
D (`7cfb2e4`): hela browserflödet, kontrastmätning och visuell iteration.

Faktiska bilder ledde till mindre tomvy, tidigare textfält i mobilens röstvy,
mer plats för desktop-composer, kortare mobilnamn vid stor text, helt dold
ofokuserad hopplänk, en enda rubrik i uppgiftssheeten och borttagen falsk
nyhetsmarkering i tomt samtal. Dialogbilder tas efter avslutad övergång.

| Område | Konkret bevis |
| --- | --- |
| Hierarki | Tomma/fyllda Command Center-bilder; composer ryms vid 1440×900 |
| Identitet | Samma tokens, kärna, SVG och typografi i login och tre huvudvyer |
| Mobil | 390/430px sheets, 44px-kontroller, 320px reflow och stor text |
| Innehåll | 35 syntetiska uppgifter, 74 meddelanden, lång titel/URL och tom sökning |
| Ärlighet | Riktiga kapaciteter; ingen mikrofon/TTS; Demo utan mutationsanrop |
| Rörelse | Statisk vila, reduced motion och simulerad hidden-paus i browser |
| Funktion | Sessions-/race-/Demo-regressioner, fokus, paging, retry och felprov |
| Leverans | Separat verifierad branch/draft-PR; inga produktionsändringar |

## Verifiering och mätningar

Typecheck, **67 tester i 7 filer**, build och `git diff --check` passerar.
Chromium **154.0.8037.57**, Playwright **1.62.1**, Linux i molnmiljön, Node 24.19.0.
**54 layoutfall**, inga browser-runtimefel. Lokal HTTPS-proxy och separat
syntetisk SQLite-databas; inga produktionsmeddelanden eller credentials används.

Login och samtliga vyer kontrolleras tomma/fyllda vid **390×844, 430×932,
820×1180, 1440×900** samt 320×844. Fel-/fokusprov körs vid 420px höjd,
320/390/430/820px bredd och separat 200% rottext. 200% CSS-zoom kontrolleras också.
Dialoger, tangentbord, IME, sökning, 100-teckens samtalstitel, task-livscykel,
Live/Demo-/samtalsbyte under anrop, 401/403/500, nätavbrott efter commit,
retry med samma request-ID och misslyckad utloggning ingår.
Mobilens äldre-historikankare flyttade -0,5px; desktopankare håller inom 3px.

Bundle: JS 305,02kB / **92,76kB gzip**, CSS 25,03kB / **5,91kB gzip**.
Inga nya beroenden. Lokal navigation, login-till-redo och FCP registreras i
browserresultatet; de slutliga uppmätta tiderna anges i PROGRESS. Mätningen har
35 uppgifter/74 lagrade meddelanden, viewport 1440×900 för fylld DOM. Lokala
varma resurser, ingen CPU-/nätstrypning; detta är ingen mobil prestandagaranti.
Bilder och JSON stannar utanför git, under `/workspace/work/ui-final-reviewed/`,
`/workspace/work/ui-fixtures/` och `/workspace/work/ui-contrast.json` i granskningsmiljön.

Åtta röstfixtures är separat browserkontrollerade med noll API-/ljudanrop.
WebKit-binär saknas. Fysisk Safari, riktigt iPhone-tangentbord/visual viewport,
OS-zoom, VoiceOver, safe-area-insets på fysisk enhet och native dialogbeteende
på iOS återstår efter separat godkänd deployment. Rottext/CSS-zoom och minskad
höjd är emulering. Verkligt ljud, behörighetsdialoger och providers är inte testade.

Reproduktion efter installation och build (Playwright installeras separat):

```sh
npm run typecheck
npm test
npm run build
git diff --check
node scripts/verify-ui-design.mjs
# Vid behov: PLAYWRIGHT_MODULE=<extern modul>, JARVIS_CHROMIUM_PATH=<binär>
JARVIS_REVIEW_OUTPUT=/tmp/jarvis-ui-review node scripts/verify-browser.mjs
# Separat terminal för fixtures:
npx vite --host 127.0.0.1 --port 5186
JARVIS_REVIEW_OUTPUT=/tmp/jarvis-ui-fixtures node scripts/verify-voice-fixtures.mjs
```

## Ändrade filer mot PR #8

- Dokumentation: `README.md`, `docs/JARVIS_SPEC.md`, `docs/UI_DESIGN.md`, `docs/PROGRESS.md`.
- Grund/app: `web/index.html`, `web/src/main.tsx`, `web/src/styles.css`,
  `web/src/tokens.css`, `web/src/vite-env.d.ts`.
- Komponenter i `web/src/components/`: `Icon.tsx`, `Core.tsx`, `Composer.tsx`,
  `Conversations.tsx`, `History.tsx`, `Recovery.tsx`, `Dialog.tsx`, `Tasks.tsx`,
  `Capabilities.tsx`, `VoicePresentation.tsx`.
- Inmatning: `web/src/composer-input.ts`, `tests/composer-input.test.ts`.
- Fixtures: `web/fixtures/voice-states.html`, `web/src/fixtures/VoiceStates.tsx`.
- Verifiering: `scripts/verify-browser.mjs`, `scripts/verify-ui-design.mjs`,
  `scripts/verify-voice-fixtures.mjs`.
