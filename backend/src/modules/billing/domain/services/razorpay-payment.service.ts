import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');
import { createHmac } from 'crypto';
import type { PaymentResult } from './stripe-payment.service';

@Injectable()
export class RazorpayPaymentService {
  private readonly logger = new Logger(RazorpayPaymentService.name);
  private _razorpay: InstanceType<typeof Razorpay> | null = null;

  constructor(private readonly configService: ConfigService) {}

  private get razorpay(): InstanceType<typeof Razorpay> {
    if (!this._razorpay) {
      const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
      const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
      if (!keyId || !keySecret) {
        throw new Error(
          'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured. Set them in your environment variables to use Razorpay payments.',
        );
      }
      this.logger.log(`Initializing Razorpay with key_id: ${keyId.slice(0, 12)}...`);
      this._razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return this._razorpay;
  }

  private get webhookSecret(): string {
    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) {
      throw new Error(
        'RAZORPAY_WEBHOOK_SECRET is not configured. Set it in your environment variables to verify Razorpay webhooks.',
      );
    }
    return secret;
  }

  /**
   * Create a Razorpay order for payment collection.
   * In Razorpay's flow: create order → client pays → webhook confirms.
   */
  async createOrder(
    amountInPaise: number,
    currency: string,
    receiptId: string,
    notes?: Record<string, string>,
  ): Promise<{ orderId: string; amount: number; currency: string }> {
    try {
      const order = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: currency.toUpperCase(),
        receipt: receiptId,
        notes: notes || {},
      });

      return {
        orderId: order.id,
        amount: order.amount as number,
        currency: order.currency,
      };
    } catch (error: any) {
      this.logger.error(
        `Razorpay order creation failed: ${error.message ?? JSON.stringify(error)}`,
        error.stack,
      );
      throw new Error(
        error.error?.description || error.message || JSON.stringify(error),
      );
    }
  }

  /**
   * Capture an authorized payment (for manual capture flow).
   */
  async capturePayment(
    paymentId: string,
    amountInPaise: number,
    currency: string,
  ): Promise<PaymentResult> {
    try {
      const payment = await this.razorpay.payments.capture(
        paymentId,
        amountInPaise,
        currency.toUpperCase(),
      );

      return {
        success: payment.status === 'captured',
        externalPaymentId: payment.id,
        retryable: false,
      };
    } catch (error: any) {
      const retryable = error.statusCode === 429 || error.statusCode >= 500;
      this.logger.error(`Razorpay capture failed: ${error.message}`, error.stack);

      return {
        success: false,
        error: error.error?.description || error.message,
        retryable,
      };
    }
  }

  /**
   * Fetch payment details from Razorpay.
   */
  async fetchPayment(paymentId: string) {
    return this.razorpay.payments.fetch(paymentId);
  }

  /**
   * Create a Razorpay subscription for recurring billing.
   */
  async createSubscription(
    planId: string,
    totalCount: number,
    customerId?: string,
    notes?: Record<string, string>,
  ): Promise<{ subscriptionId: string; shortUrl: string }> {
    try {
      const subscription = await this.razorpay.subscriptions.create({
        plan_id: planId,
        total_count: totalCount,
        ...(customerId && { customer_id: customerId }),
        notes: notes || {},
      });

      return {
        subscriptionId: subscription.id,
        shortUrl: (subscription as any).short_url || '',
      };
    } catch (error: any) {
      this.logger.error(`Razorpay subscription creation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cancel a Razorpay subscription.
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtCycleEnd: boolean = false,
  ): Promise<void> {
    try {
      await this.razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
    } catch (error: any) {
      this.logger.warn(
        `Failed to cancel Razorpay subscription ${subscriptionId}: ${error.message}`,
      );
    }
  }

  /**
   * Create a Razorpay customer.
   */
  async createCustomer(
    name: string,
    email: string,
    contact?: string,
    notes?: Record<string, string>,
  ): Promise<string> {
    const customer = await this.razorpay.customers.create({
      name,
      email,
      contact: contact || undefined,
      notes: notes || {},
    });

    return customer.id;
  }

  /**
   * Verify Razorpay webhook signature.
   */
  verifyWebhookSignature(
    body: string,
    signature: string,
  ): boolean {
    const expectedSignature = createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }

  /**
   * Verify payment signature (after client-side checkout).
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      throw new Error(
        'RAZORPAY_KEY_SECRET is not configured. Cannot verify payment signature.',
      );
    }
    const expectedSignature = createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return expectedSignature === signature;
  }
}
