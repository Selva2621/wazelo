import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GetOrgCreditsUseCase, GrantCreditUseCase, RevokeCreditUseCase } from './credits.use-cases';
import { CreateManualInvoiceUseCase, MarkInvoicePaidUseCase, VoidInvoiceUseCase } from './manual-invoices.use-cases';
import { CreateCouponUseCase, DeactivateCouponUseCase, ListCouponsUseCase } from './coupons.use-cases';

const actor = { id: 'sa-1', email: 'a@x.com' };
const org = { id: 'org-1', name: 'Acme' };

function platformRepo(found = true) {
  return {
    findOrgBasics: jest.fn(async () => (found ? org : null)),
    findOrgAnyState: jest.fn(async () => (found ? org : null)),
  };
}

/** Ledger-backed credit repo; `withOrgLock` runs work serially like the real row lock. */
function creditRepo(balance: number) {
  const ledger: any[] = balance ? [{ currency: 'INR', amountInCents: balance }] : [];
  let lock = Promise.resolve();
  return {
    ledger,
    withOrgLock: jest.fn((_org: string, work: any) => {
      const run = lock.then(() => work({}));
      lock = run.then(() => undefined, () => undefined);
      return run;
    }),
    balance: jest.fn(async (_o: string, cur: string) =>
      ledger.filter((e) => e.currency === cur).reduce((s, e) => s + e.amountInCents, 0)),
    create: jest.fn(async (input: any) => {
      const e = { id: `ce-${ledger.length}`, ...input };
      ledger.push(e);
      return e;
    }),
    balances: jest.fn(async () => [{ currency: 'INR', balanceInCents: balance }]),
    entries: jest.fn(async () => [{ id: 'ce-1', amountInCents: balance, invoice: { invoiceNumber: 'INV-1' } }]),
  };
}

