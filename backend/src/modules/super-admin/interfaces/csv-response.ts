import { Response } from 'express';
import { CsvExport } from '../domain/services/csv';

/** Set when more rows matched than an export may hold (see CSV_EXPORT_MAX_ROWS). Exposed via CORS. */
export const EXPORT_TRUNCATED_HEADER = 'X-Export-Truncated';

/**
 * Sends a CSV export as a file download. Written straight to the Express response
 * (handlers use @Res()), so the global TransformInterceptor never wraps it in
 * { success, data } — Nest does not serialise a handler's return value under @Res().
 */
export function sendCsv(res: Response, file: CsvExport): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  if (file.truncated) res.setHeader(EXPORT_TRUNCATED_HEADER, 'true');
  res.send(file.csv);
}
