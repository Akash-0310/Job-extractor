# Environment variables

All configuration is via environment variables. They are validated at startup by
`src/lib/env.ts` (using zod) — the process **fails fast** with a clear message if a
required variable is missing or malformed. Copy `.env.example` to `.env` to begin.

| Variable                         | Required | Default                     | Description                                                                 |
| -------------------------------- | :------: | --------------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`                   |   ✅     | —                           | PostgreSQL connection string. Docker host = `postgres`, local = `localhost`.|
| `REDIS_URL`                      |          | `redis://localhost:6379`    | Redis connection for BullMQ. Docker host = `redis`.                         |
| `NEXTAUTH_SECRET`                |   ✅     | —                           | Session encryption secret. `openssl rand -base64 32`. Min 16 chars.         |
| `NEXTAUTH_URL`                   |          | `http://localhost:3000`     | Canonical app URL; must match the OAuth redirect origin.                    |
| `GOOGLE_CLIENT_ID`               |   ✅     | —                           | OAuth client id from Google Cloud.                                          |
| `GOOGLE_CLIENT_SECRET`           |   ✅     | —                           | OAuth client secret from Google Cloud.                                      |
| `NODE_ENV`                       |          | `development`               | `development` \| `test` \| `production`.                                    |
| `LOG_LEVEL`                      |          | `info`                      | `fatal`…`trace` \| `silent`. Controls pino verbosity.                       |
| `EXPORT_DIR`                     |          | `./exports`                 | Directory for scheduled worker exports.                                     |
| `DEFAULT_BATCH_SIZE`             |          | `100`                       | Default messages processed per batch (overridable per-user in Settings).    |
| `DEFAULT_SYNC_INTERVAL_MINUTES`  |          | `60`                        | Default auto-sync interval.                                                 |
| `DEFAULT_MAX_EMAILS`             |          | `0`                         | Default cap on messages processed; `0` = unlimited.                         |
| `WORKER_CONCURRENCY`             |          | `2`                         | (Worker only) number of sync jobs processed concurrently.                   |
| `DISABLE_ENV_VALIDATION`         |          | `false`                     | Set `true` to skip validation during CI builds without secrets.             |

## Notes

- **Never commit `.env`.** It is git-ignored. Only `.env.example` is tracked.
- **Secrets are never logged.** The logger redacts `access_token`, `refresh_token`,
  `id_token`, `password`, and `authorization` fields.
- In `docker-compose.yml`, `DATABASE_URL` and `REDIS_URL` are injected with in-network
  hostnames (`postgres`, `redis`); you only need to provide the Google + NextAuth values
  in your `.env` (they are passed through via `${VAR}` interpolation).
- For production behind HTTPS, set `NEXTAUTH_URL` to the public `https://` URL so the
  secure session cookie name is used.
