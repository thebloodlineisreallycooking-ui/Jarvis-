# JARVIS specification

## Current authorized development scope

PRE-INTEGRATION P0–P9, authorized 10 November 2026: extend the existing private
React/TypeScript/Vite/Express/SQLite app immediately before real GroqCloud and
Fish Audio integration. Keep owner authentication, cookie sessions, bilingual
task creation commands and Command Center, Voice Focus, Agents & Knowledge.

The core supports versioned task creation/listing/title changes/completion/
reopening/deletion, conversation creation/selection/naming/archive/reopening,
ordered paged history and durable operations with explicit retry/status recovery.
Regular non-command text is saved with a `system_notice` in unconfigured Live;
it does not impersonate an AI answer or create a task. Task creation commands
remain English/Swedish; lifecycle changes use the named controls/API.

Demo tasks, conversations and drafts live only in client memory. Live drafts
also remain in memory per conversation; reload/confirmed logout removes them.
No private browser cache, offline write queue or background automation.

Three server provider boundaries and a single authenticated SSE text protocol
are exercised through injected test providers. Production defaults to
unconfigured. Voice Focus offers text and says “Röst ej ansluten”. No microphone,
real provider calls, audio upload/playback or browser-TTS is activated.

PRE-INTEGRATION READY means verified code, tests and integration handoff. It does
not mean AI connected, production backup complete or release approved. See
[plan and requirement matrix](PRE_INTEGRATION_PLAN.md),
[API/data/verification report](PRE_INTEGRATION_REPORT.md) and
[provider handoff](PROVIDER_HANDOFF.md). Historical production observations remain
in [production backup status](PRODUCTION_BACKUP_STATUS.md); this specification
does not overwrite them.

## Guardrails

- Account ownership is always derived from the server session. New inputs and
  responses are validated. Missing and foreign resources use the same 404.
- Writes use Origin protection, limits, optimistic task versions and operation
  IDs. A timeout/abort may follow a committed write; never claim “unsaved”.
- Confirmed 401/logout clears private state and invalidates late responses/events.
  403/network/5xx and unconfirmed logout preserve data/drafts with recovery paths.
- Providers receive bounded authorized context. User/history/document text is
  data, never system instructions. Provider keys/output cannot define ownership.
- No merge, deploy, production restart/settings/owner/secret/data changes,
  automation reactivation or paid resources in this development scope.
- No rewrite of migrations 1–2 or installed operations kit. New schema 3 requires
  a separately reviewed release/recovery plan; code rollback alone is unsafe.
- Source commits and verified checkpoints are evidence. Fixtures are not real
  provider/Safari/production measurements. No DB/audio/log/screenshot/secret in git.

## Future roadmap — ideas, not delivery requirements

Historical Phase A–E remains product history, not authority to start later work.
The names below create no services, tables, empty interfaces or menus now.

### JARVIS TRADING

Market data, research modules, backtesting, paper trading, live trading and
broker connections. All remain future ideas; no market/trading access or action.

### JARVIS PRODUCT DEVELOPMENT

Product development and future research modules remain a vision, with no
additional concrete submodule contract in the supplied handoff. Research swarm,
replayable workflows, decision ledger, simulation and digital twin are associated
ideas to evaluate separately, not implemented product-development capabilities.

### Other known ideas and future surfaces

Project Brain; autonomous QA; screen/temporal memory; Mission Control; replayable
workflows; research swarm; decision ledger; self-healing/simulation; Personal API;
Inbox; confidence engine; digital twin. These are explicitly an idea backlog.

Hermes; Obsidian; knowledge ingestion/RAG; desktop companion; screen recording/
OCR; arbitrary file search/movement; app/process control; browser/computer control;
workflow builder; background scheduling; calling; self-improving agents; full UI/
motion redesign. No such capability is implied by provider preparation.

Tasks do not grow into projects, deadlines, recurring tasks, tag trees, calendar
or notifications in this scope. Permanent audio, voice cloning, wake word,
full duplex and continuous listening are also outside it. The larger visual
redesign remains around/after the separately authorized provider integration.
