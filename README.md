# 📮 Job Email Extractor

A production-grade web application that reads your Gmail **sent** mail, extracts the
HR/company email addresses you used for job applications, detects the templates you
reused, deduplicates recipients, and lets you search, filter, and export the results.

> **Read-only & non-sending.** This app uses the official Gmail API with the
> `gmail.readonly` scope. It **never** sends, drafts, deletes, or modifies email, and it
> **never** downloads or processes attachments (PDFs, resumes, images, ZIPs, docs).

---

## ✨ Features

- **Gmail OAuth** via the official Gmail API — no app passwords.
- **Sent-only analysis** — enumerates `in:sent` and parses recipients, subject, and body.
- **Attachment-free** — MIME attachment parts are ignored entirely.
- **Deduplicated recipients** — one record per address with first/last sent dates, send
  count, and latest subject/body/template.
- **Company inference** — derives a readable company name from the recipient domain
  (`careers@razorpay.com` → *Razorpay*), falling back to the domain when uncertain.
- **Intelligent template detection** — groups bodies by similarity so variations in
  company/role/date collapse into one template (normalization + Jaccard shingle similarity).
- **Search & filters** — by company, recipient email, domain, subject, template, and date.
- **Export** — CSV, Excel (.xlsx), and JSON.
- **Background sync** — BullMQ + Redis worker with batch processing, incremental sync, and
  retries; designed to handle **50,000+** sent emails without exhausting memory.
- **Modern UI** — Next.js App Router, Tailwind, dark mode; Dashboard, Email List,
  Companies, Templates, Search, Settings.
- **Production shape** — validated env, structured logging, typed error taxonomy,
  repository pattern, Dockerized (Postgres + Redis + web + worker).

## 🧱 Tech stack

| Layer      | Choice                                         |
| ---------- | ---------------------------------------------- |
| Frontend   | Next.js 14 (App Router), React 18, TypeScript  |
| Styling    | Tailwind CSS                                    |
| Backend    | Next.js API Routes (Node runtime)               |
| Auth       | NextAuth + Google OAuth (Gmail API)             |
| Database   | PostgreSQL                                       |
| ORM        | Prisma                                           |
| Jobs/Queue | BullMQ + Redis                                   |
| Data fetch | TanStack Query                                   |
| Exports    | PapaParse (CSV), ExcelJS (XLSX)                  |
| Deploy     | Docker + docker-compose                          |

## 🚀 Quick start (Docker — everything in one command)

```bash
cp .env.example .env
# Fill in NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (see docs/GOOGLE_OAUTH_SETUP.md)
docker compose up -d --build
# open http://localhost:3000
```

## 🖥️ Quick start (local dev)

```bash
# 1. Start Postgres + Redis (via Docker) and install deps
docker compose up -d postgres redis
npm install

# 2. Configure env
cp .env.example .env    # edit values

# 3. Create the database schema
npm run prisma:generate
npx prisma db push

# 4. Run the web app and the worker (two terminals)
npm run dev
npm run worker
# open http://localhost:3000
```

## 🗂️ Project structure

```
src/
├── app/                     # Next.js App Router (pages + API routes)
│   ├── (app)/               # Authenticated pages (Dashboard, Emails, …)
│   ├── api/                 # REST API route handlers
│   └── signin/              # Public sign-in page
├── components/              # Reusable React components (ui, layout, dashboard, recipients)
├── config/                  # Constants & tunables
├── hooks/                   # Client data hooks (TanStack Query)
├── lib/                     # env, prisma, logger, errors, utils, api-client
├── server/
│   ├── api/                 # Route handler wrapper + request validation (zod)
│   ├── auth/                # NextAuth options, session, Gmail OAuth client
│   ├── queue/               # BullMQ queue, connection, worker entrypoint
│   ├── repositories/        # Data-access layer (Prisma)
│   └── services/            # Domain logic (gmail, sync, template, company, export, stats)
└── types/                   # Shared TypeScript types
prisma/schema.prisma         # Normalized DB schema
docs/                        # Setup, OAuth, DB, Docker, dev, deployment guides
```

## 📚 Documentation

- [Installation](docs/INSTALLATION.md)
- [Setup](docs/SETUP.md)
- [Google OAuth setup](docs/GOOGLE_OAUTH_SETUP.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [Database & migrations](docs/DATABASE.md)
- [Docker](docs/DOCKER.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Production deployment](docs/DEPLOYMENT.md)

## 🔐 Security

- All secrets come from environment variables; nothing is hardcoded.
- Every API route authenticates the session and validates input with zod.
- OAuth tokens are stored server-side and refreshed automatically; logs redact tokens.
- The Gmail scope is read-only — the app is structurally incapable of sending mail.

## 📄 License

MIT
