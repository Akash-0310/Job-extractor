# Setup guide

End-to-end setup from zero to your first extraction.

## 1. Get the code & dependencies

```bash
git clone <your-repo-url> job-email-extractor
cd job-email-extractor
npm install        # local dev only; Docker builds handle this themselves
```

## 2. Create Google OAuth credentials

Follow [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) to obtain:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Authorized redirect URI must be:

```
http://localhost:3000/api/auth/callback/google
```

(and your production URL's equivalent when deploying).

## 3. Configure environment

```bash
cp .env.example .env
```

Set at minimum:

```env
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/job_email_extractor?schema=public"
REDIS_URL="redis://localhost:6379"
```

See [ENVIRONMENT.md](./ENVIRONMENT.md) for every variable.

## 4. Start datastores

```bash
docker compose up -d postgres redis
```

## 5. Create the schema

```bash
npm run prisma:generate
npx prisma db push          # or: npm run prisma:migrate for versioned migrations
```

## 6. Run the app

```bash
npm run dev       # terminal 1 — web
npm run worker    # terminal 2 — background sync
```

## 7. First sync

1. Open <http://localhost:3000> and sign in with the Google account you applied with.
2. Grant the requested read-only Gmail permission (and **offline access**, which is what
   allows unattended background syncs).
3. Click **Sync Gmail**. The first run scans your entire `Sent` mailbox — this can take a
   while for large mailboxes and runs in the background worker. The top bar shows live
   progress; the Dashboard fills in as data lands.
4. Later syncs are **incremental** — only messages newer than the last processed one are
   fetched, and already-seen messages are never reprocessed.

## 8. Explore

- **Dashboard** — totals, dedup impact, top companies, monthly volume.
- **Email List** — every unique recipient; click a row for full detail + history.
- **Companies / Templates / Search** — browse, group, and query.
- **Settings** — sync interval, batch size, max emails, theme, auto-sync.
- **Export** — CSV / Excel / JSON from the Email List or Search pages.
