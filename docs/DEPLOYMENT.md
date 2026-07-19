# Production deployment

## Overview

For production you need:

- A PostgreSQL instance.
- A Redis instance.
- The **web** service (Next.js) and the **worker** service (BullMQ) — both from this repo.
- Valid Google OAuth credentials whose redirect URI matches your public domain.

The included `docker-compose.yml` can run the entire stack, or you can deploy the two app
images to your platform of choice (ECS, Kubernetes, Fly.io, Railway, a VPS, etc.).

## 1. Prepare secrets

```env
NODE_ENV=production
NEXTAUTH_URL=https://extractor.example.com
NEXTAUTH_SECRET=<openssl rand -base64 32>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DATABASE_URL=postgresql://user:pass@db-host:5432/job_email_extractor?schema=public
REDIS_URL=redis://redis-host:6379
LOG_LEVEL=info
```

Add `https://extractor.example.com/api/auth/callback/google` to the OAuth client's
**Authorized redirect URIs**, and the origin to **Authorized JavaScript origins**.

## 2. Apply the database schema

Use versioned migrations in production:

```bash
# once, locally, to author the migration:
npm run prisma:migrate           # creates prisma/migrations/*
# in the pipeline / release step:
npm run prisma:deploy            # prisma migrate deploy
```

(Or keep `prisma db push` for a simpler flow — see [DATABASE.md](./DATABASE.md).)

## 3. Deploy with Docker Compose

```bash
docker compose up -d --build
```

Put a TLS-terminating reverse proxy (Caddy, Nginx, Traefik, or your cloud LB) in front of
the `web` service on port 3000. Ensure `NEXTAUTH_URL` is the public HTTPS URL so the secure
session cookie is used.

## 4. Deploy the two images separately (alternative)

- **web**: build `Dockerfile`, run `node server.js` (standalone). Needs `DATABASE_URL`,
  `REDIS_URL`, `NEXTAUTH_*`, `GOOGLE_*`.
- **worker**: build `Dockerfile.worker`, run the default `tsx src/server/queue/worker.ts`.
  Needs the same DB/Redis/Google env. Scale horizontally as needed.

Run the migration as a one-off release task before rolling out the web/worker.

## 5. Operations

- **Health**: `GET /api/health` returns `200` when the DB is reachable — wire it to your
  load balancer / orchestrator probes.
- **Logs**: structured JSON via pino in production; ship stdout to your aggregator.
- **Scaling the worker**: run multiple worker replicas and/or raise `WORKER_CONCURRENCY`.
  BullMQ guarantees each job runs once. The web service is stateless and scales freely.
- **Backups**: schedule `pg_dump` of the Postgres volume (see [DATABASE.md](./DATABASE.md)).
- **Token expiry**: while the Google app is in *Testing* status, refresh tokens for test
  users can expire after ~7 days; move to *Production* (with verification) for long-lived
  unattended syncs.

## 6. Hardening checklist

- [ ] `NEXTAUTH_SECRET` is a strong, unique random value.
- [ ] `NEXTAUTH_URL` uses HTTPS and matches the OAuth redirect exactly.
- [ ] Postgres and Redis are not publicly exposed (private network / firewall).
- [ ] Database credentials are rotated and least-privilege.
- [ ] Reverse proxy sets sensible security headers and rate limits.
- [ ] Backups are scheduled and periodically restore-tested.
- [ ] Log level is `info` (or higher) in production; secrets remain redacted.
