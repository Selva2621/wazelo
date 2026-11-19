import { isOpen, localTime } from './bot-hours';
import { wantsHuman } from './handoff-intent';

// Thu 22 Oct 2026, 04:00 UTC = 09:30 in Asia/Kolkata
const THU_0930_IST = new Date('2026-10-22T04:00:00Z');
const hours = { hoursEnabled: true, openMinute: 9 * 60, closeMinute: 20 * 60, openDays: [1, 2, 3, 4, 5, 6] };

describe('localTime', () => {
  it('converts to the org timezone', () => {
    expect(localTime(THU_0930_IST, 'Asia/Kolkata')).toEqual({ day: 4, minute: 9 * 60 + 30 });
  });

  it('falls back to UTC for an unknown zone', () => {
    expect(localTime(THU_0930_IST, 'Not/AZone')).toEqual({ day: 4, minute: 4 * 60 });
  });
});

describe('isOpen', () => {
  it('is always open when hours are off', () => {
    expect(isOpen({ ...hours, hoursEnabled: false }, 'UTC', THU_0930_IST)).toBe(true);
  });

  it('respects open time, close time and days', () => {
    expect(isOpen(hours, 'Asia/Kolkata', THU_0930_IST)).toBe(true);
    expect(isOpen({ ...hours, openMinute: 10 * 60 }, 'Asia/Kolkata', THU_0930_IST)).toBe(false);
    expect(isOpen({ ...hours, openDays: [1, 2] }, 'Asia/Kolkata', THU_0930_IST)).toBe(false);
    // 20:00 sharp is closed
    expect(isOpen(hours, 'Asia/Kolkata', new Date('2026-10-22T14:30:00Z'))).toBe(false);
  });

  it('handles hours that run past midnight', () => {
    const night = { hoursEnabled: true, openMinute: 18 * 60, closeMinute: 2 * 60, openDays: [4] }; // Thu 18:00–02:00
    expect(isOpen(night, 'UTC', new Date('2026-10-22T23:00:00Z'))).toBe(true); // Thu 23:00
    expect(isOpen(night, 'UTC', new Date('2026-10-23T01:30:00Z'))).toBe(true); // Fri 01:30, Thu's shift
    expect(isOpen(night, 'UTC', new Date('2026-10-23T02:00:00Z'))).toBe(false);
    expect(isOpen(night, 'UTC', new Date('2026-10-22T01:00:00Z'))).toBe(false); // Thu 01:00, Wed closed
  });
});

describe('wantsHuman', () => {
  it.each([
    'Can I talk to a human?',
    'connect me with someone please',
    'I want to speak to the manager',
    'real person pls',
    'call me',
    'aal kitta pesanum',
    'owner kooda pesalama',
    'call pannunga',
    'மனிதர் கிட்ட பேசணும்',
  ])('detects "%s"', (text) => expect(wantsHuman(text)).toBe(true));

  it.each(['What is the price?', 'Do you have a travel agent plan?', 'I will call you tomorrow', '', 'Who is the owner of this shop?'])(
    'ignores "%s"',
    (text) => expect(wantsHuman(text)).toBe(false),
  );
});
