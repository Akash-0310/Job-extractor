# Docker

The stack is fully containerized with four app-relevant services plus datastores.

| Service    | Image / build        | Purpose                                            |
| ---------- | -------------------- | -------------------------------------------------- |
| `postgres` | `postgres:16-alpine` | Primary database (volume `pgdata`).                |
| `redis`    | `redis:7-alpine`     | BullMQ broker (volume `redisdata`).                |
| `migrate`  | `Dockerfile.worker`  | One-shot: syncs the DB schema, then exits.         |
| `web`      | `Dockerfile`         | Next.js app (standalone output) on port 3000.      |
| `worker`   | `Dockerfile.worker`  | BullMQ worker running Gmail sync jobs.             |

## Bring the whole stack up

```bash
cp .env.example .env      # set NEXTAUTH_SECRET + GOOGLE_* values
docker compose up -d --build
```

Startup order is enforced via healthchecks and `depends_on`:
`postgres`/`redis` healthy → `migrate` completes → `web` and `worker` start.

## Common commands

```bash
docker compose ps                     # status
docker compose logs -f web            # tail web logs
docker compose logs -f worker         # tail worker logs
docker compose up -d --build web      # rebuild just the web image
docker compose exec postgres psql -U postgres job_email_extractor
docker compose down                   # stop (keep data)
docker compose down -v                # stop and DELETE volumes (fresh DB)
```

## Images

- **`Dockerfile`** builds the Next.js app using `output: 'standalone'` for a small runtime
  image, running as a non-root `nextjs` user.
- **`Dockerfile.worker`** contains the full source and runs the BullMQ worker via `tsx`.
  The same image is reused for the one-shot `migrate` service.

## Configuration

Only the following need to be provided in `.env` (the compose file injects DB/Redis URLs
with in-network hostnames automatically):

```env
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000      # or your public URL
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
LOG_LEVEL=info
```

## Persisting exports

The worker mounts an `exports` volume at `/app/exports`. Scheduled/worker-driven exports
land there; on-demand exports from the UI stream directly to your browser download.

## Scaling the worker

Increase throughput by raising concurrency or running more worker replicas:

```bash
docker compose up -d --scale worker=3
# and/or set WORKER_CONCURRENCY in the worker service environment
```

BullMQ ensures each queued job is processed by exactly one worker.
