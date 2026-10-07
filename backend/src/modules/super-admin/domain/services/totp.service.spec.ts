import { TotpService } from './totp.service';

// RFC 6238 Appendix B test secret ("12345678901234567890") in base32
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('TotpService', () => {
  const totp = new TotpService();

  it('matches the RFC 6238 SHA-1 test vectors (last 6 digits)', () => {
    expect(totp.generate(RFC_SECRET, 59 * 1000)).toBe('287082');
    expect(totp.generate(RFC_SECRET, 1111111109 * 1000)).toBe('081804');
    expect(totp.generate(RFC_SECRET, 1234567890 * 1000)).toBe('005924');
    expect(totp.generate(RFC_SECRET, 2000000000 * 1000)).toBe('279037');
  });

  it('accepts the current code and ±1 step of clock drift', () => {
    const now = 1_700_000_000_000;
    const secret = totp.generateSecret();
    expect(totp.verify(secret, totp.generate(secret, now), 1, now)).toBe(true);
    expect(totp.verify(secret, totp.generate(secret, now - 30_000), 1, now)).toBe(true);
    expect(totp.verify(secret, totp.generate(secret, now + 30_000), 1, now)).toBe(true);
  });

  it('rejects codes outside the drift window', () => {
    const now = 1_700_000_000_000;
    const secret = totp.generateSecret();
    expect(totp.verify(secret, totp.generate(secret, now - 90_000), 1, now)).toBe(false);
  });

  it('rejects malformed codes', () => {
    const secret = totp.generateSecret();
    expect(totp.verify(secret, '')).toBe(false);
    expect(totp.verify(secret, '12345')).toBe(false);
    expect(totp.verify(secret, 'abcdef')).toBe(false);
  });

  it('generates a 32-char base32 secret and an otpauth URL', () => {
    const secret = totp.generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    const url = totp.buildOtpAuthUrl(secret, 'admin@example.com');
    expect(url.startsWith('otpauth://totp/')).toBe(true);
    expect(url).toContain(`secret=${secret}`);
  });
});
