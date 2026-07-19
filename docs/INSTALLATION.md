# Installation

## Prerequisites

| Tool           | Version | Notes                                        |
| -------------- | ------- | -------------------------------------------- |
| Node.js        | ≥ 20    | Only for local (non-Docker) development.     |
| npm            | ≥ 10    | Ships with Node 20.                          |
| Docker + Compose | latest | Recommended for Postgres, Redis, and prod. |
| Google account | —       | The Gmail account you applied to jobs with.  |

You also need a **Google Cloud OAuth client** — see
[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md).

## Option A — Full Docker stack (recommended)

This runs Postgres, Redis, the web app, and the worker together.

```bash
git clone <your-repo-url> job-email-extractor
cd job-email-extractor

cp .env.example .env
# Edit .env: set NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

docker compose up -d --build
```

Then open <http://localhost:3000>. The `migrate` service applies the schema on first
boot before the web/worker services start.

## Option B — Local development

Run only the datastores in Docker and the app on your host.

```bash
git clone <your-repo-url> job-email-extractor
cd job-email-extractor

# 1. Datastores
docker compose up -d postgres redis

# 2. Dependencies
npm install

# 3. Environment
cp .env.example .env
#   For local use, DATABASE_URL host = localhost, REDIS_URL host = localhost

# 4. Schema
npm run prisma:generate
npx prisma db push

# 5. Run (two terminals)
npm run dev       # web app on :3000
npm run worker    # background sync worker
```

## Verifying the install

- Visit `http://localhost:3000/api/health` → should return `{"status":"ok","db":"up"}`.
- Visit `http://localhost:3000` → redirects to `/signin`.
- Sign in with Google, then click **Sync Gmail** in the top bar.

## Troubleshooting

- **`Invalid environment configuration`** — a required env var is missing/invalid. The
  error lists exactly which one. See [ENVIRONMENT.md](./ENVIRONMENT.md).
- **Prisma can't reach the database** — ensure `docker compose ps` shows `postgres`
  healthy and `DATABASE_URL` points at the right host/port.
- **Worker not processing** — ensure Redis is up and `REDIS_URL` is correct; check the
  worker logs (`docker compose logs -f worker` or the `npm run worker` terminal).
