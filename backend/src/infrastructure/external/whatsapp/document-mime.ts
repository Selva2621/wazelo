const DOCUMENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
};

/** "Proposal P-0001.pdf" → application/pdf; unknown → octet-stream */
export function documentMimeType(nameOrUrl: string): string {
  const ext = nameOrUrl.split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? '';
  return DOCUMENT_TYPES[ext] ?? 'application/octet-stream';
}