describe('credits', () => {
  it('grants credit, returns the new balance and audits CREDIT_GRANTED', async () => {
    const repo = creditRepo(100);
    const audit = { record: jest.fn() };
    const out = await new GrantCreditUseCase(platformRepo() as any, repo as any, audit as any).execute(
      'org-1', { amountInCents: 500, currency: 'INR', reason: 'goodwill' }, actor, {},
    );
    expect(out.balanceInCents).toBe(600);
    expect(repo.ledger[1]).toMatchObject({ kind: 'GRANT', amountInCents: 500, createdById: 'sa-1' });
    expect(audit.record.mock.calls[0][0]).toMatchObject({ action: 'CREDIT_GRANTED', orgId: 'org-1' });
  });

  it('refuses a non-positive grant and an unknown org', async () => {
    await expect(new GrantCreditUseCase(platformRepo() as any, creditRepo(0) as any, { record: jest.fn() } as any)
      .execute('org-1', { amountInCents: 0, currency: 'INR', reason: 'x' }, actor, {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(new GrantCreditUseCase(platformRepo(false) as any, creditRepo(0) as any, { record: jest.fn() } as any)
      .execute('org-1', { amountInCents: 1, currency: 'INR', reason: 'x' }, actor, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('revokes up to the balance and writes a negative REVOKED entry', async () => {
    const repo = creditRepo(1000);
    const audit = { record: jest.fn() };
    const out = await new RevokeCreditUseCase(platformRepo() as any, repo as any, audit as any).execute(
      'org-1', { amountInCents: 1000, currency: 'INR', reason: 'mistake' }, actor, {},
    );
    expect(out.balanceInCents).toBe(0);
    expect(repo.ledger[1]).toMatchObject({ kind: 'REVOKED', amountInCents: -1000 });
    expect(audit.record.mock.calls[0][0].action).toBe('CREDIT_REVOKED');
  });

  it('refuses to revoke more than the balance and audits nothing', async () => {
    const audit = { record: jest.fn() };
    await expect(new RevokeCreditUseCase(platformRepo() as any, creditRepo(1000) as any, audit as any)
      .execute('org-1', { amountInCents: 1001, currency: 'INR', reason: 'too much' }, actor, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('two concurrent revokes cannot overdraw the balance', async () => {
    const repo = creditRepo(1000);
    const uc = new RevokeCreditUseCase(platformRepo() as any, repo as any, { record: jest.fn() } as any);
    const results = await Promise.allSettled([
      uc.execute('org-1', { amountInCents: 700, currency: 'INR', reason: 'a' }, actor, {}),
      uc.execute('org-1', { amountInCents: 700, currency: 'INR', reason: 'b' }, actor, {}),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await repo.balance('org-1', 'INR')).toBe(300);
  });

  it('lists balances and ledger entries with invoice numbers', async () => {
    const out = await new GetOrgCreditsUseCase(platformRepo() as any, creditRepo(500) as any).execute('org-1');
    expect(out.balances).toEqual([{ currency: 'INR', balanceInCents: 500 }]);
    expect(out.entries[0]).toMatchObject({ id: 'ce-1', invoiceNumber: 'INV-1' });
    expect(out.entries[0]).not.toHaveProperty('invoice');
  });
});

describe('manual invoices', () => {
  it('creates an OPEN manual invoice with the computed total and audits INVOICE_CREATED', async () => {
    const invoiceRepo = { create: jest.fn(async (input: any) => ({ id: 'inv-1', invoiceNumber: 'INV-9', ...input })) };
    const audit = { record: jest.fn() };
    await new CreateManualInvoiceUseCase(platformRepo() as any, invoiceRepo as any, audit as any).execute(
      {
        orgId: 'org-1', currency: 'INR', dueDate: '2026-10-20', note: ' setup ',
        lineItems: [{ description: 'Setup', quantity: 2, unitAmountInCents: 1500 }],
      },
      actor, {},
    );
    expect(invoiceRepo.create.mock.calls[0][0]).toMatchObject({ totalInCents: 3000, note: 'setup', createdById: 'sa-1' });
    expect(audit.record.mock.calls[0][0]).toMatchObject({ action: 'INVOICE_CREATED', metadata: { amountInCents: 3000 } });
  });

  it('rejects a zero-total invoice', async () => {
    const uc = new CreateManualInvoiceUseCase(platformRepo() as any, { create: jest.fn() } as any, { record: jest.fn() } as any);
    await expect(uc.execute(
      { orgId: 'org-1', currency: 'INR', dueDate: '2026-10-20', lineItems: [{ description: 'x', quantity: 1, unitAmountInCents: 0 }] },
      actor, {},
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  /** Fake repo that runs `decide` against the given status, like the locked transaction. */
  function invoiceRepo(status: string) {
    const invoice = { id: 'inv-1', orgId: 'org-1', invoiceNumber: 'INV-1', amountInCents: 3000, currency: 'INR', status };
    return {
      markPaid: jest.fn(async (_id: string, _input: any, decide: any) => {
        decide(invoice);
        return { invoice: { ...invoice, status: 'PAID' }, payment: { id: 'pay-1' }, previousStatus: status };
      }),
      void: jest.fn(async (_id: string, _input: any, decide: any) => {
        decide(invoice);
        return { invoice: { ...invoice, status: 'VOID' }, previousStatus: status, creditRestoredInCents: 0 };
      }),
    };
  }

  it('marks an OPEN invoice paid and audits INVOICE_MARKED_PAID', async () => {
    const audit = { record: jest.fn() };
    const out = await new MarkInvoicePaidUseCase(invoiceRepo('OPEN') as any, audit as any).execute('inv-1', { note: 'NEFT' }, actor, {});
    expect(out.status).toBe('PAID');
    expect(audit.record.mock.calls[0][0]).toMatchObject({ action: 'INVOICE_MARKED_PAID', metadata: { paymentId: 'pay-1' } });
  });

  it.each(['PAID', 'VOID'])('refuses to settle a %s invoice', async (status) => {
    await expect(new MarkInvoicePaidUseCase(invoiceRepo(status) as any, { record: jest.fn() } as any).execute('inv-1', {}, actor, {}))
      .rejects.toBeInstanceOf(ConflictException);
    await expect(new VoidInvoiceUseCase(invoiceRepo(status) as any, { record: jest.fn() } as any).execute('inv-1', 'reason', actor, {}))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a future paid date', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    await expect(new MarkInvoicePaidUseCase(invoiceRepo('OPEN') as any, { record: jest.fn() } as any).execute('inv-1', { paidAt: future }, actor, {}))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('voids a DRAFT invoice and audits INVOICE_VOIDED', async () => {
    const audit = { record: jest.fn() };
    const out = await new VoidInvoiceUseCase(invoiceRepo('DRAFT') as any, audit as any).execute('inv-1', 'duplicate', actor, {});
    expect(out.status).toBe('VOID');
    expect(audit.record.mock.calls[0][0]).toMatchObject({ action: 'INVOICE_VOIDED', metadata: { reason: 'duplicate' } });
  });

  it('404s an unknown invoice', async () => {
    await expect(new VoidInvoiceUseCase({ void: jest.fn(async () => null) } as any, { record: jest.fn() } as any).execute('x', 'reason', actor, {}))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('coupons', () => {
  function couponRepo(over: Record<string, any> = {}) {
    return {
      plansByIds: jest.fn(async (ids: string[]) => ids.map((id) => ({ id, name: `Plan ${id}`, billingCycle: 'MONTHLY', currency: 'INR' }))),
      create: jest.fn(async (input: any) => ({ id: 'cp-1', redemptionCount: 0, active: true, ...input })),
      list: jest.fn(async () => [{ id: 'cp-1', code: 'A', appliesToPlanIds: ['p1', 'gone'] }]),
      findById: jest.fn(async () => ({ id: 'cp-1', code: 'SAVE', active: true })),
      deactivate: jest.fn(async () => ({ id: 'cp-1', code: 'SAVE', redemptionCount: 3, active: false })),
      ...over,
    };
  }

  it('creates an uppercase percent coupon (no currency) and audits COUPON_CREATED', async () => {
    const repo = couponRepo();
    const audit = { record: jest.fn() };
    const out = await new CreateCouponUseCase(repo as any, audit as any).execute(
      { code: 'save20', kind: 'PERCENT', percentOff: 20, currency: 'INR', appliesToPlanIds: ['p1'] }, actor, {},
    );
    expect(repo.create.mock.calls[0][0]).toMatchObject({ code: 'SAVE20', currency: null, firstPaymentOnly: true, createdById: 'sa-1' });
    expect(out.plans).toEqual([{ id: 'p1', name: 'Plan p1', billingCycle: 'MONTHLY' }]);
    expect(audit.record.mock.calls[0][0].action).toBe('COUPON_CREATED');
  });

  it('rejects FIXED without currency, recurring coupons and unknown plans', async () => {
    const uc = new CreateCouponUseCase(couponRepo() as any, { record: jest.fn() } as any);
    await expect(uc.execute({ code: 'FLAT', kind: 'FIXED', amountOffInCents: 500 }, actor, {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(uc.execute({ code: 'REC', kind: 'PERCENT', percentOff: 10, firstPaymentOnly: false }, actor, {})).rejects.toBeInstanceOf(BadRequestException);
    const missing = new CreateCouponUseCase(couponRepo({ plansByIds: jest.fn(async () => []) }) as any, { record: jest.fn() } as any);
    await expect(missing.execute({ code: 'X10', kind: 'PERCENT', percentOff: 10, appliesToPlanIds: ['nope'] }, actor, {}))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps a duplicate code to 409', async () => {
    const dup = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' });
    const uc = new CreateCouponUseCase(couponRepo({ create: jest.fn(async () => { throw dup; }) }) as any, { record: jest.fn() } as any);
    await expect(uc.execute({ code: 'SAVE', kind: 'PERCENT', percentOff: 10 }, actor, {})).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists coupons with resolved plan names, skipping missing plans', async () => {
    const out = await new ListCouponsUseCase(couponRepo({
      plansByIds: jest.fn(async () => [{ id: 'p1', name: 'Pro', billingCycle: 'MONTHLY' }]),
    }) as any).execute();
    expect(out.coupons[0].plans).toEqual([{ id: 'p1', name: 'Pro', billingCycle: 'MONTHLY' }]);
  });

  it('deactivates (never deletes) and audits COUPON_DEACTIVATED', async () => {
    const audit = { record: jest.fn() };
    const out = await new DeactivateCouponUseCase(couponRepo() as any, audit as any).execute('cp-1', actor, {});
    expect(out.active).toBe(false);
    expect(audit.record.mock.calls[0][0]).toMatchObject({ action: 'COUPON_DEACTIVATED', metadata: { redemptionCount: 3 } });
  });

  it('409s when already inactive, 404s when missing', async () => {
    await expect(new DeactivateCouponUseCase(couponRepo({ deactivate: jest.fn(async () => null) }) as any, { record: jest.fn() } as any)
      .execute('cp-1', actor, {})).rejects.toBeInstanceOf(ConflictException);
    await expect(new DeactivateCouponUseCase(couponRepo({ findById: jest.fn(async () => null) }) as any, { record: jest.fn() } as any)
      .execute('cp-1', actor, {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
