import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { UsageRepository } from '../../infrastructure/repositories/usage.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { SubscribeDto } from '../dto/subscribe.dto';
import { EVENT_NAMES } from '@/common/constants';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { CheckoutCoupon, CouponCheckoutService } from '../services/coupon-checkout.service';
import { couponLine } from '../../domain/services/coupons';
import { ActivateTrialPaymentUseCase } from './activate-trial-payment.use-case';
import {
  AuditAction,
  InvoiceStatus,
  SubscriptionStatus,
  UsageMetricType,
} from '@prisma/client';

@Injectable()
export class SubscribeUseCase {
  private readonly logger = new Logger(SubscribeUseCase.name);

  constructor(
    private readonly planRepo: PlanRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly usageRepo: UsageRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly couponCheckout: CouponCheckoutService,
    private readonly activateTrialPayment: ActivateTrialPaymentUseCase,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    /**
     * `checkoutCoupon`: a coupon already priced into a paid gateway order (verify-payment).
     * `couponCode`: tenant-entered; without a payment it only works when it covers the full price.
     */
    dto: SubscribeDto & { razorpayPaymentId?: string; checkoutCoupon?: CheckoutCoupon | null },
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.subscriptionRepo.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        return { subscription: existing, deduplicated: true };
      }
    }

    // 2. Check no active subscription exists
    const activeSubscription = await this.subscriptionRepo.findActiveByOrg(orgId);
    // 2b. A trial converting to a paid plan with a coupon that covers the full price: nothing
    //     to pay, so there is no checkout — activate the trial here
    if (
      activeSubscription?.status === SubscriptionStatus.TRIAL &&
      dto.couponCode?.trim() &&
      !dto.razorpayPaymentId
    ) {
      const trialPlan = await this.planRepo.findById(dto.planId);
      if (!trialPlan || !trialPlan.isActive || trialPlan.deletedAt) {
        throw new NotFoundException('Plan not found or is no longer available');
      }
      const quote = await this.couponCheckout.quote(orgId, dto.couponCode, trialPlan);
      if (!quote.ok) throw new BadRequestException(quote.message);
      if (quote.finalAmountInCents > 0) throw new BadRequestException('Payment is required: apply the coupon at checkout');
      return this.activateTrialPayment.execute(orgId, userId, activeSubscription, {
        planId: trialPlan.id,
        idempotencyKey: dto.idempotencyKey,
        coupon: { couponId: quote.coupon.id, code: quote.code, discountInCents: quote.discountInCents },
      });
    }

    if (activeSubscription) {
      throw new ConflictException(
        'Organization already has an active subscription. Use upgrade/downgrade instead.',
      );
    }

    // 3. Validate plan exists and is active
    const plan = await this.planRepo.findById(dto.planId);
    if (!plan || !plan.isActive || plan.deletedAt) {
      throw new NotFoundException('Plan not found or is no longer available');
    }

    // 3b. One-trial-per-org enforcement
    if (plan.trialDays > 0) {
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { trialUsedAt: true },
      });
      if (org?.trialUsedAt) {
        throw new ConflictException(
          'Your organization has already used its free trial. Please choose a paid plan.',
        );
      }
    }

    // 3c. Coupon (first payment only)
    const hasTrialPlan = plan.trialDays > 0;
    const isFreePlan = plan.priceInCents === 0;
    let coupon: CheckoutCoupon | null = dto.checkoutCoupon ?? null;
    if (!coupon && dto.couponCode?.trim()) {
      if (isFreePlan) throw new BadRequestException('Coupons do not apply to free plans');
      if (hasTrialPlan) {
        throw new BadRequestException('Coupons apply to the first payment: use it at checkout when the trial ends');
      }
      const quote = await this.couponCheckout.quote(orgId, dto.couponCode, plan);
      if (!quote.ok) throw new BadRequestException(quote.message);
      if (quote.finalAmountInCents > 0 && !dto.razorpayPaymentId) {
        throw new BadRequestException('Payment is required: apply the coupon at checkout');
      }
      coupon = { couponId: quote.coupon.id, code: quote.code, discountInCents: quote.discountInCents };
    }
    const discountInCents = Math.min(coupon?.discountInCents ?? 0, plan.priceInCents);
    const coveredByCoupon = coupon !== null && discountInCents >= plan.priceInCents;

    // 4. Calculate period dates
    const now = new Date();
    const periodStart = now;
    const periodEnd = this.calculatePeriodEnd(now, plan.billingCycle);

    // 5. Determine initial status
    // Trial takes precedence — even a free plan with trialDays > 0 starts as TRIAL
    const hasTrial = plan.trialDays > 0;
    const isFree = plan.priceInCents === 0;
    let initialStatus: SubscriptionStatus;
    let trialEndsAt: Date | undefined;

    if (hasTrial) {
      initialStatus = SubscriptionStatus.TRIAL;
      trialEndsAt = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);
    } else if (isFree) {
      initialStatus = SubscriptionStatus.ACTIVE;
    } else {
      // Paid plan without trial — payment must be pre-verified via Razorpay
      // (unless a coupon covers the full price)
      if (!dto.razorpayPaymentId && !coveredByCoupon) {
        throw new BadRequestException(
          'Payment is required for paid plans without a trial period. Complete checkout first.',
        );
      }
      initialStatus = SubscriptionStatus.ACTIVE;
    }

    // 6. Create subscription, its first payment + invoice, and the coupon redemption in ONE
    //    transaction: if the coupon's atomic claim fails (limit reached / already used by
    //    this org) nothing is created
    const isPaidStart = initialStatus === SubscriptionStatus.ACTIVE && !hasTrial && !isFree;
    const amountDue = plan.priceInCents - discountInCents;
    const subscription = await this.prisma.$transaction(async (tx) => {
      const created = await this.subscriptionRepo.create(
        {
          orgId,
          planId: plan.id,
          status: initialStatus,
          billingCycle: plan.billingCycle,
          priceInCents: plan.priceInCents,
          currency: plan.currency,
          trialEndsAt,
          currentPeriodStart: periodStart,
          currentPeriodEnd: hasTrial && trialEndsAt ? trialEndsAt : periodEnd,
          idempotencyKey: dto.idempotencyKey,
        },
        tx,
      );

      // 6b. Record payment + invoice for paid plans (now we have the subscription ID)
      if (isPaidStart && (dto.razorpayPaymentId || coveredByCoupon)) {
        let paymentId: string | undefined;
        if (dto.razorpayPaymentId) {
          const payment = await this.paymentRepo.createPayment(
            {
              orgId,
              subscriptionId: created.id,
              amountInCents: amountDue,
              currency: plan.currency,
              externalId: dto.razorpayPaymentId,
              paymentMethod: 'razorpay',
              idempotencyKey: `subscribe-${dto.idempotencyKey || `${orgId}-${dto.planId}-${Date.now()}`}`,
            },
            tx,
          );
          await this.paymentRepo.transitionPaymentStatus(payment.id, 'PENDING', 'SUCCEEDED', undefined, tx);
          paymentId = payment.id;
        }

        const invoiceNumber = await this.paymentRepo.getNextInvoiceNumber(tx);
        const invoice = await this.paymentRepo.createInvoice(
          {
            orgId,
            subscriptionId: created.id,
            paymentId,
            invoiceNumber,
            amountInCents: amountDue,
            currency: plan.currency,
            periodStart,
            periodEnd,
            lineItems: [
              { description: `${plan.name} — ${plan.billingCycle}`, amount: plan.priceInCents, currency: plan.currency },
              ...(coupon ? [{ ...couponLine(coupon.code, discountInCents), currency: plan.currency }] : []),
            ],
            dueDate: now,
            ...(coupon && { metadata: { couponId: coupon.couponId, couponCode: coupon.code, discountInCents } }),
          },
          tx,
        );
        await this.paymentRepo.transitionInvoiceStatus(invoice.id, InvoiceStatus.DRAFT, InvoiceStatus.PAID, { paidAt: now }, tx);

        if (coupon) {
          await this.couponCheckout.redeem(tx, {
            couponId: coupon.couponId,
            orgId,
            subscriptionId: created.id,
            invoiceId: invoice.id,
            discountInCents,
            currency: plan.currency,
          });
        }
      }
      return created;
    });

    // 6c. Mark trial as used for this org (one trial per org lifetime)
    if (initialStatus === SubscriptionStatus.TRIAL) {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { trialUsedAt: now },
      });
    }

    // 7. Initialize usage counters for the period
    // During TRIAL, use lower trial-specific limits if defined on the plan
    const isTrial = initialStatus === SubscriptionStatus.TRIAL;

    const limits: Record<UsageMetricType, number> = {
      [UsageMetricType.MESSAGES_SENT]: isTrial && plan.trialMaxMessagesPerMonth != null
        ? plan.trialMaxMessagesPerMonth : plan.maxMessagesPerMonth,
      [UsageMetricType.ACTIVE_USERS]: isTrial && plan.trialMaxUsers != null
        ? plan.trialMaxUsers : plan.maxUsers,
      [UsageMetricType.WHATSAPP_SESSIONS]: isTrial && plan.trialMaxWhatsappSessions != null
        ? plan.trialMaxWhatsappSessions : plan.maxWhatsappSessions,
      [UsageMetricType.CAMPAIGN_EXECUTIONS]: isTrial && plan.trialMaxCampaignsPerMonth != null
        ? plan.trialMaxCampaignsPerMonth : plan.maxCampaignsPerMonth,
      // No trial-specific API limit exists on Plan
      [UsageMetricType.API_CALLS]: plan.maxApiCallsPerMonth,
      [UsageMetricType.AI_CREDITS]: plan.aiCreditsPerMonth,
      [UsageMetricType.MESSAGE_TEMPLATES]: plan.maxMessageTemplates,
    };

    await this.usageRepo.resetUsageForOrg(
      orgId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
      limits,
    );

    // 8. Record subscription event
    await this.subscriptionRepo.recordEvent({
      orgId,
      subscriptionId: subscription.id,
      newStatus: initialStatus,
      triggeredById: userId,
      metadata: {
        planName: plan.name,
        planSlug: plan.slug,
        priceInCents: plan.priceInCents,
        billingCycle: plan.billingCycle,
      },
    });

    // 9. Emit event
    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_CREATED, {
      subscriptionId: subscription.id,
      orgId,
      planId: plan.id,
      planName: plan.name,
      status: initialStatus,
      userId,
    });

    // 10. Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SUBSCRIPTION_CREATED,
      targetType: 'Subscription',
      targetId: subscription.id,
      metadata: {
        planId: plan.id,
        planName: plan.name,
        status: initialStatus,
        priceInCents: plan.priceInCents,
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `Subscription ${subscription.id} created for org ${orgId} on plan ${plan.name} (${initialStatus})`,
    );

    return { subscription, deduplicated: false };
  }

  private calculatePeriodEnd(start: Date, billingCycle: string): Date {
    const end = new Date(start);
    if (billingCycle === 'YEARLY') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }
}
