# JARVIS — Quiet Cinematic Intelligence

## Uppdrag och verifierad bas

UI-uppdraget 10 november 2026 bygger på PR #8, commit
`81dff79cac693e122e225e6a7afe6a5de9f6f8de`. PR #8 och dess beroende PR #7 är
öppna drafts och omergade. Main är fortsatt `a21a3a9…`. Ny egen branch:
`codex/jarvis-ui-refinement`, separat draft-PR mot `codex/pre-groq-fish-foundation`.
Ren checkout, inga konkurrerande UI-brancher eller användarändringar hittades.
Basens 65 tester, build och browserbevis finns i PRE_INTEGRATION_REPORT.

Behåll verklig kärnfunktion, controller, API, domän och sessions-/race-/Demo-
skydd. Förbättra visuell hierarki och åtkomst, utan parallell datamodell.
Ingen server-/schema-/provider-/Render-/backupändring, merge eller deployment.

## Visuell riktning

Djup mörk arbetsyta, neutrala textytor, återhållen cyan och en stilla glaskärna.
Stora ytor skiljs genom ton och mellanrum. Accent visar fokus och vald handling;
Demo använder både text och varm färg. Systemfont, SVG-linjeikoner, inga externa
font-/bildanrop, inga tunga grafik- eller komponentbibliotek.

Semantiska färger: grund `#05090F`, arbetsyta `#0A111B`, panel `#101B28`,
vald yta `#162536`, text `#EDF4FA`, sekundär `#A6B8C9`, dämpad `#7F95AA`,
accent `#64DCEF`, fördjupning `#218AAB`, Demo `#F1BA73`, lyckat `#79D5B4`,
fel `#F18D9D`. Faktiska kontraster mäts i granskningspasset.
Spacing 4/8/12/16/24/32/48/64 px; radier 8/12/18 px. Brödtext 16–17 px,
metadata 12–14 px, centrala tryckytor minst 44 px. Fokusring är solid och synlig.

## Fyra pass

| Pass | Leverans | Status |
| --- | --- | --- |
| A | Tokens, konsoliderad CSS, typografi, SVG-ikoner, kärna och responsiv shell | Verifierat; fortsatt komposition i B |
| B | Command Center, tomvy/fylld historik, composer, samtal/navigation/fel | Implementerat; browserkontroll vid 390/1440 px |
| C | Voice Focus, kapaciteter, tasks, login, menyer/sheets/dialoger, fixtures | Implementerat; första hela browserflödet passerar |
| D | Browseriteration, kontrast/fokus/rörelse/reflow, regressioner och PR | Återstår |

Mobil under 700 px: en kolumn, tre huvudval nedtill, samtal och uppgifter som
åtkomliga modala sheets. iPad: kompakt rail utan påtvingad kontextkolumn.
Desktop från 1180 px: 220px sidebar, flexibel läs-/skrivyta och diskret kontext.
Historiken får ytan i ett aktivt samtal; kärnan krymper till 36px. Tomvy och
Voice Focus har en större, statisk kärna. Page scroll används på mobil.

Motion följer verkligt arbete. Inaktiv kärna står stilla; loading/saving visar
begränsad aktivitet. Bekräftad framgång markeras lokalt. Reduced motion stänger
av animationer/övergångar, hidden pausar dekorativ rörelse. Framtida ljudstatus
visas endast i en isolerad utvecklingsfixture, aldrig som Live-funktion.

## Verifiering och kvarvarande gränser

Testdata och bilder är syntetiska och stannar utanför repo. Granska login,
alla tre vyer, tomt/fyllt/långt/fel vid 390×844, 430×932, 820×1180 och 1440×900,
420px höjd, 320px reflow, större text, dialogfokus, IME, scroll och sena svar.
Fysisk Safari, riktigt OS-tangentbord, ljud och verkliga providers är inte
del av desktopemuleringen. Ingen mobil preview eller betald resurs skapas.
Slutliga mått, revisioner, testresultat och filista fylls i efter granskningen.
