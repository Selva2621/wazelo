import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';
import { OrgLocaleService } from '@/modules/org/domain/services/org-locale.service';
import { billingCurrencyFor } from '@/shared/constants/billing-currencies';
import { PlatformSettingsService } from '@/modules/platform-settings/domain/services/platform-settings.service';
import { AiCreditRepository } from '../../infrastructure/repositories/ai-credit.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { RazorpayPaymentService } from '../../domain/services/razorpay-payment.service';
import { AiCreditsService } from '../../domain/services/ai-credits.service';
import { AI_ACTIONS, AiAction, costOf } from '../../domain/services/ai-actions';

/** Razorpay order notes `type` for an AI credit pack (vs. a plan checkout) */
export const AI_CREDITS_ORDER_TYPE = 'ai_credits';

const purchaseKey = (orderId: string) => `rzp-aic-${orderId}`;

/** INR for India, USD elsewhere; a paying org stays in the currency it pays in. */
async function billingCurrency(
  orgId: string,
  subscriptionRepo: SubscriptionRepository,
  orgLocale: OrgLocaleService,
): Promise<string> {
  const subscription = await subscriptionRepo.findActiveByOrg(orgId);
  if (subscription && subscription.priceInCents > 0) return subscription.currency.toUpperCase();
  return billingCurrencyFor((await orgLocale.get(orgId)).country);
}

/** GET /billing/ai-credits — balance, packs for sale in the org's currency, and what each action costs. */
@Injectable()
export class GetAiCreditsUseCase {
  constructor(
    private readonly aiCredits: AiCreditsService,
    private readonly repo: AiCreditRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly orgLocale: OrgLocaleService,
    private readonly settings: PlatformSettingsService,
  ) {}

  async execute(orgId: string) {
    const currency = await billingCurrency(orgId, this.subscriptionRepo, this.orgLocale);
    const [wallet, packs, settings] = await Promise.all([
      this.aiCredits.getWallet(orgId),
      this.repo.listPacks({ currency, activeOnly: true }),
      this.settings.get(),
    ]);
    const costs = (Object.keys(AI_ACTIONS) as AiAction[])
      .map((action) => ({ action, label: AI_ACTIONS[action].label, cost: costOf(action, settings.ai.actionCosts) }))
      .filter((c) => c.cost > 0);
    return {
      wallet,
      currency,
      packs: packs.map((p) => ({ id: p.id, name: p.name, credits: p.credits, priceInCents: p.priceInCents, currency: p.currency })),
      costs,
    };
  }
}

/** GET /billing/ai-credits/history */
@Injectable()
export class ListAiCreditHistoryUseCase {
  constructor(private readonly repo: AiCreditRepository) {}

  async execute(orgId: string, page: number, limit: number) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const { entries, total } = await this.repo.listEntries(orgId, take, skip);
    return {
      entries: entries.map((e) => ({
        id: e.id,
        kind: e.kind,
        action: e.action,
        label: e.action && e.action in AI_ACTIONS ? AI_ACTIONS[e.action as AiAction].label : null,
        planCredits: e.planCredits,
        purchasedCredits: e.purchasedCredits,
        createdAt: e.createdAt,
      })),
      total,
      page: Math.max(page, 1),
      limit: take,
    };
  }
}

/** POST /billing/ai-credits/orders — a Razorpay order for one pack, priced by the server. */
@Injectable()
export class CreateAiCreditOrderUseCase {
  constructor(
    private readonly repo: AiCreditRepository,
    private readonly razorpay: RazorpayPaymentService,
  ) {}

  async execute(orgId: string, packId: string) {
    const pack = await this.repo.findPack(packId);
    if (!pack || !pack.isActive) throw new NotFoundException('Credit pack not found or no longer on sale');

    // Razorpay receipt must be ≤ 40 chars
    const receipt = `aic-${orgId.slice(0, 8)}-${Date.now().toString(36)}`;
    const order = await this.razorpay.createOrder(pack.priceInCents, pack.currency, receipt, {
      type: AI_CREDITS_ORDER_TYPE,
      orgId,
      packId: pack.id,
      // What was sold, fixed at order time: a later price/size edit must not change it
      credits: String(pack.credits),
    });
    return { orderId: order.orderId, amount: order.amount, currency: order.currency, packName: pack.name, credits: pack.credits };
  }
}

