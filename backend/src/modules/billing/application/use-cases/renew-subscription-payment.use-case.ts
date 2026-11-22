import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditAction,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  Subscription,
  SubscriptionStatus,
  UsageMetricType,
} from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { UsageRepository } from '../../infrastructure/repositories/usage.repository';
import { addBillingCycle, addPrepaidPeriod, readPrepaid } from '../../domain/services/prepaid-period';

export interface RenewSubscriptionPaymentInput {
  planId: string;
  orderId: string;
  razorpayPaymentId: string;
  idempotencyKey?: string;
}

/** Statuses a payment brings back to ACTIVE with a fresh period starting now */
const UNPAID_STATUSES: SubscriptionStatus[] = [SubscriptionStatus.GRACE_PERIOD, SubscriptionStatus.PAST_DUE];

/**
 * A verified Razorpay payment renews the org's live subscription (plans are never
 * charged automatically — customers pay each period themselves):
 *  - ACTIVE, same plan, paid before the period ends → ONE more future period is prepaid
 *    (no limit): the current period and its usage quota are untouched, `metadata.prepaid`
 *    counts it (read-modify-write under the subscription row lock, so concurrent payments
 *    all count) and the billing-cycle worker starts each paid period at the old end.
 *    A pending cancel is undone.
 *  - ACTIVE whose period already ran out (worker not yet run) → new period from now.
 *  - GRACE_PERIOD / PAST_DUE (unpaid) → ACTIVE on the paid plan, new period from now.
 * EXPIRED / CANCELLED subscriptions are not live: the org subscribes afresh (SubscribeUseCase).
 * Payment + PAID invoice + subscription change are one transaction; the payment's unique
 * idempotency key stops a replayed verify from applying twice.
 */
@Injectable()
export class RenewSubscriptionPaymentUseCase {
  private readonly logger = new Logger(RenewSubscriptionPaymentUseCase.name);

