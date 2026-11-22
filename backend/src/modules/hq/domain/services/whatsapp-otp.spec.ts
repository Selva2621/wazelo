import { canSendOtp, hashOtp, newOtpCode, otpMatches, OTP_MAX_SENDS_PER_DAY } from './whatsapp-otp';

describe('whatsapp-otp', () => {
  it('codes are 6 digits', () => {
    for (let i = 0; i < 50; i++) expect(newOtpCode()).toMatch(/^\d{6}$/);
  });

  it('a code only matches for the user it was made for', () => {
    const hash = hashOtp('u1', '123456');
    expect(otpMatches('u1', '123456', hash)).toBe(true);
    expect(otpMatches('u1', ' 123456 ', hash)).toBe(true);
    expect(otpMatches('u1', '654321', hash)).toBe(false);
    expect(otpMatches('u2', '123456', hash)).toBe(false);
  });

  it('one code a minute, five a day', () => {
    const now = new Date('2026-11-22T10:00:00Z');
    expect(canSendOtp([], now)).toBeNull();
    expect(canSendOtp([new Date('2026-11-22T09:59:30Z')], now)).toEqual({ reason: 'cooldown', retryInSeconds: 30 });
    expect(canSendOtp([new Date('2026-11-22T09:58:00Z')], now)).toBeNull();
    const many = Array.from({ length: OTP_MAX_SENDS_PER_DAY }, (_, i) => new Date(now.getTime() - (i + 2) * 3600_000));
    expect(canSendOtp(many, now)).toEqual({ reason: 'daily_limit' });
  });
});
