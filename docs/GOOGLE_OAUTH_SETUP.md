# Google OAuth (Gmail API) setup

This app authenticates with Google and reads Gmail using the **official Gmail API** with
the read-only scope `https://www.googleapis.com/auth/gmail.readonly`. No app passwords,
IMAP, or SMTP are used, and the app can never send mail.

## 1. Create / select a Google Cloud project

1. Go to <https://console.cloud.google.com/>.
2. Create a new project (e.g. `job-email-extractor`) or select an existing one.

## 2. Enable the Gmail API

1. Navigate to **APIs & Services → Library**.
2. Search for **Gmail API** and click **Enable**.

## 3. Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**.
2. User type: **External** (unless you use Google Workspace and want Internal).
3. Fill in app name, support email, and developer contact.
4. **Scopes** → Add:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `https://www.googleapis.com/auth/gmail.readonly`
5. **Test users** → add the Gmail address you'll sign in with (required while the app is
   in *Testing* publishing status).

> While in **Testing** status, refresh tokens issued to test users can expire after 7
> days. For continuous unattended syncing, either keep re-authenticating, or move the app
> to **Production** (requires Google verification for the restricted `gmail.readonly`
> scope). For personal use, Testing mode is usually fine.

## 4. Create OAuth client credentials

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - your production origin, e.g. `https://extractor.example.com`
4. **Authorized redirect URIs** (must match exactly):
   - `http://localhost:3000/api/auth/callback/google`
   - `https://extractor.example.com/api/auth/callback/google`
5. Click **Create** and copy the **Client ID** and **Client secret**.

## 5. Put them in your environment

```env
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxxxx"
NEXTAUTH_URL="http://localhost:3000"      # must match the origin/redirect
NEXTAUTH_SECRET="<openssl rand -base64 32>"
```

## 6. Why offline access + consent prompt?

The app requests `access_type=offline` and `prompt=consent` so Google returns a
**refresh token**. The refresh token is stored in the `Account` table and used by the
background worker to refresh the short-lived access token automatically. Without it,
unattended background syncs could not run.

## Troubleshooting

- **`redirect_uri_mismatch`** — the redirect URI in the console must be exactly
  `<NEXTAUTH_URL>/api/auth/callback/google`.
- **`access_blocked` / app not verified** — add your account under **Test users**, or
  submit the app for verification for production use.
- **No refresh token / `GMAIL_AUTH_EXPIRED`** — disconnect and sign in again; the first
  consent is what mints the refresh token. Revoking access at
  <https://myaccount.google.com/permissions> and re-consenting also fixes this.
