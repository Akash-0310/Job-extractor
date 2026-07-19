import { createHash } from 'node:crypto';

/** Stable SHA-256 hex fingerprint of a string. */
export function fingerprint(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
