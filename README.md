# JARVIS

A private mobile browser app for owner sign-in, tasks and separate conversations.
Keep the existing three views: Command Center, Voice Focus, Agents & Knowledge.
English/Swedish task creation commands, title editing, completion/reopening,
confirmed deletion, search/filter and history are implemented. Live uses SQLite;
Demo and unsent per-thread drafts stay in memory. Writes have durable request IDs
and optimistic task versions, with manual recovery for uncertain results.

AI and voice are **not connected**. Provider boundaries and text streaming are
tested with injected fixtures; production defaults to unconfigured. Voice Focus
says “Röst ej ansluten” and offers text. No microphone or browser-TTS is used.

This development branch depends on [draft PR #7](https://github.com/thebloodlineisreallycooking-ui/Jarvis-/pull/7)
and is delivered as [draft PR #8](https://github.com/thebloodlineisreallycooking-ui/Jarvis-/pull/8).
No merge/deployment or production changes are authorized. Schema 3 is a new
forward migration; the installed production backup kit remains unchanged.

- [Scope and requirement matrix](docs/PRE_INTEGRATION_PLAN.md)
- [API, data model, compatibility and verification](docs/PRE_INTEGRATION_REPORT.md)
- [Provider and physical-device handoff](docs/PROVIDER_HANDOFF.md)
- [Progress and continuation point](docs/PROGRESS.md)
- [Local setup and historical Render configuration](docs/SETUP.md)
- [Separate production backup status](docs/PRODUCTION_BACKUP_STATUS.md)

Local checks use only disposable synthetic databases:

```sh
npm ci --include=dev
npm run typecheck
npm test
npm run build
git diff --check
node scripts/verify-production.mjs
node --import tsx scripts/verify-recovery.mjs
```

Browser verification: build first, provide an externally installed Playwright
module if needed, and keep artifacts outside the repository. A system Chromium
may be selected with `JARVIS_CHROMIUM_PATH`. This is desktop emulation, not a
physical iPhone keyboard/audio test. See the report for exact commands/results.
