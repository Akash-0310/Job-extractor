/**
 * Text utilities shared by the Gmail parser and the template detector.
 * All functions here are pure and deterministic.
 */

/** Strip HTML tags and decode common entities to plain text. */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|br|li|tr|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Normalize an email body for template comparison. The goal is to erase the
 * variable parts (names, roles, companies, dates, numbers, urls, greetings)
 * while preserving the structural boilerplate that identifies a template.
 */
export function normalizeForTemplate(text: string): string {
  if (!text) return '';
  let t = text.toLowerCase();

  // Remove quoted reply chains / signatures noise markers.
  t = t.replace(/^>.*$/gm, ' ');

  // Replace variable tokens with stable placeholders.
  t = t
    .replace(/https?:\/\/\S+/g, ' url ') // urls
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, ' email ') // emails
    .replace(/\+?\d[\d\s().-]{6,}\d/g, ' phone ') // phone numbers
    .replace(/\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b/g, ' date ') // dates
    .replace(
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?\b/g,
      ' date ',
    )
    .replace(/\b\d+\b/g, ' num '); // any remaining numbers

  // Collapse punctuation and whitespace.
  t = t
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return t;
}

/** Split normalized text into word tokens. */
export function tokenize(text: string): string[] {
  return text.split(' ').filter(Boolean);
}

/** Build the set of k-word shingles for a normalized text. */
export function shingleSet(text: string, k: number): Set<string> {
  const tokens = tokenize(text);
  const set = new Set<string>();
  if (tokens.length < k) {
    if (tokens.length > 0) set.add(tokens.join(' '));
    return set;
  }
  for (let i = 0; i <= tokens.length - k; i += 1) {
    set.add(tokens.slice(i, i + k).join(' '));
  }
  return set;
}

/** Jaccard similarity between two sets in [0, 1]. */
export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const item of small) {
    if (large.has(item)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
