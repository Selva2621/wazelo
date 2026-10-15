import { checkRefund } from './refunds';

describe('checkRefund', () => {
  it('allows partial and full refunds of a succeeded payment', () => {
    expect(checkRefund('SUCCEEDED', 1000, 0, 400)).toEqual({ ok: true, fullyRefunded: false, remainingAfter: 600 });
    expect(checkRefund('SUCCEEDED', 1000, 400, 600)).toEqual({ ok: true, fullyRefunded: true, remainingAfter: 0 });
  });

  it('never refunds more than was paid', () => {
    expect(checkRefund('SUCCEEDED', 1000, 400, 601)).toMatchObject({ ok: false });
  });

  it('rejects non-succeeded payments and bad amounts', () => {
    expect(checkRefund('REFUNDED', 1000, 1000, 1)).toMatchObject({ ok: false, reason: expect.stringContaining('already') });
    expect(checkRefund('FAILED', 1000, 0, 1)).toMatchObject({ ok: false });
    expect(checkRefund('SUCCEEDED', 1000, 0, 0)).toMatchObject({ ok: false });
    expect(checkRefund('SUCCEEDED', 1000, 0, 1.5)).toMatchObject({ ok: false });
  });
});
