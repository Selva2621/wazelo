import { toE164 } from './phone.util';

describe('toE164', () => {
  it.each([
    ['9876543210', 'IN', '+919876543210'],
    ['98765 43210', 'IN', '+919876543210'],
    ['098765-43210', 'IN', '+919876543210'],
    ['919876543210', 'IN', '+919876543210'],
    ['+91 98765 43210', 'AE', '+919876543210'],
    ['0091 98765 43210', 'AE', '+919876543210'],
    ['0501234567', 'AE', '+971501234567'],
    ['971501234567', 'IN', '+971501234567'],
    ['07911 123456', 'GB', '+447911123456'],
    ['(415) 555-2671', 'US', '+14155552671'],
  ])('%s in %s → %s', (raw, country, expected) => {
    expect(toE164(raw, country)).toBe(expected);
  });

  it('keeps well-formed test numbers that are not in a real range', () => {
    expect(toE164('1234567890', 'IN')).toBe('+911234567890');
  });

  it('rejects things that cannot be phone numbers', () => {
    expect(toE164('', 'IN')).toBeNull();
    expect(toE164('12345', 'IN')).toBeNull();
    expect(toE164('hello@example.com', 'IN')).toBeNull();
  });
});
