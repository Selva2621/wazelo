import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { RazorpayPaymentService } from '../../domain/services/razorpay-payment.service';
import { canPurchasePlan } from '../../domain/services/plan-availability';
import { CheckoutCoupon, CouponCheckoutService } from '../services/coupon-checkout.service';

/**
 * Step 1 of the Razorpay checkout: creates the order. With a coupon, the order is priced
 * at the discounted amount and the coupon is written into the order notes — the notes
 * (set by us, read back from Razorpay) are what verify-payment trusts, never the client.
 */
@Injectable()
export class CreateCheckoutOrderUseCase {
  constructor(
    private readonly planRepo: PlanRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly razorpayPayment: RazorpayPaymentService,
    private readonly couponCheckout: CouponCheckoutService,
  ) {}

  async execute(orgId: string, input: { planId: string; couponCode?: string }) {
    const plan = await this.planRepo.findById(input.planId);
    const live = await this.subscriptionRepo.findActiveByOrg(orgId);
    // An org renewing the plan it is already on may pay for it even once it's off sale (archived)
    const current = plan && !plan.isActive ? live : null;
    if (!plan || !canPurchasePlan(plan, current?.planId)) {
      throw new NotFoundException('Plan not found or is no longer available');
    }
    if (plan.priceInCents === 0) {
      throw new BadRequestException('Free plans do not require a payment order');
    }

    let discountInCents = 0;
    const couponNotes: Record<string, string> = {};
    if (input.couponCode?.trim()) {
      // First payment only: a new subscription or a trial converting to paid
      if (live && live.status !== SubscriptionStatus.TRIAL) {
        throw new BadRequestException('Coupons apply to a first payment only');
      }
      const quote = await this.couponCheckout.quote(orgId, input.couponCode, plan);
      if (!quote.ok) throw new BadRequestException(quote.message);
      if (quote.finalAmountInCents === 0) {
        throw new BadRequestException(
          'This coupon covers the full price, so no payment is needed. Subscribe with the coupon instead.',
        );
      }
      discountInCents = quote.discountInCents;
      couponNotes.couponId = quote.coupon.id;
      couponNotes.couponCode = quote.code;
      couponNotes.discountInCents = String(discountInCents);
    }

    const amount = plan.priceInCents - discountInCents;
    // Razorpay receipt must be ≤ 40 chars
    const receiptId = `sub-${orgId.slice(0, 8)}-${Date.now().toString(36)}`;
    const order = await this.razorpayPayment.createOrder(amount, plan.currency, receiptId, {
      orgId,
      planId: plan.id,
      ...couponNotes,
    });

    return {
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      planName: plan.name,
      originalAmount: plan.priceInCents,
      discountInCents,
    };
  }
}

/**
 * At verify time: reads the order back from Razorpay and checks it belongs to this org and
 * plan and was priced at plan price − coupon discount. Returns the coupon priced into it.
 */
@Injectable()
export class ResolveCheckoutOrderUseCase {
  private readonly logger = new Logger(ResolveCheckoutOrderUseCase.name);

  constructor(
    private readonly planRepo: PlanRepository,
    private readonly razorpayPayment: RazorpayPaymentService,
  ) {}

  async execute(orgId: string, orderId: string, planId: string): Promise<{ coupon: CheckoutCoupon | null }> {
    let order: Awaited<ReturnType<RazorpayPaymentService['fetchOrder']>>;
    try {
      order = await this.razorpayPayment.fetchOrder(orderId);
    } catch (err) {
      this.logger.error(`Could not fetch Razorpay order ${orderId}: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Could not confirm the order with the payment gateway. Please retry.');
    }
    const notes = order.notes ?? {};
    if ((notes.orgId && notes.orgId !== orgId) || (notes.planId && notes.planId !== planId)) {
      throw new BadRequestException('This payment order does not match the selected plan');
    }

    const discount = notes.couponId ? parseInt(notes.discountInCents ?? '', 10) : 0;
    const coupon: CheckoutCoupon | null =
      notes.couponId && Number.isInteger(discount) && discount > 0
        ? { couponId: notes.couponId, code: notes.couponCode ?? '', discountInCents: discount }
        : null;

    const plan = await this.planRepo.findById(planId);
    if (!plan) throw new NotFoundException('Plan not found');
    const expected = plan.priceInCents - (coupon?.discountInCents ?? 0);
    if (order.amount !== expected || order.currency.toUpperCase() !== plan.currency.toUpperCase()) {
      throw new BadRequestException('This payment order does not match the selected plan');
    }
    return { coupon };
  }
}
