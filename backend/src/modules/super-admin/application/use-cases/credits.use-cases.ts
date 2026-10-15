import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreditEntryKind, PlatformAuditAction } from '@prisma/client';
import { CreditRepository } from '@/modules/billing/infrastructure/repositories/credit.repository';
import { checkCreditGrant, checkCreditRevoke } from '@/modules/billing/domain/services/credits';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';

export interface CreditAdjustmentInput {
  amountInCents: number;
  currency: string;
  reason: string;
}

const LEDGER_LIMIT = 200;

/** Balance per currency + the newest ledger entries for one org. */
@Injectable()
export class GetOrgCreditsUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly creditRepo: CreditRepository,
  ) {}

  async execute(orgId: string) {
    if (!(await this.platformRepo.findOrgAnyState(orgId))) throw new NotFoundException('Organization not found');
    const [balances, entries] = await Promise.all([
      this.creditRepo.balances(orgId),
      this.creditRepo.entries(orgId, LEDGER_LIMIT),
    ]);
    return {
      balances,
      entries: entries.map(({ invoice, ...e }) => ({ ...e, invoiceNumber: invoice?.invoiceNumber ?? null })),
    };
  }
}

/** Grants account credit; applied automatically to the org's next renewals in that currency. Audited. */
@Injectable()
export class GrantCreditUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly creditRepo: CreditRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(orgId: string, input: CreditAdjustmentInput, actor: AuditActor, meta: RequestMeta) {
    const check = checkCreditGrant(input.amountInCents, input.currency);
    if (!check.ok) throw new BadRequestException(check.reason);
    if (!(await this.platformRepo.findOrgBasics(orgId))) throw new NotFoundException('Organization not found');

    const result = await this.creditRepo.withOrgLock(orgId, async (tx) => {
      const entry = await this.creditRepo.create(
        {
          orgId,
          currency: input.currency,
          amountInCents: input.amountInCents,
          kind: CreditEntryKind.GRANT,
          reason: input.reason,
          createdById: actor.id,
        },
        tx,
      );
      return { entry, balanceInCents: await this.creditRepo.balance(orgId, input.currency, tx) };
    });
    if (!result) throw new NotFoundException('Organization not found');

    await this.audit.record({
      action: PlatformAuditAction.CREDIT_GRANTED,
      actor,
      targetType: 'Organization',
      targetId: orgId,
      orgId,
      metadata: {
        entryId: result.entry.id,
        amountInCents: input.amountInCents,
        currency: input.currency,
        reason: input.reason,
        balanceAfterInCents: result.balanceInCents,
      },
      meta,
    });
    return result;
  }
}

/** Takes back unused credit — never more than the remaining balance in that currency. Audited. */
@Injectable()
export class RevokeCreditUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly creditRepo: CreditRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(orgId: string, input: CreditAdjustmentInput, actor: AuditActor, meta: RequestMeta) {
    if (!(await this.platformRepo.findOrgAnyState(orgId))) throw new NotFoundException('Organization not found');

    // Balance read + write under the org row lock: concurrent revokes / renewals can't overdraw
    const result = await this.creditRepo.withOrgLock(orgId, async (tx) => {
      const balance = await this.creditRepo.balance(orgId, input.currency, tx);
      const check = checkCreditRevoke(balance, input.amountInCents, input.currency);
      if (!check.ok) throw new BadRequestException(check.reason);
      const entry = await this.creditRepo.create(
        {
          orgId,
          currency: input.currency,
          amountInCents: -input.amountInCents,
          kind: CreditEntryKind.REVOKED,
          reason: input.reason,
          createdById: actor.id,
        },
        tx,
      );
      return { entry, balanceInCents: balance - input.amountInCents };
    });
    if (!result) throw new NotFoundException('Organization not found');

    await this.audit.record({
      action: PlatformAuditAction.CREDIT_REVOKED,
      actor,
      targetType: 'Organization',
      targetId: orgId,
      orgId,
      metadata: {
        entryId: result.entry.id,
        amountInCents: input.amountInCents,
        currency: input.currency,
        reason: input.reason,
        balanceAfterInCents: result.balanceInCents,
      },
      meta,
    });
    return result;
  }
}
