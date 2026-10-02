# JARVIS specification

## Current authorization

Phase A only: a responsive authenticated browser application, validated API,
versioned SQLite storage, and an explicit Demo/Live boundary. The required
vertical slice creates a task from typed English or Swedish, shows it in the
conversation, and retrieves it after refresh or service restart. Account records
must remain isolated.

## Guardrails

- Browser code never receives provider credentials or arbitrary filesystem,
  process, shell, or native IPC access.
- Live mode fails closed. Demo fixtures never write to the Live database and are
  always labeled.
- Native actions, persistent background scheduling, screen capture, microphone,
  providers, and desktop packaging are later phases and must remain accurately
  capability-gated.
- Source control and verified checkpoints are the source of truth. Databases and
  secrets are not source artifacts.

## Roadmap

Phase B adds capability-gated local utilities and workflows; Phase C adds provider
and attachment adapters; Phase D adds briefings and memory; Phase E completes
deployment, integration testing, and delivery.
