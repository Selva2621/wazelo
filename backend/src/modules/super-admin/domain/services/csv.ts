/** CSV serialisation for super admin list exports. Pure logic, no I/O. */

/** Rows above this are not exported; the response says the file was truncated. */
export const CSV_EXPORT_MAX_ROWS = 10_000;

/** Byte order mark so Excel reads the file as UTF-8 (Tamil and other non-Latin text). */
export const UTF8_BOM = '﻿';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/** A finished export, ready for the controller to send. */
export interface CsvExport {
  filename: string;
  csv: string;
  truncated: boolean;
}

/** Cells a spreadsheet would treat as a formula: =, +, -, @, tab, carriage return. */
const FORMULA_START = /^[=+\-@\t\r]/;

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  return JSON.stringify(value);
}

/**
 * One cell: text that starts like a formula is prefixed with `'` (numbers are left alone,
 * so -5 stays a number); then quoted when it holds a quote, comma or line break.
 */
export function csvCell(value: unknown): string {
  let text = toText(value);
  if (typeof value !== 'number' && typeof value !== 'bigint' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Header row plus one line per row, CRLF line endings, with a UTF-8 BOM. */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => csvCell(c.value(row))).join(','));
  return UTF8_BOM + lines.join('\r\n') + '\r\n';
}

const SECRET_KEY = /pass(word)?|secret|token|api[-_]?key|credential|cookie|signature|private|totp|recovery/i;

/**
 * Deep copy of a JSON value with anything under a secret-looking key masked. Belt and
 * braces for exported metadata: nothing secret should be recorded there in the first place.
 */
export function maskSecretKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskSecretKeys);
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SECRET_KEY.test(key) && v !== null && v !== '' ? '[redacted]' : maskSecretKeys(v);
  }
  return out;
}

/** `organizations-2026-10-10.csv` (UTC date). */
export function csvFilename(base: string, now = new Date()): string {
  return `${base}-${now.toISOString().slice(0, 10)}.csv`;
}

/**
 * Builds the export from rows fetched with `take: CSV_EXPORT_MAX_ROWS + 1`: one extra row
 * means more matched than the cap, so the file is truncated (and the extra row dropped).
 */
export function buildCsvExport<T>(
  base: string,
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
  now = new Date(),
): CsvExport {
  const truncated = rows.length > CSV_EXPORT_MAX_ROWS;
  const kept = truncated ? rows.slice(0, CSV_EXPORT_MAX_ROWS) : rows;
  return { filename: csvFilename(base, now), csv: toCsv(kept, columns), truncated };
}
