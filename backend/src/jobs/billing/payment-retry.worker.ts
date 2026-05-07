import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentRepository } from '@/modules/billing/infrastructure/repositories/payment.repository';
import { SubscriptionRepository } from '@/modules/billing/infrastructure/repositories/subscription.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { StripePaymentService } from '@/modules/billing/domain/services/stripe-payment.service';
import { BILLING_CONFIG, EVENT_NAMES } from '@/common/constants';
import { AuditAction, PaymentStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class PaymentRetryWorker {
  private readonly logger = new Logger(PaymentRetryWorker.name);

  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly stripePayment: StripePaymentService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Runs every 10 minutes to retry failed payments.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handlePaymentRetries() {
    const now = new Date();

    try {
      const failedPayments = await this.paymentRepo.findPaymentsForRetry(now);

      for (const payment of failedPayments) {
        try {
          await this.retryPayment(payment);
        } catch (error) {
          this.logger.error(
            `Failed to retry payment ${payment.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      if (failedPayments.length > 0) {
        this.logger.log(`Processed ${failedPayments.length} payment retries`);
      }
    } catch (error) {
      this.logger.error(`Payment retry check failed: ${error.message}`, error.stack);
    }
  }

  private async retryPayment(payment: any) {
    if (payment.retryCount >= payment.maxRetries) {
      // Max retries reached — mark subscription as PAST_DUE
      this.logger.warn(
        `Payment ${payment.id} max retries (${payment.maxRetries}) reached`,
      );

      const subscription = await this.subscriptionRepo.findById(payment.subscriptionId);
      if (subscription && subscription.status === SubscriptionStatus.ACTIVE) {
        await this.subscriptionRepo.transitionStatus(
          subscription.id,
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PAST_DUE,
        );

        await this.subscriptionRepo.recordEvent({
          orgId: subscription.orgId,
          subscriptionId: subscription.id,
          previousStatus: SubscriptionStatus.ACTIVE,
          newStatus: SubscriptionStatus.PAST_DUE,
          reason: `Payment failed after ${payment.maxRetries} retries`,
        });
      }

      return;
    }

    // Retry payment through Stripe
    this.logger.log(
      `Retrying payment ${payment.id} (attempt ${payment.retryCount + 1}/${payment.maxRetries})`,
    );

    const subscription = await this.subscriptionRepo.findById(payment.subscriptionId);
    const result = await this.stripePayment.chargePayment(
      payment.amountInCents,
      payment.currency,
      subscription?.externalCustomerId || '',
      subscription?.externalCustomerId || '', // Stripe uses default payment method from customer
      `retry-${payment.id}-${payment.retryCount + 1}`,
      `Wazelo CRM payment retry #${payment.retryCount + 1}`,
    );

    if (result.success) {
      await this.paymentRepo.transitionPaymentStatus(payment.id, 'FAILED', 'SUCCEEDED');

      this.eventEmitter.emit(EVENT_NAMES.PAYMENT_SUCCEEDED, {
        paymentId: payment.id,
        orgId: payment.orgId,
        subscriptionId: payment.subscriptionId,
        amountInCents: payment.amountInCents,
      });

      this.logger.log(`Payment ${payment.id} retry succeeded`);
      return;
    }

    // Still failing — schedule next retry with exponential backoff
    const delaySeconds = BILLING_CONFIG.PAYMENT_RETRY_BASE_DELAY_SECONDS * Math.pow(2, payment.retryCount);
    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

    await this.paymentRepo.schedulePaymentRetry(payment.id, nextRetryAt);

    this.eventEmitter.emit(EVENT_NAMES.PAYMENT_RETRY_SCHEDULED, {
      paymentId: payment.id,
      orgId: payment.orgId,
      subscriptionId: payment.subscriptionId,
      retryCount: payment.retryCount + 1,
      nextRetryAt: nextRetryAt.toISOString(),
    });

    await this.auditService.log({
      orgId: payment.orgId,
      action: AuditAction.PAYMENT_RETRY_SCHEDULED,
      targetType: 'Payment',
      targetId: payment.id,
      metadata: {
        retryCount: payment.retryCount + 1,
        nextRetryAt: nextRetryAt.toISOString(),
      },
      source: 'worker',
    });
  }
}
