import dns from 'node:dns';
import type { LookupFunction } from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';

/**
 * A `dns.lookup` drop-in (matching Node's `net.LookupFunction`) that resolves
 * IPv4 only.
 *
 * Google publishes both A and AAAA records; this host's IPv6 route to Google is
 * unreliable — connections to the IPv6 address intermittently hang until the
 * socket times out (`ETIMEDOUT` via `internalConnectMultiple`). Clients that do
 * not fall back to IPv4 quickly (e.g. `openid-client`, used by NextAuth for the
 * token exchange) then fail sign-in. Forcing IPv4 resolution avoids the dead
 * path entirely. `dns.setDefaultResultOrder('ipv4first')` is insufficient
 * because it still hands the IPv6 address to the connector.
 */
export const ipv4Lookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, family: 4 }, callback);
};

/**
 * An undici Agent that pins outbound connections to IPv4 (`connect.family = 4`).
 *
 * The same broken IPv6 route to Google that breaks openid-client (see
 * `ipv4Lookup`) also breaks the Gmail API / token-refresh calls made through
 * gaxios. Those run on undici's `fetch`, and Node's bundled undici does NOT
 * fail over from a hanging IPv6 connection quickly — the connect attempt hangs
 * for the full connectTimeout (10s) and surfaces as
 * `ConnectTimeoutError: gmail.googleapis.com:443`. Pinning the family to 4 at
 * the dispatcher level skips the dead IPv6 path entirely, the same way
 * `ipv4Lookup` does for openid-client.
 */
const ipv4Agent = new Agent({ connect: { family: 4 } });

/**
 * HTTP transport override for all Google API traffic (googleapis + google-auth-
 * library, both of which run on gaxios).
 *
 * Two problems are solved here:
 *
 *  1. gaxios defaults to `node-fetch@2`, whose gzip response handling is fragile
 *     on some networks: the TCP connection is established and response headers
 *     arrive, but the gzip body stream is torn down mid-transfer, surfacing as
 *     `ERR_STREAM_PREMATURE_CLOSE`. undici's `fetch` does NOT exhibit this, so
 *     we point gaxios at it via its `fetchImplementation` option.
 *
 *  2. The IPv6-route-to-Google hang (see `ipv4Agent`). We use undici's OWN
 *     `fetch` (not `globalThis.fetch`) so the IPv4-pinned Agent below is a
 *     dispatcher from the same undici module instance — Node's bundled undici
 *     does not recognise an externally-installed Agent, so passing this Agent
 *     to `globalThis.fetch` would be silently ignored.
 *
 * Requires the `undici` package (this project depends on it directly).
 *
 * Set GOOGLE_USE_NODE_FETCH=1 to fall back to gaxios's default node-fetch.
 * Set GOOGLE_FORCE_IPV4=0 to keep undici but not pin the address family (e.g.
 * on an IPv6-only host).
 */
export const googleFetchImplementation =
  process.env.GOOGLE_USE_NODE_FETCH === '1'
    ? undefined
    : (input: Parameters<typeof undiciFetch>[0], init?: Parameters<typeof undiciFetch>[1]) =>
        undiciFetch(input, {
          ...init,
          ...(process.env.GOOGLE_FORCE_IPV4 === '0' ? {} : { dispatcher: ipv4Agent }),
        });