  constructor(
    private readonly planRepo: PlanRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly usageRepo: UsageRepository,
    private readonly auditService: AuditService,
    private readonly events: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  /** Whether `execute` handles this payment (else it is a plan change / trial / new subscription) */
  static handles(existing: Pick<Subscription, 'status' | 'planId'>, planId: string): boolean {
    if (UNPAID_STATUSES.includes(existing.status)) return true;
    return existing.status === SubscriptionStatus.ACTIVE && existing.planId === planId;
  }

  async execute(orgId: string, userId: string, existing: Subscription, input: RenewSubscriptionPaymentInput) {
    if (!RenewSubscriptionPaymentUseCase.handles(existing, input.planId)) {
      throw new BadRequestException('This payment cannot renew the current subscription');
    }
    const plan = await this.planRepo.findById(input.planId);
    if (!plan) throw new NotFoundException('Plan not found');

    const idempotencyKey = input.idempotencyKey || `rzp-renew-${input.razorpayPaymentId}`;
    // The same Razorpay payment counts once (its externalId is unique too, so a concurrent
    // replay rolls back inside the transaction)
    const already =
      (await this.paymentRepo.findPaymentByIdempotencyKey(idempotencyKey)) ??
      (await this.paymentRepo.findPaymentByExternalId(input.razorpayPaymentId));
    if (already) {
      return { subscription: await this.subscriptionRepo.findById(existing.id), type: 'renewal', deduplicated: true };
    }

    const now = new Date();
    const wasUnpaid = UNPAID_STATUSES.includes(existing.status);
    const currentEnd = new Date(existing.currentPeriodEnd);
    // Paid before the period ends: buys one more future period, the current one is untouched
    const prepay = !wasUnpaid && currentEnd.getTime() > now.getTime();

    const renewed = await this.prisma.$transaction(async (tx) => {
      // Payment first: a replay hits the unique idempotency key and rolls everything back
      const payment = await this.paymentRepo.createPayment(
        {
          orgId,
          subscriptionId: existing.id,
          amountInCents: plan.priceInCents,
          currency: plan.currency,
          externalId: input.razorpayPaymentId,
          paymentMethod: 'razorpay',
          idempotencyKey,
        },
        tx,
      );
      await this.paymentRepo.transitionPaymentStatus(payment.id, PaymentStatus.PENDING, PaymentStatus.SUCCEEDED, undefined, tx);

      // What this payment buys. Prepaid: the next unpaid cycle after the current period,
      // read under the row lock so two payments at once get consecutive periods
      let paidFrom = now;
      let locked: Subscription | null = existing;
      if (prepay) {
        locked = await this.subscriptionRepo.lockForUpdate(existing.id, tx);
        if (!locked || locked.status !== SubscriptionStatus.ACTIVE) {
          throw new ConflictException('The subscription changed while paying — refresh Billing and try again');
        }
        paidFrom = addBillingCycle(new Date(locked.currentPeriodEnd), plan.billingCycle, readPrepaid(locked.metadata)?.periods ?? 0);
      }
      const paidUntil = addBillingCycle(paidFrom, plan.billingCycle);

      const invoiceNumber = await this.paymentRepo.getNextInvoiceNumber(tx);
      const invoice = await this.paymentRepo.createInvoice(
        {
          orgId,
          subscriptionId: existing.id,
          paymentId: payment.id,
          invoiceNumber,
          amountInCents: plan.priceInCents,
          currency: plan.currency,
          periodStart: paidFrom,
          periodEnd: paidUntil,
          lineItems: [{ description: `${plan.name} — ${plan.billingCycle} (Renewal)`, amount: plan.priceInCents, currency: plan.currency }],
          dueDate: now,
        },
        tx,
      );
      await this.paymentRepo.transitionInvoiceStatus(invoice.id, InvoiceStatus.DRAFT, InvoiceStatus.PAID, { paidAt: now }, tx);

      let prepaidPeriods = 0;
      let extra: Record<string, unknown>;
      if (prepay && locked) {
        const added = addPrepaidPeriod(locked.metadata, new Date(locked.currentPeriodEnd), plan.billingCycle, {
          paymentId: payment.id,
          invoiceId: invoice.id,
          paidAt: now.toISOString(),
        });
        prepaidPeriods = added.periods;
        extra = { cancelledAt: null, cancelReason: null, metadata: added.metadata as Prisma.InputJsonValue };
      } else {
        extra = {
          currentPeriodStart: now,
          currentPeriodEnd: paidUntil,
          cancelledAt: null,
          cancelReason: null,
          ...(wasUnpaid && {
            planId: plan.id,
            priceInCents: plan.priceInCents,
            currency: plan.currency,
            billingCycle: plan.billingCycle,
            graceEndsAt: null,
            trialEndsAt: null,
          }),
        };
      }
      const updated = await this.subscriptionRepo.transitionStatus(existing.id, existing.status, SubscriptionStatus.ACTIVE, extra, tx);
      if (!updated) throw new ConflictException('The subscription changed while paying — refresh Billing and try again');

      await this.subscriptionRepo.recordEvent(
        {
          orgId,
          subscriptionId: existing.id,
          previousStatus: existing.status,
          newStatus: SubscriptionStatus.ACTIVE,
          previousPlanId: existing.planId !== plan.id ? existing.planId : undefined,
          newPlanId: existing.planId !== plan.id ? plan.id : undefined,
          triggeredById: userId,
          reason: prepay ? 'Next period paid in advance' : 'Renewed by payment',
          metadata: {
            type: prepay ? 'renewal_prepaid' : 'renewal',
            razorpayPaymentId: input.razorpayPaymentId,
            orderId: input.orderId,
            paidFrom: paidFrom.toISOString(),
            paidUntil: paidUntil.toISOString(),
            ...(prepay && { prepaidPeriods }),
          },
        },
        tx,
      );
      return { updated, paidUntil, prepaidPeriods };
    });
    const { paidUntil } = renewed;

    if (prepay) {
      // The period itself moves (and usage resets) when the billing-cycle worker reaches its end
      await this.auditService.log({
        orgId,
        userId,
        action: AuditAction.SUBSCRIPTION_RENEWED,
        targetType: 'Subscription',
        targetId: existing.id,
        metadata: { prepaid: true, prepaidPeriods: renewed.prepaidPeriods, paidUntil: paidUntil.toISOString() },
        source: 'api',
      });
      this.logger.log(`Subscription ${existing.id}: next period prepaid (until ${paidUntil.toISOString()})`);
      return {
        subscription: renewed.updated,
        type: 'renewal',
        prepaid: true,
        prepaidPeriods: renewed.prepaidPeriods,
        deduplicated: false,
      };
    }

    await this.usageRepo.resetUsageForOrg(orgId, now, paidUntil, {
      [UsageMetricType.MESSAGES_SENT]: plan.maxMessagesPerMonth,
      [UsageMetricType.ACTIVE_USERS]: plan.maxUsers,
      [UsageMetricType.WHATSAPP_SESSIONS]: plan.maxWhatsappSessions,
      [UsageMetricType.CAMPAIGN_EXECUTIONS]: plan.maxCampaignsPerMonth,
      [UsageMetricType.API_CALLS]: plan.maxApiCallsPerMonth,
      [UsageMetricType.AI_CREDITS]: plan.aiCreditsPerMonth,
      [UsageMetricType.MESSAGE_TEMPLATES]: plan.maxMessageTemplates,
    });

    if (wasUnpaid && existing.trialEndsAt) {
      // A trial that ran into grace is now paid for
      this.events.emit(EVENT_NAMES.SUBSCRIPTION_TRIAL_CONVERTED, { orgId, subscriptionId: existing.id, planId: plan.id });
    } else {
      this.events.emit(EVENT_NAMES.SUBSCRIPTION_RENEWED, {
        subscriptionId: existing.id,
        orgId,
        planId: plan.id,
        newPeriodStart: now.toISOString(),
        newPeriodEnd: paidUntil.toISOString(),
      });
    }

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SUBSCRIPTION_RENEWED,
      targetType: 'Subscription',
      targetId: existing.id,
      metadata: { previousStatus: existing.status, newPeriodEnd: paidUntil.toISOString() },
      source: 'api',
    });

    this.logger.log(`Subscription ${existing.id} renewed by payment until ${paidUntil.toISOString()}`);
    return { subscription: renewed.updated, type: 'renewal', prepaid: false, deduplicated: false };
  }
}
