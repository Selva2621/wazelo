import { createHash } from 'crypto';
import { createPkcePair, pkceChallenge, randomUrlSafe, safeEqual } from './oauth-pkce';

describe('oauth-pkce', () => {
  it('creates a 43-char base64url verifier with its S256 challenge', () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'));
    expect(pkceChallenge(verifier)).toBe(challenge);
  });

  it('matches the RFC 7636 appendix B example', () => {
    expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('never repeats random values', () => {
    expect(randomUrlSafe()).not.toBe(randomUrlSafe());
  });

  it('compares strings safely', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('', '')).toBe(false);
    expect(safeEqual(undefined, 'abc')).toBe(false);
    expect(safeEqual('abc', null)).toBe(false);
  });
});
