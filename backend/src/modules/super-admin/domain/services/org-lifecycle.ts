/** Rules for editing, deleting and restoring organizations. Pure logic, no I/O. */

export const ORG_RESTORE_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True for an IANA zone the runtime knows (e.g. Asia/Kolkata), false otherwise. */
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** When a deleted org stops being restorable. */
export function restoreDeadline(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + ORG_RESTORE_WINDOW_DAYS * DAY_MS);
}

export function canRestore(deletedAt: Date, now = new Date()): boolean {
  return now <= restoreDeadline(deletedAt);
}

/** Delete needs the org name typed exactly (case and outer spaces ignored). */
export function confirmsOrgName(typed: string, name: string): boolean {
  return typed.trim().toLowerCase() === name.trim().toLowerCase();
}
