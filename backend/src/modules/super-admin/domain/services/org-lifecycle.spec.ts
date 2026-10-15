import { canRestore, confirmsOrgName, isValidTimeZone, restoreDeadline, SLUG_PATTERN } from './org-lifecycle';

describe('org lifecycle rules', () => {
  it('validates IANA time zones', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Base')).toBe(false);
  });

  it('allows restore for 30 days after deletion', () => {
    const deletedAt = new Date('2026-10-01T00:00:00Z');
    expect(restoreDeadline(deletedAt).toISOString()).toBe('2026-10-31T00:00:00.000Z');
    expect(canRestore(deletedAt, new Date('2026-10-30T23:59:59Z'))).toBe(true);
    expect(canRestore(deletedAt, new Date('2026-10-31T00:00:01Z'))).toBe(false);
  });

  it('delete confirmation ignores case and outer spaces only', () => {
    expect(confirmsOrgName('  acme corp ', 'Acme Corp')).toBe(true);
    expect(confirmsOrgName('acme', 'Acme Corp')).toBe(false);
  });

  it('slugs are lowercase words joined by single hyphens', () => {
    expect(SLUG_PATTERN.test('acme-corp-2')).toBe(true);
    expect(SLUG_PATTERN.test('Acme')).toBe(false);
    expect(SLUG_PATTERN.test('acme--corp')).toBe(false);
  });
});
