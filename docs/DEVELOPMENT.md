# Development guide

## Scripts

| Command                   | Description                                             |
| ------------------------- | ------------------------------------------------------ |
| `npm run dev`             | Start the Next.js dev server (hot reload).             |
| `npm run worker:dev`      | Run the BullMQ worker with file watching.              |
| `npm run build`           | Production build (`prisma generate` + `next build`).   |
| `npm start`               | Start the production server (after `build`).           |
| `npm run worker`          | Run the BullMQ worker once (production).               |
| `npm run lint`            | ESLint.                                                |
| `npm run format`          | Prettier write.                                        |
| `npm run typecheck`       | `tsc --noEmit`.                                        |
| `npm run prisma:generate` | Generate the Prisma client.                            |
| `npm run prisma:migrate`  | Create + apply a dev migration.                        |
| `npm run prisma:studio`   | Open Prisma Studio.                                    |

## Architecture & layering

Requests flow through clearly separated layers:

```
API route (app/api/*)             ← thin: auth + zod validation + shape response
  └─ apiHandler wrapper           ← centralized error → JSON mapping
      └─ Service (server/services)← domain logic (sync, template, company, export, stats)
          └─ Repository (server/repositories) ← all Prisma access lives here
              └─ Prisma / Postgres
```

- **Repositories** are the only place that touches Prisma. Services and routes never build
  raw queries (except intentional analytics SQL in `stats.service`).
- **Services** hold business rules and are unit-testable in isolation.
- **Gmail access** is encapsulated in `server/auth/gmail-client.ts` (token refresh) and
  `server/services/gmail.service.ts` (listing/parsing).

## How sync works

1. The UI/worker enqueues a job on the `gmail-sync` BullMQ queue (stable `jobId` dedupes
   concurrent requests).
2. The worker runs `SyncService.run()`:
   - **Full** (first run) enumerates `in:sent` page by page.
   - **Incremental** adds `after:<lastMessageEpoch>` to fetch only newer mail.
   - Each page is split into batches (`batchSize`). Already-stored `gmailMessageId`s are
     skipped, remaining messages are fetched with bounded concurrency (attachments ignored).
   - Per message: infer company → assign template → upsert the deduped `Recipient` →
     append an `EmailMessage` history row, inside a transaction.
   - Progress is written to `SyncState` so the UI can poll `/api/sync`.

## Template detection

See `server/services/template.service.ts` and `text.util.ts`:

1. Normalize the body (lowercase; replace urls/emails/phones/dates/numbers with
   placeholders; strip punctuation).
2. Exact match via SHA-256 fingerprint of the normalized text.
3. Otherwise Jaccard similarity over 3-word shingles vs known templates; assign to the
   best match ≥ `TEMPLATE_SIMILARITY_THRESHOLD` (default `0.75`), else create a new one.

Tune thresholds in `src/config/constants.ts`.

## Adding an API endpoint

1. Add a repository function if new data access is needed.
2. Add/extend a service for the business logic.
3. Create `src/app/api/<name>/route.ts`, wrap the handler with `apiHandler`, authenticate
   with `requireUserId()`, and validate input with a zod schema.
4. Add a client hook in `src/hooks/useApi.ts`.

## Code style

- TypeScript strict mode + `noUncheckedIndexedAccess`.
- ESLint (`next/core-web-vitals`) + Prettier (with the Tailwind plugin).
- Prefer composition and the repository pattern; keep comments to the non-obvious *why*.

## Testing the flow without waiting for a huge mailbox

Set **Settings → Max emails processed** to a small number (e.g. `200`) to cap the first
sync while you validate the pipeline, then set it back to `0` (unlimited).
