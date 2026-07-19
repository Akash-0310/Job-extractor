import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { streamRecipients } from '@/server/repositories/recipient.repository';
import { domainOf } from './company.service';
import type { ExportFormat, ExportView } from '@/config/constants';
import type { RecipientFilters } from '@/types';

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type Cell = string | number;
type Row = Record<string, Cell>;

/** The recipient shape yielded by `streamRecipients`. */
type StreamedRecipient = {
  email: string;
  sentCount: number;
  firstSentAt: Date;
  lastSentAt: Date;
  latestSubject: string | null;
  latestBodyText: string | null;
  company: { name: string; domain: string } | null;
  latestTemplate: { name: string } | null;
};

export interface ExportResult {
  filename: string;
  contentType: string;
  // Uint8Array (Buffer is a subclass) or string — both valid Response BodyInit.
  body: Uint8Array | string;
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function colWidth(header: string): number {
  if (header === 'Latest Body') return 60;
  return Math.max(18, Math.min(48, header.length + 12));
}

/**
 * Build a downloadable file from an async row source. For `xlsx` rows are
 * streamed straight into the worksheet so large exports (with big body columns)
 * never hold every row in memory at once; `csv`/`json` accumulate.
 */
async function buildFile(
  format: ExportFormat,
  opts: { base: string; sheet: string; headers: string[]; rows: AsyncIterable<Row> },
): Promise<ExportResult> {
  const { base, sheet, headers } = opts;
  const s = stamp();

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Job Email Extractor';
    const ws = workbook.addWorksheet(sheet);
    ws.columns = headers.map((h) => ({ header: h, key: h, width: colWidth(h) }));
    ws.getRow(1).font = { bold: true };
    for await (const row of opts.rows) ws.addRow(row);
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      filename: `${base}-${s}.xlsx`,
      contentType: XLSX_CONTENT_TYPE,
      body: Buffer.from(buffer),
    };
  }

  const all: Row[] = [];
  for await (const row of opts.rows) all.push(row);

  if (format === 'csv') {
    const csv = Papa.unparse({
      fields: headers,
      data: all.map((r) => headers.map((h) => r[h] ?? '')),
    });
    return { filename: `${base}-${s}.csv`, contentType: 'text/csv', body: csv };
  }

  return {
    filename: `${base}-${s}.json`,
    contentType: 'application/json',
    body: JSON.stringify(all, null, 2),
  };
}

// ---- Column mappers --------------------------------------------------------

const FULL_HEADERS = [
  'Email',
  'Company',
  'Domain',
  'Sent Count',
  'First Sent',
  'Latest Sent',
  'Latest Subject',
  'Latest Template',
  'Latest Body',
];

function fullRow(r: StreamedRecipient): Row {
  return {
    Email: r.email,
    Company: r.company?.name ?? '',
    Domain: r.company?.domain ?? '',
    'Sent Count': r.sentCount,
    'First Sent': r.firstSentAt.toISOString(),
    'Latest Sent': r.lastSentAt.toISOString(),
    'Latest Subject': r.latestSubject ?? '',
    'Latest Template': r.latestTemplate?.name ?? '',
    'Latest Body': r.latestBodyText ?? '',
  };
}

/** Focused HR list: HR Email, Company, Template. */
const HR_HEADERS = ['HR Email', 'Company', 'Template'];

function hrRow(r: StreamedRecipient): Row {
  return {
    'HR Email': r.email,
    Company: r.company?.name ?? domainOf(r.email),
    Template: r.latestTemplate?.name ?? '',
  };
}

/** Company list: Company, Domain, Email (one row per contact address). */
const COMPANY_HEADERS = ['Company', 'Domain', 'Email'];

// ---- Public API ------------------------------------------------------------

/**
 * Export deduplicated recipients. `view` selects the column set:
 *   - `full` (default) — every column.
 *   - `hr` — HR Email, Company, Template.
 */
export async function exportRecipients(
  userId: string,
  format: ExportFormat,
  filters: RecipientFilters,
  view: ExportView = 'full',
): Promise<ExportResult> {
  const isHr = view === 'hr';
  const headers = isHr ? HR_HEADERS : FULL_HEADERS;
  const map = isHr ? hrRow : fullRow;

  async function* rows(): AsyncIterable<Row> {
    for await (const r of streamRecipients(userId, filters)) yield map(r as StreamedRecipient);
  }

  return buildFile(format, {
    base: isHr ? 'hr-contacts' : 'recipients',
    sheet: isHr ? 'HR Contacts' : 'Recipients',
    headers,
    rows: rows(),
  });
}

/**
 * Export the company list: one row per company/HR contact address, grouped and
 * sorted by company name. Columns: Company, Domain, Email. Rows are tiny (no
 * bodies) so we accumulate and sort in memory before writing.
 */
export async function exportCompanies(
  userId: string,
  format: ExportFormat,
  filters: RecipientFilters = {},
): Promise<ExportResult> {
  const collected: Row[] = [];
  for await (const r of streamRecipients(userId, filters)) {
    const rec = r as StreamedRecipient;
    collected.push({
      Company: rec.company?.name ?? domainOf(rec.email),
      Domain: rec.company?.domain ?? domainOf(rec.email),
      Email: rec.email,
    });
  }
  collected.sort(
    (a, b) =>
      String(a.Company).localeCompare(String(b.Company)) ||
      String(a.Email).localeCompare(String(b.Email)),
  );

  async function* rows(): AsyncIterable<Row> {
    for (const row of collected) yield row;
  }

  return buildFile(format, {
    base: 'companies',
    sheet: 'Companies',
    headers: COMPANY_HEADERS,
    rows: rows(),
  });
}
