import { classifyDisconnect, isNumberLost } from './disconnect-classifier';

describe('classifyDisconnect', () => {
  it('reconnects immediately on restartRequired (515)', () => {
    expect(classifyDisconnect(515)).toMatchObject({ reason: 'RESTART', action: 'reconnect_now', clearCreds: false });
  });

  it.each([408, 428, 503, undefined])('backs off on network-type code %p', (code) => {
    expect(classifyDisconnect(code)).toMatchObject({ reason: 'NETWORK', action: 'reconnect_backoff', clearCreds: false });
  });

  it('stops and wipes creds on loggedOut (401)', () => {
    expect(classifyDisconnect(401)).toMatchObject({ reason: 'LOGGED_OUT', action: 'stop', clearCreds: true });
  });

  it('treats forbidden (403) as banned', () => {
    expect(classifyDisconnect(403)).toMatchObject({ reason: 'BANNED', action: 'stop', clearCreds: true });
  });

  it('stops without wiping creds when replaced (440)', () => {
    expect(classifyDisconnect(440)).toMatchObject({ reason: 'REPLACED', action: 'stop', clearCreds: false });
  });

  it.each([411, 500])('asks for a new QR on bad session %p', (code) => {
    expect(classifyDisconnect(code)).toMatchObject({ reason: 'BAD_SESSION', action: 'stop', clearCreds: true });
  });
});

describe('isNumberLost', () => {
  it('is true only for logged-out or banned numbers', () => {
    expect(isNumberLost('BANNED')).toBe(true);
    expect(isNumberLost('LOGGED_OUT')).toBe(true);
    expect(isNumberLost('REPLACED')).toBe(false);
    expect(isNumberLost(null)).toBe(false);
  });
});
