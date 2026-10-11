import { jobErrorSummary, redactJobData } from './job-redaction';

describe('redactJobData', () => {
  it('masks values under secret-looking keys, at any depth', () => {
    const out = redactJobData({
      orgId: 'org-1',
      accessToken: 'abc',
      config: { apiKey: 'k', webhook: { signature: 's', url: 'https://x' } },
      password: 'p',
    }) as any;
    expect(out.orgId).toBe('org-1');
    expect(out.accessToken).toBe('[redacted]');
    expect(out.password).toBe('[redacted]');
    expect(out.config.apiKey).toBe('[redacted]');
    expect(out.config.webhook.signature).toBe('[redacted]');
    expect(out.config.webhook.url).toBe('https://x');
  });

  it('cuts long strings and collapses deep nesting', () => {
    const out = redactJobData({ body: 'x'.repeat(1000), a: { b: { c: { d: { e: 1 } } } } }) as any;
    expect(out.body.length).toBeLessThan(400);
    expect(out.body).toContain('(1000 chars)');
    expect(out.a.b.c.d).toBe('{…}');
  });

  it('leaves primitives and empty secrets alone', () => {
    expect(redactJobData(5)).toBe(5);
    expect(redactJobData({ token: null })).toEqual({ token: null });
  });
});

describe('jobErrorSummary', () => {
  it('prefers message, then Prisma meta.error', () => {
    expect(jobErrorSummary({ message: 'boom' })).toBe('boom');
    expect(jobErrorSummary({ code: 'P2028', meta: { error: 'Transaction already closed' } })).toBe(
      'Transaction already closed',
    );
  });

  it('handles empty and long output', () => {
    expect(jobErrorSummary(null)).toBeNull();
    expect(jobErrorSummary('y'.repeat(2000), 50)).toHaveLength(51);
  });
});
