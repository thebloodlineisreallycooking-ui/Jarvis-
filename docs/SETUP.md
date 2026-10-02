# Setup and mobile access

## Local/cloud host

1. Use Node 20.19 or newer and run `npm ci`.
2. Copy `.env.example` to `.env`, generate a 32+ character session secret, and
   choose a database path on a **durable mounted volume**.
3. Run `npm run build`, then `NODE_ENV=production npm start`.
4. Put the service behind an HTTPS reverse proxy. Only then open the authenticated
   HTTPS URL in Safari on iPad or iPhone and create an account.

The server binds to `0.0.0.0`; `localhost` is only reachable inside its host and is
not a mobile preview URL. Cookie security is enabled in production, so HTTPS is
required. This repository does not include a public deployment or claim durable
runtime storage. The database survives process restarts only when `DATABASE_PATH`
points to storage that survives host replacement.

## Phase A use

After signing in, enter `Add a task to review JARVIS` in Live mode. Live tasks are
stored in SQLite and scoped to the authenticated account. Demo mode returns a
clearly labeled temporary result and does not write tasks or messages.

No provider credentials are needed in Phase A. Groq, Fish Audio, microphone,
screen uploads, and native companion features are intentionally not configured or
implemented yet. Never paste provider secrets into chat; a later deployment will
accept rotated credentials through its server-side secret configuration.
