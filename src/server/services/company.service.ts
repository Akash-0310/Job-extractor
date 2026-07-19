import { PUBLIC_EMAIL_DOMAINS, AUTOMATED_LOCALPARTS } from '@/config/constants';
import type { CompanyInference } from '@/types';

/** Multi-label public suffixes we should not strip down to a bare TLD. */
const COMPOUND_TLDS = new Set([
  'co.in',
  'co.uk',
  'co.jp',
  'com.au',
  'com.br',
  'co.nz',
  'com.sg',
  'co.za',
  'com.mx',
]);

const KNOWN_ACRONYMS = new Set(['hr', 'it', 'hcl', 'ibm', 'sap', 'aws', 'tcs', 'ey', 'kpmg', 'pwc']);

/** Extract the lowercase domain from an email address. */
export function domainOf(email: string): string {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).toLowerCase().trim();
}

/** Extract the lowercase local-part (before "@") from an email address. */
export function localPartOf(email: string): string {
  const at = email.indexOf('@');
  return (at === -1 ? email : email.slice(0, at)).toLowerCase().trim();
}

/** True for automated / no-reply / support mailboxes — not a real HR contact. */
function isAutomatedMailbox(localPart: string): boolean {
  if (/no[.\-_]?reply/.test(localPart)) return true;
  if (/do[.\-_]?not[.\-_]?reply/.test(localPart)) return true;
  return AUTOMATED_LOCALPARTS.has(localPart);
}

/**
 * Whether an address is a genuine company / HR contact worth extracting.
 * Rejects two kinds of noise so only company/HR addresses are stored:
 *   1. Personal mailboxes on public providers (gmail.com, outlook.com, …).
 *   2. Automated / support mailboxes (no-reply@, support@, mailer-daemon@, …).
 * Applied at extraction time in the Gmail sync pipeline.
 */
export function isCompanyContactEmail(email: string): boolean {
  const domain = domainOf(email);
  if (!domain || domain === 'unknown') return false;
  if (PUBLIC_EMAIL_DOMAINS.has(domain)) return false;
  return !isAutomatedMailbox(localPartOf(email));
}

/**
 * Infer a human-readable company name and canonical domain from a recipient
 * address. For public providers (gmail, outlook, …) there is no company, so we
 * flag `isPublicProvider` and fall back to the raw domain as the name.
 */
export function inferCompany(email: string): CompanyInference {
  const domain = domainOf(email);
  if (!domain) {
    return { name: 'Unknown', domain: 'unknown', isPublicProvider: false };
  }

  if (PUBLIC_EMAIL_DOMAINS.has(domain)) {
    return { name: domain, domain, isPublicProvider: true };
  }

  const labels = domain.split('.');
  // Determine the registrable name label (SLD), accounting for compound TLDs.
  let nameLabel = labels[0] ?? domain;
  if (labels.length >= 3) {
    const lastTwo = labels.slice(-2).join('.');
    if (COMPOUND_TLDS.has(lastTwo)) {
      nameLabel = labels[labels.length - 3] ?? nameLabel;
    } else {
      nameLabel = labels[labels.length - 2] ?? nameLabel;
    }
  } else if (labels.length === 2) {
    nameLabel = labels[0] ?? nameLabel;
  }

  return { name: prettifyCompanyName(nameLabel), domain, isPublicProvider: false };
}

/** Turn a domain label like "razorpay" or "my-startup" into "Razorpay" / "My Startup". */
export function prettifyCompanyName(label: string): string {
  const cleaned = label.replace(/[-_]+/g, ' ').trim();
  if (!cleaned) return label;
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((word) =>
      KNOWN_ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}
