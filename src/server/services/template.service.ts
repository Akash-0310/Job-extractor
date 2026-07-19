import { prisma } from '@/lib/prisma';
import {
  TEMPLATE_SHINGLE_SIZE,
  TEMPLATE_SIMILARITY_THRESHOLD,
} from '@/config/constants';
import { normalizeForTemplate, shingleSet, jaccard } from './text.util';
import { fingerprint } from './hash.util';
import type { Template } from '@prisma/client';

/**
 * In-memory candidate used during a sync run so we don't hit the DB for every
 * message. Templates are cached per user for the lifetime of the matcher.
 */
interface TemplateCandidate {
  id: string;
  normalizedText: string;
  shingles: Set<string>;
}

/**
 * TemplateMatcher performs intelligent grouping of email bodies.
 *
 * Approach:
 *  1. Normalize the body (lowercase, strip variable tokens: names, roles,
 *     companies, dates, numbers, urls, emails) — see normalizeForTemplate.
 *  2. Exact-match short-circuit via SHA-256 fingerprint of normalized text.
 *  3. Otherwise compute Jaccard similarity over k-word shingles against known
 *     templates; assign to the best match at/above the threshold, else create
 *     a new template.
 *
 * This makes emails that differ only by company/role/date collapse into one
 * template, while structurally different bodies form new templates.
 */
export class TemplateMatcher {
  private candidates: TemplateCandidate[] = [];
  private loaded = false;

  constructor(private readonly userId: string) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const templates = await prisma.template.findMany({
      where: { userId: this.userId },
      select: { id: true, normalizedText: true },
    });
    this.candidates = templates.map((t) => ({
      id: t.id,
      normalizedText: t.normalizedText,
      shingles: shingleSet(t.normalizedText, TEMPLATE_SHINGLE_SIZE),
    }));
    this.loaded = true;
  }

  /**
   * Assign a body to an existing template or create a new one.
   * Returns the template id. Increments the template's emailCount.
   */
  async assign(bodyText: string | null, subject: string | null): Promise<string> {
    await this.ensureLoaded();

    const normalized = normalizeForTemplate(bodyText ?? subject ?? '');
    const fp = fingerprint(normalized);

    // 1) Exact normalized match (fast path) — check DB by fingerprint.
    const exact = await prisma.template.findFirst({
      where: { userId: this.userId, fingerprint: fp },
      select: { id: true },
    });
    if (exact) {
      await this.bump(exact.id);
      return exact.id;
    }

    // 2) Fuzzy match against cached candidates.
    const target = shingleSet(normalized, TEMPLATE_SHINGLE_SIZE);
    let best: { id: string; score: number } | null = null;
    for (const cand of this.candidates) {
      const score = jaccard(target, cand.shingles);
      if (score >= TEMPLATE_SIMILARITY_THRESHOLD && (!best || score > best.score)) {
        best = { id: cand.id, score };
      }
    }
    if (best) {
      await this.bump(best.id);
      return best.id;
    }

    // 3) Create a new template.
    const name = `Template ${this.candidates.length + 1}`;
    const created = await prisma.template.create({
      data: {
        userId: this.userId,
        name,
        normalizedText: normalized,
        fingerprint: fp,
        sampleSubject: subject,
        sampleBodyText: bodyText,
        emailCount: 1,
      },
    });
    this.candidates.push({ id: created.id, normalizedText: normalized, shingles: target });
    return created.id;
  }

  private async bump(templateId: string): Promise<void> {
    await prisma.template.update({
      where: { id: templateId },
      data: { emailCount: { increment: 1 } },
    });
  }
}

/** Recompute a template's stored emailCount from actual message rows. */
export async function recountTemplate(template: Template): Promise<number> {
  const count = await prisma.emailMessage.count({
    where: { userId: template.userId, templateId: template.id },
  });
  await prisma.template.update({ where: { id: template.id }, data: { emailCount: count } });
  return count;
}
