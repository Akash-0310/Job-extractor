import type { NextAuthOptions } from 'next-auth';
import type { Adapter, AdapterAccount } from 'next-auth/adapters';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { custom } from 'openid-client';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { GMAIL_SCOPES } from '@/config/constants';
import { ipv4Lookup } from './http-agent';

// NextAuth v4 performs the Google OAuth token exchange via openid-client. Force
// its HTTP requests to resolve IPv4 only — this host's IPv6 route to Google
// hangs until timeout (OAUTH_CALLBACK_ERROR / ETIMEDOUT). See http-agent.ts.
// Opt out with GOOGLE_FORCE_IPV4=0 (e.g. on an IPv6-only host).
if (process.env.GOOGLE_FORCE_IPV4 !== '0') {
  custom.setHttpOptionsDefaults({ lookup: ipv4Lookup });
}

/**
 * PrismaAdapter, patched so `linkAccount` strips fields Google returns that are
 * not columns on our `Account` model. Google's token response includes
 * `refresh_token_expires_in`, which the stock adapter forwards verbatim into
 * `prisma.account.create()`, causing a PrismaClientValidationError
 * ("Unknown argument `refresh_token_expires_in`") that fails sign-in at the
 * OAuth callback. We drop it (and any other non-schema keys) before persisting.
 */
function buildAdapter(): Adapter {
  const base = PrismaAdapter(prisma);
  return {
    ...base,
    linkAccount: (account: AdapterAccount & { refresh_token_expires_in?: number }) => {
      // Non-schema keys Google may include — discard them before persisting.
      const { refresh_token_expires_in: _drop, ...data } = account;
      return base.linkAccount!(data as AdapterAccount);
    },
  };
}

/**
 * NextAuth configuration.
 *
 * Strategy: database sessions via the Prisma adapter. OAuth tokens (including
 * the long-lived refresh_token) are persisted in the `Account` table, which the
 * Gmail client reads and refreshes on demand — see `server/auth/gmail-client.ts`.
 *
 * We request `access_type=offline` + `prompt=consent` so Google returns a
 * refresh_token, which is required for unattended background syncs.
 */
export const authOptions: NextAuthOptions = {
  adapter: buildAdapter(),
  session: { strategy: 'database' },
  secret: env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Google is our only provider, so linking by verified email is safe here.
      // It also lets a fresh sign-in re-link to the existing user after the
      // stored Account row is cleared to re-grant scopes (the adapter's
      // linkAccount only runs when no account is linked; a repeat sign-in with
      // an existing Account row does NOT update the persisted tokens/scope).
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: GMAIL_SCOPES.join(' '),
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: 'true',
        },
      },
    }),
  ],
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
