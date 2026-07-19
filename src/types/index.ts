import type { ExportFormat } from '@/config/constants';

/** A single sent message parsed from Gmail, attachments stripped. */
export interface ParsedSentEmail {
  gmailMessageId: string;
  threadId: string | null;
  historyId: string | null;
  recipientEmail: string;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  sentAt: Date;
}

/** Result of a template-assignment decision. */
export interface TemplateAssignment {
  templateId: string;
  created: boolean;
}

/** Company inference result derived from an email address. */
export interface CompanyInference {
  name: string;
  domain: string;
  /** True when the domain is a public provider and no real company inferred. */
  isPublicProvider: boolean;
}

/** Dashboard aggregate statistics. */
export interface DashboardStats {
  totalEmailsScanned: number;
  uniqueRecipients: number;
  duplicatesRemoved: number;
  companiesFound: number;
  templatesDetected: number;
  lastSyncEndedAt: string | null;
  syncStatus: string;
}

/** Generic paginated envelope returned by list endpoints. */
export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Filters accepted by the recipient/email list + search endpoints. */
export interface RecipientFilters {
  q?: string;
  companyId?: string;
  domain?: string;
  templateId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'lastSentAt' | 'firstSentAt' | 'sentCount' | 'email';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ExportRequest {
  format: ExportFormat;
  entity: 'recipients' | 'companies' | 'templates' | 'messages';
  filters?: RecipientFilters;
}

/** Progress payload surfaced to the UI while a sync runs. */
export interface SyncProgress {
  status: string;
  totalScanned: number;
  processedInRun: number;
  lastSyncStartedAt: string | null;
  lastSyncEndedAt: string | null;
  errorMessage: string | null;
}
