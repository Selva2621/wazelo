export interface PlaceholderContact {
  name: string | null;
  phoneNumber: string;
  email: string | null;
  leadStatus?: string | null;
}

/**
 * Fill a contact's details into a message, the same way for campaigns,
 * sequences and automations:
 *   {{name}} / {{contact.name}}             → first name, or "there" when unknown
 *   {{phone}}, {{email}}, {{leadStatus}}   (also with the contact. prefix)
 * Spaces inside the braces are fine. Anything else is left as written, so a
 * sender can fill its own extras (e.g. {{shopify.order_name}}) afterwards.
 */
export function fillContactPlaceholders(body: string, contact: PlaceholderContact | null): string {
  const firstName = contact?.name?.trim().split(/\s+/)[0];
  const values: Record<string, string> = {
    name: firstName || 'there',
    phone: contact?.phoneNumber ?? '',
    email: contact?.email ?? '',
    leadStatus: contact?.leadStatus ?? '',
  };
  return body.replace(
    /\{\{\s*(?:contact\.)?(name|phone|email|leadStatus)\s*\}\}/g,
    (_, key: string) => values[key],
  );
}
