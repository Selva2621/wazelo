/**
 * Placeholders the campaign batch worker fills per contact. Anything else in a
 * campaign message (e.g. `{{lead.service}}` from a freelancer template) would
 * reach contacts as raw `{{…}}` text.
 */
export const CONTACT_PLACEHOLDERS: ReadonlySet<string> = new Set([
  'name',
  'phone',
  'email',
  'leadStatus',
  'contact.name',
  'contact.phone',
  'contact.email',
  'contact.leadStatus',
]);

export function findUnknownPlaceholders(body: string | null | undefined): string[] {
  if (!body) return [];
  const keys = Array.from(body.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g), (m) => m[1]);
  return [...new Set(keys.filter((key) => !CONTACT_PLACEHOLDERS.has(key)))];
}
