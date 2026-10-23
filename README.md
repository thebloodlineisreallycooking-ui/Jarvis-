# JARVIS

A private, mobile-first browser app with owner sign-in and persistent task capture
in English and Swedish. Live tasks/messages use SQLite; Demo stays temporary.
The three existing views remain Command Center, Voice Focus, and Agents & Knowledge.
No general AI, voice provider or desktop companion is connected yet.

Etapp 1 hardens deployment, sessions, message ordering, mode separation and mobile
accessibility. See [setup](docs/SETUP.md), [progress](docs/PROGRESS.md) and the
[verification and requirement report](docs/ETAPP_1_REPORT.md).

The user already has a Render deployment. Review the existing service against
`render.yaml`; do not create a replacement service. This work stays on a separate
branch and does not merge, deploy, change secrets or touch production data.
