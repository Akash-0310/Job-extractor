/**
 * Application-wide constants and tunables. Kept in one place so behavior can be
 * adjusted without hunting through the codebase.
 */

/** Gmail OAuth scopes. Read-only — the app can NEVER send or modify mail. */
export const GMAIL_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
] as const;

/** Gmail search query used to enumerate the user's sent mail. */
export const GMAIL_SENT_QUERY = 'in:sent';

/** Max number of Gmail message ids fetched per messages.list page. */
export const GMAIL_LIST_PAGE_SIZE = 500;

/** How many message bodies to fetch/process concurrently per batch. */
export const DEFAULT_BATCH_SIZE = 100;

/** Concurrency for per-message Gmail get() calls within a batch. */
export const GMAIL_GET_CONCURRENCY = 10;

/**
 * Template similarity threshold (Jaccard over 3-word shingles of normalized
 * text). Bodies at or above this similarity are grouped into one template.
 */
export const TEMPLATE_SIMILARITY_THRESHOLD = 0.75;

/** Shingle size (in words) used for template similarity. */
export const TEMPLATE_SHINGLE_SIZE = 3;

/** Public email providers whose domain should NOT be treated as a company. */
export const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'gmx.com',
  'mail.com',
  'pm.me',
]);

/**
 * Local-parts (the piece before "@") that indicate an automated / support
 * mailbox rather than a real HR or hiring contact. Used by
 * `isCompanyContactEmail` to drop these at extraction time. Any local-part
 * matching a no-reply / do-not-reply pattern is also rejected via regex, so
 * this set only needs the non-pattern cases. Kept intentionally conservative so
 * genuine role addresses (hr@, careers@, jobs@, recruiting@, talent@) survive.
 */
export const AUTOMATED_LOCALPARTS = new Set([
  'noreply',
  'no-reply',
  'donotreply',
  'mailer-daemon',
  'mailerdaemon',
  'postmaster',
  'bounce',
  'bounces',
  'notification',
  'notifications',
  'notify',
  'support',
  'help',
  'helpdesk',
]);

/** Pagination defaults for list endpoints. */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 200;

/** BullMQ queue + job names. */
export const QUEUE_NAMES = {
  sync: 'gmail-sync',
} as const;

export const JOB_NAMES = {
  fullSync: 'full-sync',
  incrementalSync: 'incremental-sync',
} as const;

/** Supported export formats. */
export const EXPORT_FORMATS = ['csv', 'xlsx', 'json'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/**
 * Recipient export column sets:
 *   - `full` — every column (email, company, domain, counts, subject, body, …).
 *   - `hr`   — focused HR list: HR Email, Company, Template.
 */
export const EXPORT_VIEWS = ['full', 'hr'] as const;
export type ExportView = (typeof EXPORT_VIEWS)[number];