/**
 * Credits a paid pack order to the org. Called from verify-payment and from the
 * Razorpay webhook; whichever lands first credits it, the other is a no-op.
 */
@Injectable()
export class FulfillAiCreditOrderUseCase {
  private readonly logger = new Logger(FulfillAiCreditOrderUseCase.name);

  constructor(
    private readonly repo: AiCreditRepository,
    private readonly razorpay: RazorpayPaymentService,
    private readonly paymentRepo: PaymentRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly aiCredits: AiCreditsService,
  ) {}

  /** @param orgId the caller's org; omitted by the webhook, which trusts the order notes */
  async execute(input: { orderId: string; razorpayPaymentId: string; orgId?: string }) {
    let order: Awaited<ReturnType<RazorpayPaymentService['fetchOrder']>>;
    try {
      order = await this.razorpay.fetchOrder(input.orderId);
    } catch (err) {
      this.logger.error(`Could not fetch Razorpay order ${input.orderId}: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Could not confirm the order with the payment gateway. Please retry.');
    }

    const notes = order.notes ?? {};
    const credits = parseInt(notes.credits ?? '', 10);
    if (notes.type !== AI_CREDITS_ORDER_TYPE || !notes.orgId || !notes.packId || !Number.isInteger(credits) || credits <= 0) {
      throw new BadRequestException('This payment order is not an AI credit purchase');
    }
    if (input.orgId && notes.orgId !== input.orgId) {
      throw new BadRequestException('This payment order belongs to another workspace');
    }
    const orgId = notes.orgId;

    const credited = await this.repo.addPurchase({
      orgId,
      credits,
      packId: notes.packId,
      paymentId: null,
      idempotencyKey: purchaseKey(order.id),
    });

    if (credited) {
      try {
        const paymentId = await this.recordPayment(orgId, order, input.razorpayPaymentId, credits);
        // Links the purchase to its payment (pack revenue is summed from it)
        await this.repo.linkPayment(purchaseKey(order.id), paymentId);
      } catch (err) {
        // Credits are in; a missing invoice row is fixable, a double credit is not
        this.logger.error(`AI credit order ${order.id}: payment/invoice not recorded: ${(err as Error).message}`);
      }
      this.logger.log(`AI credits: +${credits} for org ${orgId} (order ${order.id})`);
    }

    return { credited, credits, wallet: await this.aiCredits.getWallet(orgId) };
  }

  private async recordPayment(
    orgId: string,
    order: { id: string; amount: number; currency: string },
    razorpayPaymentId: string,
    credits: number,
  ): Promise<string> {
    const subscription = await this.subscriptionRepo.findActiveByOrg(orgId);
    const now = new Date();
    const payment = await this.paymentRepo.createPayment({
      orgId,
      subscriptionId: subscription?.id ?? null,
      amountInCents: order.amount,
      currency: order.currency,
      externalId: razorpayPaymentId,
      paymentMethod: 'razorpay',
      idempotencyKey: purchaseKey(order.id),
    });
    await this.paymentRepo.transitionPaymentStatus(payment.id, PaymentStatus.PENDING, PaymentStatus.SUCCEEDED);
    await this.paymentRepo.createInvoice({
      orgId,
      subscriptionId: subscription?.id ?? null,
      paymentId: payment.id,
      invoiceNumber: await this.paymentRepo.getNextInvoiceNumber(),
      amountInCents: order.amount,
      currency: order.currency,
      periodStart: now,
      periodEnd: now,
      lineItems: [{ description: `AI credits — ${credits.toLocaleString('en-US')}`, amount: order.amount, currency: order.currency }],
      dueDate: now,
      status: InvoiceStatus.PAID,
      paidAt: now,
      metadata: { type: AI_CREDITS_ORDER_TYPE, orderId: order.id },
    });
    return payment.id;
  }
}
