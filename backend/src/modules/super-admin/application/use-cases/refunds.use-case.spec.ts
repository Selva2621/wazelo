import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RecordPaymentRefundUseCase } from './platform-billing.use-cases';

const actor = { id: 'sa-1', email: 'a@x.com' };

/** Fake repo that runs `decide` like the real locked transaction does. */
function repo(payment: { status: string; amountInCents: number } | null, refunded = 0) {
  return {
    recordRefund: jest.fn(async (_id: string, input: any, decide: any) => {
      if (!payment) return null;
      const p = { ...payment, currency: 'INR', orgId: 'org-1' };
      const { fullyRefunded } = decide(p, refunded);
      return { refund: { id: 'rf-1', amountInCents: input.amountInCents }, payment: p, refundedBefore: refunded, fullyRefunded };
    }),
  };
}

describe('RecordPaymentRefundUseCase', () => {
  it('records a partial refund and audits it', async () => {
    const r = repo({ status: 'SUCCEEDED', amountInCents: 1000 });
    const audit = { record: jest.fn() };
    const out = await new RecordPaymentRefundUseCase(r as any, audit as any).execute(
      'pay-1', { amountInCents: 300, reason: 'duplicate charge', externalRefundId: 'rfnd_1' }, actor, {},
    );
    expect(out.fullyRefunded).toBe(false);
    expect(audit.record.mock.calls[0][0].metadata).toMatchObject({ amountInCents: 300, externalRefundId: 'rfnd_1' });
  });

  it('marks the payment fully refunded when the total reaches the amount paid', async () => {
    const r = repo({ status: 'SUCCEEDED', amountInCents: 1000 }, 700);
    const out = await new RecordPaymentRefundUseCase(r as any, { record: jest.fn() } as any).execute(
      'pay-1', { amountInCents: 300, reason: 'rest of it' }, actor, {},
    );
    expect(out.fullyRefunded).toBe(true);
  });

  it('refuses an over-refund and audits nothing', async () => {
    const r = repo({ status: 'SUCCEEDED', amountInCents: 1000 }, 700);
    const audit = { record: jest.fn() };
    await expect(
      new RecordPaymentRefundUseCase(r as any, audit as any).execute('pay-1', { amountInCents: 301, reason: 'too much' }, actor, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('404s an unknown payment', async () => {
    await expect(
      new RecordPaymentRefundUseCase(repo(null) as any, { record: jest.fn() } as any).execute('x', { amountInCents: 1, reason: 'abc' }, actor, {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
