import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface PaymentResult {
  success: boolean;
  externalPaymentId?: string;
  error?: string;
  retryable: boolean;
}

export interface CreateCustomerParams {
  orgId: string;
  email: string;
  name: string;
  paymentMethodToken: string;
}

@Injectable()
export class StripePaymentService {
  private readonly logger = new Logger(StripePaymentService.name);
  private _stripe: Stripe | null = null;

  constructor(private readonly configService: ConfigService) {}

  private get stripe(): Stripe {
    if (!this._stripe) {
      const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
      if (!apiKey) {
        throw new Error(
          'STRIPE_SECRET_KEY is not configured. Set it in your environment variables to use Stripe payments.',
        );
      }
      this._stripe = new Stripe(apiKey, {
        apiVersion: '2026-03-25.dahlia',
      });
    }
    return this._stripe;
  }

  /**
   * Charge a payment using a stored payment method.
   */
  async chargePayment(
    amountInCents: number,
    currency: string,
    customerId: string,
    paymentMethodId: string,
    idempotencyKey: string,
    description?: string,
  ): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: currency.toLowerCase(),
          customer: customerId,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          description: description || 'Wazelo CRM subscription payment',
        },
        { idempotencyKey },
      );

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          externalPaymentId: paymentIntent.id,
          retryable: false,
        };
      }

      return {
        success: false,
        externalPaymentId: paymentIntent.id,
        error: `Payment intent status: ${paymentIntent.status}`,
        retryable: paymentIntent.status === 'requires_action',
      };
    } catch (error: any) {
      const stripeError = error as Stripe.errors.StripeError;
      const retryable = [
        'rate_limit',
        'api_connection_error',
        'api_error',
      ].includes(stripeError.type || '');

      this.logger.error(
        `Stripe charge failed: ${stripeError.message}`,
        error.stack,
      );

      return {
        success: false,
        error: stripeError.message,
        retryable,
      };
    }
  }

  /**
   * Create a Stripe customer and attach a payment method.
   */
  async createCustomer(params: CreateCustomerParams): Promise<string> {
    const customer = await this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: { orgId: params.orgId },
      payment_method: params.paymentMethodToken,
      invoice_settings: {
        default_payment_method: params.paymentMethodToken,
      },
    });

    return customer.id;
  }

  /**
   * Cancel a Stripe subscription.
   */
  async cancelSubscription(externalSubscriptionId: string): Promise<void> {
    try {
      await this.stripe.subscriptions.cancel(externalSubscriptionId);
    } catch (error: any) {
      this.logger.warn(
        `Failed to cancel Stripe subscription ${externalSubscriptionId}: ${error.message}`,
      );
    }
  }

  /**
   * Verify a webhook signature from Stripe.
   */
  verifyWebhookSignature(
    payload: Buffer,
    signature: string,
  ): Stripe.Event {
    const endpointSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
      '',
    );
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      endpointSecret,
    );
  }
}
