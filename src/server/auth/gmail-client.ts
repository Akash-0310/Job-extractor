import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import type { gmail_v1 } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { GmailAuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { googleFetchImplementation } from './http-agent';

/** Skew (ms) before real expiry at which we proactively refresh the token. */
const EXPIRY_SKEW_MS = 60_000;

// Route every googleapis request (Gmail API calls) through undici's fetch
// instead of gaxios's default node-fetch@2. See http-agent.ts for why. Applied
// once at module load.
if (googleFetchImplementation) {
  google.options({ fetchImplementation: googleFetchImplementation });
}

/**
 * Build an authenticated OAuth2 client for a user, refreshing the access token
 * from the stored refresh_token when it is missing or near expiry. The refreshed
 * token is written back to the Account row so it is reused across requests.
 *
 * Throws GmailAuthError when the account has no Google connection or no
 * refresh_token (the user must re-consent).
 */
export async function getOAuthClientForUser(userId: string): Promise<OAuth2Client> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
  });

  if (!account) {
    throw new GmailAuthError('No Google account is connected. Please sign in with Google.');
  }
  if (!account.refresh_token) {
    throw new GmailAuthError(
      'Missing Google refresh token. Please disconnect and reconnect your Google account, granting offline access.',
    );
  }

  const client = new OAuth2Client({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    // Route the token-refresh call through undici's fetch too.
    transporterOptions: googleFetchImplementation
      ? { fetchImplementation: googleFetchImplementation }
      : undefined,
  });

  client.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  const expiresAtMs = account.expires_at ? account.expires_at * 1000 : 0;
  const needsRefresh = !account.access_token || Date.now() >= expiresAtMs - EXPIRY_SKEW_MS;

  if (needsRefresh) {
    try {
      const { credentials } = await client.refreshAccessToken();
      client.setCredentials(credentials);

      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: credentials.access_token ?? account.access_token,
          expires_at: credentials.expiry_date
            ? Math.floor(credentials.expiry_date / 1000)
            : account.expires_at,
          // Google may rotate the refresh token; keep the newest one.
          refresh_token: credentials.refresh_token ?? account.refresh_token,
          scope: credentials.scope ?? account.scope,
          token_type: credentials.token_type ?? account.token_type,
        },
      });
      logger.debug({ userId }, 'Refreshed Google access token');
    } catch (error) {
      logger.error({ userId, err: error }, 'Failed to refresh Google access token');
      throw new GmailAuthError();
    }
  }

  return client;
}

/** Build a Gmail API client bound to the user's (refreshed) credentials. */
export async function getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
  const auth = await getOAuthClientForUser(userId);
  return google.gmail({ version: 'v1', auth });
}
