/** Days before a paid period ends that the "renew now" reminder goes out (the end day itself gets the expiry notice) */
export const RENEWAL_REMINDER_DAYS = [3, 1] as const;

/** "3 days (25 Nov)" / "1 day (23 Nov)" — the reminder's detail line ({{3}} of the HQ template) */
export function renewalDueDetail(daysLeft: number, periodEnd: string | Date): string {
  const date = new Date(periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} (${date})`;
}
