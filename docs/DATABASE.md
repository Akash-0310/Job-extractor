# Database & migrations

PostgreSQL via Prisma. The schema lives in `prisma/schema.prisma`.

## Schema overview

```
User ──1:1── UserSettings
 │      └─1:1── SyncState            (incremental sync cursor + progress)
 ├─1:N── Company                      (unique per userId+domain)
 ├─1:N── Template                     (grouped email bodies)
 ├─1:N── Recipient                    (DEDUPED — unique per userId+email)
 └─1:N── EmailMessage                 (history — one row per message+recipient)

Account / Session / VerificationToken (NextAuth models; store OAuth tokens)
```

### Key design points

- **`Recipient`** is the deduplicated record — exactly one row per `(userId, email)`. It
  carries `firstSentAt`, `lastSentAt`, `sentCount`, and the *latest* subject/body/template.
- **`EmailMessage`** is the raw history/audit trail — one row per `(message, recipient)`,
  unique on `(userId, gmailMessageId, recipientEmail)` so a message is never reprocessed
  and multi-recipient messages are handled.
- **`Company`** is unique on `(userId, domain)` so companies never duplicate.
- **`Template`** stores the normalized text + a SHA-256 `fingerprint` for exact matches and
  fuzzy grouping.
- **Indexes** exist on every common filter/sort path (`userId`, `lastSentAt`,
  `recipientEmail`, `companyId`, `templateId`, `fingerprint`) to keep the app fast at 50k+ rows.

## Applying the schema

### Quick (no migration history) — `db push`

Good for local dev and the default Docker flow:

```bash
npm run prisma:generate
npx prisma db push
```

### Versioned migrations (recommended for production)

```bash
# Create and apply a migration locally (needs a running Postgres)
npm run prisma:migrate            # prisma migrate dev

# Apply committed migrations in CI/production
npm run prisma:deploy             # prisma migrate deploy
```

To use versioned migrations in Docker, change the `migrate` service command in
`docker-compose.yml` from `prisma db push --skip-generate` to `prisma migrate deploy`
after you've committed a migration under `prisma/migrations/`.

## Inspecting data

```bash
npm run prisma:studio             # opens Prisma Studio in the browser
```

## Backups

The Postgres data lives in the `pgdata` Docker volume. Back it up with:

```bash
docker compose exec postgres pg_dump -U postgres job_email_extractor > backup.sql
```

Restore with:

```bash
cat backup.sql | docker compose exec -T postgres psql -U postgres job_email_extractor
```

## Resetting

```bash
npx prisma migrate reset          # DANGER: drops and recreates the database
# or, with the Docker stack:
docker compose down -v            # removes the pgdata volume
```
