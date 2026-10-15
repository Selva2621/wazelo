import { Injectable } from '@nestjs/common';
import { CreditEntryKind, InvoiceStatus } from '@prisma/client';
import { CreditRepository } from '../../infrastructure/repositories/credit.repository';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { applyCredit, InvoiceLine, withCreditLine } from '../../domain/services/credits';

export interface RenewalCreditInput {
  orgId: string;
  subscriptionId: string;
  priceInCents: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  /** Stable per renewal (e.g. subscription id + the period end being renewed) */
  renewalKey: string;
  planLine: InvoiceLine;
}

export interface RenewalCreditResult {
  invoiceId: string;
  appliedInCents: number;
  /** What is still to be charged through the gateway (0 = fully covered) */
  amountDueInCents: number;
  /** True when this renewal's credit had already been applied by an earlier run */
  reused: boolean;
}

/**
 * Applies account credit to a renewal BEFORE the gateway charge.
 *
 * Under the org row lock, in one transaction: re-read the balance in the subscription
 * currency, create the renewal invoice (OPEN, with a negative "Account credit" line) and
 * write the APPLIED ledger entry linked to it. The entry's idempotency key is derived from
 * the renewal, so a re-run (crash, retry, second worker) finds it and reuses the same
 * invoice instead of applying credit twice. Returns null when no credit applies.
 */
@Injectable()
export class ApplyRenewalCreditUseCase {
  constructor(
    private readonly creditRepo: CreditRepository,
    private readonly paymentRepo: PaymentRepository,
  ) {}

  async execute(input: RenewalCreditInput): Promise<RenewalCreditResult | null> {
    if (input.priceInCents <= 0) return null;
    const key = `credit-apply:${input.renewalKey}`;

    // Fast path: nothing to do for orgs without credit (no lock taken) — unless an
    // earlier run already applied credit to this renewal
    const earlier = await this.creditRepo.findByIdempotencyKey(key);
    if (!earlier && !(await this.creditRepo.hasPositiveBalance(input.orgId, input.currency))) return null;

    return this.creditRepo.withOrgLock(input.orgId, async (tx) => {
      const existing = await this.creditRepo.findByIdempotencyKey(key, tx);
      if (existing) {
        const applied = -existing.amountInCents;
        return {
          invoiceId: existing.invoiceId as string,
          appliedInCents: applied,
          amountDueInCents: Math.max(input.priceInCents - applied, 0),
          reused: true,
        };
      }

      const balance = await this.creditRepo.balance(input.orgId, input.currency, tx);
      const { appliedInCents, remainderInCents } = applyCredit(balance, input.priceInCents);
      if (appliedInCents <= 0) return null;

      const invoiceNumber = await this.paymentRepo.getNextInvoiceNumber(tx);
      const invoice = await this.paymentRepo.createInvoice(
        {
          orgId: input.orgId,
          subscriptionId: input.subscriptionId,
          invoiceNumber,
          amountInCents: remainderInCents,
          currency: input.currency,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          lineItems: withCreditLine([input.planLine], appliedInCents),
          dueDate: input.periodStart,
          status: InvoiceStatus.OPEN,
          metadata: { creditAppliedInCents: appliedInCents, renewalKey: input.renewalKey },
        },
        tx,
      );
      await this.creditRepo.create(
        {
          orgId: input.orgId,
          currency: input.currency,
          amountInCents: -appliedInCents,
          kind: CreditEntryKind.APPLIED,
          reason: `Applied to invoice ${invoiceNumber}`,
          invoiceId: invoice.id,
          idempotencyKey: key,
        },
        tx,
      );
      return { invoiceId: invoice.id, appliedInCents, amountDueInCents: remainderInCents, reused: false };
    });
  }
}
