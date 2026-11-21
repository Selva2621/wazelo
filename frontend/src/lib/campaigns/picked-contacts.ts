/**
 * Hand-picked contacts travel from the Contacts page to the new-campaign form
 * through sessionStorage, not the URL: up to 10,000 ids (~370 KB) would exceed
 * URL / header size limits. Read once, then cleared.
 */
const KEY = "wazelo:campaign-picked-contacts";
/** Value of ?contactIds= meaning "read them from sessionStorage" */
export const PICKED_FROM_SESSION = "session";

export function stashPickedContacts(ids: string[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Storage blocked/full: the form opens without the selection
  }
}

export function takePickedContacts(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
