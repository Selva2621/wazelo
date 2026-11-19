import {
  BadRequestException,
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Public } from '@/common/decorators/public.decorator';
import { RazorpayPaymentService } from '../../domain/services/razorpay-payment.service';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { EVENT_NAMES } from '@/common/constants';
import { FulfillAiCreditOrderUseCase } from '../../application/use-cases/ai-credits.use-cases';

@Controller('webhooks/razorpay')
@Public()
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly razorpayPayment: RazorpayPaymentService,
    private readonly paymentRepo: PaymentRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly fulfillAiCreditOrder: FulfillAiCreditOrderUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: Request) {
    const signature = req.headers['x-razorpay-signature'] as string;
    // Razorpay signs the exact bytes it sent; re-serialised JSON can differ (escaping)
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const body = rawBody ? rawBody.toString('utf8') : JSON.stringify(req.body);

    if (!signature) {
      return { status: 'error', message: 'Missing signature' };
    }

    const valid = this.razorpayPayment.verifyWebhookSignature(body, signature);
    if (!valid) {
      this.logger.warn('Invalid Razorpay webhook signature');
      return { status: 'error', message: 'Invalid signature' };
    }

    const event = req.body;
    const eventType = event?.event;
    const payload = event?.payload;

    switch (eventType) {
      case 'payment.captured': {
        const rpPayment = payload?.payment?.entity;
        if (!rpPayment) break;

        const payment = await this.paymentRepo.findPaymentByExternalId(
          rpPayment.id,
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
          this.logger.log(
            `Razorpay payment captured: ${rpPayment.id} → ${payment.id}`,
          );
        } else if (rpPayment.order_id) {
          // An AI credit pack whose buyer closed the tab before verify ran
          try {
            await this.fulfillAiCreditOrder.execute({ orderId: rpPayment.order_id, razorpayPaymentId: rpPayment.id });
          } catch (err) {
            // 400 = not an AI-credit order (e.g. a plan checkout not yet verified): nothing to do.
            // Anything else (gateway down, DB error) must fail the webhook so Razorpay retries,
            // otherwise a paid pack is never credited.
            if (!(err instanceof BadRequestException)) throw err;
            this.logger.debug(`Captured payment ${rpPayment.id} is not an AI credit order: ${err.message}`);
          }
        }
        break;
      }

      case 'payment.failed': {
        const rpPayment = payload?.payment?.entity;
        if (!rpPayment) break;

        const payment = await this.paymentRepo.findPaymentByExternalId(
          rpPayment.id,
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
              rpPayment.error_description ||
              rpPayment.error_reason ||
              'Payment failed',
            retryCount: payment.retryCount,
          });
          this.logger.warn(
            `Razorpay payment failed: ${rpPayment.id} — ${rpPayment.error_description}`,
          );
        }
        break;
      }

      case 'subscription.charged': {
        const rpSubscription = payload?.subscription?.entity;
        const rpPayment = payload?.payment?.entity;
        if (!rpSubscription || !rpPayment) break;

        this.logger.log(
          `Razorpay subscription charged: ${rpSubscription.id}, payment: ${rpPayment.id}`,
        );
        break;
      }

      case 'subscription.cancelled': {
        const rpSubscription = payload?.subscription?.entity;
        if (!rpSubscription) break;

        const subscription = await this.subscriptionRepo.findByExternalId(
          rpSubscription.id,
        );
        if (subscription) {
          await this.subscriptionRepo.transitionStatus(
            subscription.id,
            subscription.status,
            'CANCELLED' as any,
          );
          this.logger.log(
            `Razorpay subscription cancelled: ${rpSubscription.id} → local ${subscription.id}`,
          );
        } else {
          this.logger.warn(
            `Razorpay subscription cancelled but no local record found: ${rpSubscription.id}`,
          );
        }
        break;
      }

      default:
        this.logger.debug(`Unhandled Razorpay event: ${eventType}`);
    }

    return { status: 'ok' };
  }
}
