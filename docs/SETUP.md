# Setup, private access, and hosting

## Recommended host: Render

The checked-in `render.yaml` defines one paid Node web service in Frankfurt, an
HTTPS health check, and a 1 GB persistent disk mounted at `/var/data`. Render's
load balancer redirects HTTP to HTTPS and manages TLS certificates. SQLite lives
at `/var/data/jarvis.db`, so the database, WAL, accounts, sessions, tasks, and
messages survive process restarts and new deployments. Only files under the disk
mount survive host replacement.

Official information checked on 2 October 2026:

- [Render pricing](https://render.com/pricing) lists the Starter web instance at
  **US$7/month** and persistent SSD storage at **US$0.25/GB/month**. This setup is
  therefore **US$7.25/month**, plus tax and any bandwidth beyond the included
  allowance. Render can change pricing; confirm the checkout total before paying.
- [Persistent disk documentation](https://render.com/docs/disks) says disks are
  available only on paid services, preserve filesystem changes across deploys and
  restarts, and receive automatic daily snapshots. A disk restricts this SQLite
  service to one instance, which is intentional.
- [Web service documentation](https://render.com/docs/web-services) documents
  managed TLS and HTTP-to-HTTPS redirects.

No paid resource has been created by this repository. Do not approve Render's
paid service until the displayed price is acceptable.

## Deploy from Safari on iPhone

1. Push this branch/PR to GitHub and merge it into `main`.
2. In Safari, sign in at [dashboard.render.com](https://dashboard.render.com), tap
   **New +**, then **Blueprint**, and connect the GitHub repository.
3. Select `main`. Render reads `render.yaml`. Enter
   `JARVIS_OWNER_USERNAME` and a unique 10–128 character
   `JARVIS_OWNER_PASSWORD` when prompted. These are secret dashboard values; do
   not put them in GitHub or a file.
4. Review the estimated **US$7.25/month plus tax/overage** before confirming.
5. Wait for the deploy to become **Live**, tap its `https://…onrender.com` URL,
   and sign in with those owner credentials.

Production startup creates exactly one owner in an empty database. Public account
registration returns 404, and the hosted UI only offers sign-in. On later starts,
the configured username must match that sole database account. Changing the
password environment variable does not reset an existing password; restoring or
rotating it currently requires deliberate database administration.

## Local verification

1. Use Node 20.19 or newer and run `npm ci`.
2. Run `npm run build` and `npm test`.
3. For a production smoke run, set `NODE_ENV=production`,
   `DATABASE_PATH` to a durable path, and both owner variables, then run
   `npm start`. In production, HTTPS must terminate at a reverse proxy because
   the session cookie is Secure.

The server binds to `0.0.0.0` and respects the host-provided `PORT`. Demo mode
remains explicitly temporary and does not write tasks or messages. Live mode
writes to SQLite for the authenticated owner. No provider credentials or new
assistant capabilities are part of this deployment work.
