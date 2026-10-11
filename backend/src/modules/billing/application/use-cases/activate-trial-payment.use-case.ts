import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, Subscription, SubscriptionStatus, UsageMetricType } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { UsageRepository } from '../../infrastructure/repositories/usage.repository';
import { CheckoutCoupon, CouponCheckoutService } from '../services/coupon-checkout.service';
import { couponLine } from '../../domain/services/coupons';

export interface ActivateTrialPaymentInput {
  planId: string;
  /** Absent only when a coupon covers the full price (nothing to pay) */
  orderId?: string;
  razorpayPaymentId?: string;
  idempotencyKey?: string;
  /** Coupon priced into the paid order (from the order notes) */
  coupon: CheckoutCoupon | null;
}

/**
 * TRIAL → ACTIVE on a verified Razorpay payment (the org's first payment). The status
 * change, payment, invoice and coupon redemption are one transaction.
 */
@Injectable()
export class ActivateTrialPaymentUseCase {
  constructor(
    private readonly planRepo: PlanRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly usageRepo: UsageRepository,
    private readonly couponCheckout: CouponCheckoutService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(orgId: string, userId: string, existing: Subscription, input: ActivateTrialPaymentInput) {
    const plan = await this.planRepo.findById(input.planId);
    if (!plan) throw new NotFoundException('Plan not found');

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (plan.billingCycle === 'YEARLY' ? 12 : 1));
    const coupon = input.coupon;
    const discountInCents = Math.min(coupon?.discountInCents ?? 0, plan.priceInCents);
    const amountPaid = plan.priceInCents - discountInCents;
    if (!input.razorpayPaymentId && amountPaid > 0) {
      throw new BadRequestException('Payment is required: apply the coupon at checkout');
    }

    const activated = await this.prisma.$transaction(async (tx) => {
      const result = await this.subscriptionRepo.transitionStatus(
        existing.id,
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.ACTIVE,
        {
          planId: plan.id,
          priceInCents: plan.priceInCents,
          trialEndsAt: null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        tx,
      );

      await this.subscriptionRepo.recordEvent(
        {
          orgId,
          subscriptionId: existing.id,
          previousStatus: SubscriptionStatus.TRIAL,
          newStatus: SubscriptionStatus.ACTIVE,
          triggeredById: userId,
          metadata: {
            planName: plan.name,
            razorpayPaymentId: input.razorpayPaymentId,
            orderId: input.orderId,
            ...(coupon && { couponCode: coupon.code, discountInCents }),
          },
        },
        tx,
      );

      // Record payment in history (none when a coupon covered the full price)
      let paymentId: string | undefined;
      if (input.razorpayPaymentId) {
        const payment = await this.paymentRepo.createPayment(
          {
            orgId,
            subscriptionId: existing.id,
            amountInCents: amountPaid,
            currency: plan.currency,
            externalId: input.razorpayPaymentId,
            paymentMethod: 'razorpay',
            idempotencyKey: input.idempotencyKey || `rzp-${input.razorpayPaymentId}`,
          },
          tx,
        );
        await this.paymentRepo.transitionPaymentStatus(payment.id, PaymentStatus.PENDING, PaymentStatus.SUCCEEDED, undefined, tx);
        paymentId = payment.id;
      }

      // Create invoice and mark as PAID immediately
      const invoiceNumber = await this.paymentRepo.getNextInvoiceNumber(tx);
      const invoice = await this.paymentRepo.createInvoice(
        {
          orgId,
          subscriptionId: existing.id,
          paymentId,
          invoiceNumber,
          amountInCents: amountPaid,
          currency: plan.currency,
          periodStart: now,
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
          subscriptionId: existing.id,
          invoiceId: invoice.id,
          discountInCents,
          currency: plan.currency,
        });
      }
      return result;
    });

    // Reset usage counters to full plan limits (trial limits no longer apply)
    await this.usageRepo.resetUsageForOrg(orgId, now, periodEnd, {
      [UsageMetricType.MESSAGES_SENT]: plan.maxMessagesPerMonth,
      [UsageMetricType.ACTIVE_USERS]: plan.maxUsers,
      [UsageMetricType.WHATSAPP_SESSIONS]: plan.maxWhatsappSessions,
      [UsageMetricType.CAMPAIGN_EXECUTIONS]: plan.maxCampaignsPerMonth,
      [UsageMetricType.API_CALLS]: plan.maxApiCallsPerMonth,
      [UsageMetricType.AI_CREDITS]: plan.aiCreditsPerMonth,
      [UsageMetricType.MESSAGE_TEMPLATES]: plan.maxMessageTemplates,
    });

    return { subscription: activated, deduplicated: false };
  }
}
