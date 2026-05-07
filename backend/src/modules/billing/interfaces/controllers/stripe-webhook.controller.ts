import {
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Public } from '@/common/decorators/public.decorator';
import { StripePaymentService } from '../../domain/services/stripe-payment.service';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { EVENT_NAMES } from '@/common/constants';
import { SubscriptionStatus } from '@prisma/client';

@Controller('webhooks/stripe')
@Public()
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripePayment: StripePaymentService,
    private readonly paymentRepo: PaymentRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = req.rawBody;

    if (!rawBody || !signature) {
      return { received: false, error: 'Missing body or signature' };
    }

    let event;
    try {
      event = this.stripePayment.verifyWebhookSignature(rawBody, signature);
    } catch (error: any) {
      this.logger.warn(`Invalid Stripe webhook signature: ${error.message}`);
      return { received: false, error: 'Invalid signature' };
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        const payment = await this.paymentRepo.findPaymentByExternalId(
          paymentIntent.id,
        );
        if (payment) {
          await this.paymentRepo.transitionPaymentStatus(
            payment.id,
            payment.status,
            'SUCCEEDED',
          );
          this.eventEmitter.emit(EVENT_NAMES.PAYMENT_SUCCEEDED, {
            paymentId: payment.id,
            orgId: payment.orgId,
            subscriptionId: payment.subscriptionId,
            amountInCents: payment.amountInCents,
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        const payment = await this.paymentRepo.findPaymentByExternalId(
          paymentIntent.id,
        );
        if (payment) {
          await this.paymentRepo.transitionPaymentStatus(
            payment.id,
            payment.status,
            'FAILED',
          );
          this.eventEmitter.emit(EVENT_NAMES.PAYMENT_FAILED, {
            paymentId: payment.id,
            orgId: payment.orgId,
            subscriptionId: payment.subscriptionId,
            reason:
              paymentIntent.last_payment_error?.message ||
              'Payment failed',
            retryCount: payment.retryCount,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as any;
        const customerId = stripeSubscription.customer;
        // Find subscription by external customer ID
        this.logger.log(
          `Stripe subscription deleted for customer ${customerId}`,
        );
        break;
      }

      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }

    return { received: true };
  }
}
