import { ApplyRenewalCreditUseCase } from './apply-renewal-credit.use-case';

/**
 * In-memory fakes: the credit repo keeps a ledger and runs `withOrgLock` work serially,
 * like the real org-row lock does.
 */
function setup(initialBalance: number) {
  const ledger: any[] = initialBalance ? [{ amountInCents: initialBalance, currency: 'INR', idempotencyKey: null }] : [];
  const invoices: any[] = [];
  let lock = Promise.resolve();
  const creditRepo = {
    findByIdempotencyKey: jest.fn(async (key: string) => ledger.find((e) => e.idempotencyKey === key) ?? null),
    hasPositiveBalance: jest.fn(async (_org: string, cur: string) =>
      ledger.filter((e) => e.currency === cur).reduce((s, e) => s + e.amountInCents, 0) > 0),
    balance: jest.fn(async (_org: string, cur: string) =>
      ledger.filter((e) => e.currency === cur).reduce((s, e) => s + e.amountInCents, 0)),
    withOrgLock: jest.fn((_org: string, work: (tx: any) => Promise<any>) => {
      const run = lock.then(() => work({}));
      lock = run.then(() => undefined, () => undefined);
      return run;
    }),
    create: jest.fn(async (input: any) => {
      const entry = { id: `ce-${ledger.length}`, ...input };
      ledger.push(entry);
      return entry;
    }),
  };
  const paymentRepo = {
    getNextInvoiceNumber: jest.fn(async () => `INV-${String(invoices.length + 1).padStart(8, '0')}`),
    createInvoice: jest.fn(async (input: any) => {
      const inv = { id: `inv-${invoices.length + 1}`, ...input };
      invoices.push(inv);
      return inv;
    }),
  };
  const useCase = new ApplyRenewalCreditUseCase(creditRepo as any, paymentRepo as any);
  return { useCase, ledger, invoices, creditRepo, paymentRepo };
}

const input = {
  orgId: 'org-1',
  subscriptionId: 'sub-1',
  priceInCents: 1000,
  currency: 'INR',
  periodStart: new Date('2026-10-11T00:00:00Z'),
  periodEnd: new Date('2026-11-11T00:00:00Z'),
  renewalKey: 'sub-1:2026-10-11T00:00:00.000Z',
  planLine: { description: 'Pro plan - monthly', amount: 1000, quantity: 1 },
};

describe('ApplyRenewalCreditUseCase', () => {
  it('returns null and takes no lock when the org has no credit', async () => {
    const { useCase, creditRepo, paymentRepo } = setup(0);
    expect(await useCase.execute(input)).toBeNull();
    expect(creditRepo.withOrgLock).not.toHaveBeenCalled();
    expect(paymentRepo.createInvoice).not.toHaveBeenCalled();
  });

  it('applies partial credit: OPEN invoice with a negative credit line, APPLIED entry linked to it', async () => {
    const { useCase, ledger, invoices } = setup(300);
    const out = await useCase.execute(input);
    expect(out).toEqual({ invoiceId: 'inv-1', appliedInCents: 300, amountDueInCents: 700, reused: false });
    expect(invoices[0]).toMatchObject({ status: 'OPEN', amountInCents: 700, currency: 'INR' });
    expect(invoices[0].lineItems).toEqual([
      input.planLine,
      { description: 'Account credit', amount: -300, quantity: 1 },
    ]);
    const applied = ledger.find((e) => e.kind === 'APPLIED');
    expect(applied).toMatchObject({ amountInCents: -300, invoiceId: 'inv-1', idempotencyKey: `credit-apply:${input.renewalKey}` });
  });

  it('covers the full amount when the balance is larger (amount due 0)', async () => {
    const { useCase, ledger } = setup(5000);
    const out = await useCase.execute(input);
    expect(out).toMatchObject({ appliedInCents: 1000, amountDueInCents: 0 });
    expect(ledger.reduce((s, e) => s + e.amountInCents, 0)).toBe(4000);
  });

  it('is idempotent per renewal: a re-run reuses the invoice and applies nothing more', async () => {
    const { useCase, ledger, invoices } = setup(300);
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);
    expect(second).toEqual({ invoiceId: first!.invoiceId, appliedInCents: 300, amountDueInCents: 700, reused: true });
    expect(invoices).toHaveLength(1);
    expect(ledger.filter((e) => e.kind === 'APPLIED')).toHaveLength(1);
  });

  it('concurrent runs for the same renewal apply credit once', async () => {
    const { useCase, ledger, invoices } = setup(300);
    const [a, b] = await Promise.all([useCase.execute(input), useCase.execute(input)]);
    expect(a!.invoiceId).toBe(b!.invoiceId);
    expect(invoices).toHaveLength(1);
    expect(ledger.filter((e) => e.kind === 'APPLIED')).toHaveLength(1);
  });

  it('ignores credit in another currency', async () => {
    const { useCase } = setup(300);
    expect(await useCase.execute({ ...input, currency: 'USD' })).toBeNull();
  });

  it('does nothing for a zero price', async () => {
    const { useCase, creditRepo } = setup(300);
    expect(await useCase.execute({ ...input, priceInCents: 0 })).toBeNull();
    expect(creditRepo.findByIdempotencyKey).not.toHaveBeenCalled();
  });
});
