import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class ReactivateSubscriptionUseCase {
  private readonly logger = new Logger(ReactivateSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    // Find the most recent subscription (even expired/cancelled)
    const subscription = await this.subscriptionRepo.findActiveByOrg(orgId);

    if (!subscription) {
      throw new NotFoundException('No subscription found to reactivate');
    }

    // Cancelled but the paid period hasn't ended: just undo the cancel (no new period, no charge)
    if (
      subscription.cancelledAt &&
      (subscription.status === SubscriptionStatus.ACTIVE || subscription.status === SubscriptionStatus.TRIAL)
    ) {
      const kept = await this.subscriptionRepo.transitionStatus(subscription.id, subscription.status, subscription.status, {
        cancelledAt: null,
        cancelReason: null,
      });
      if (!kept) throw new BadRequestException('Failed to reactivate — concurrent modification');
      await this.subscriptionRepo.recordEvent({
        orgId,
        subscriptionId: subscription.id,
        previousStatus: subscription.status,
        newStatus: subscription.status,
        triggeredById: userId,
        reason: 'Cancellation undone before the period ended',
        metadata: { type: 'cancel_undone' },
      });
      this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_REACTIVATED, { subscriptionId: subscription.id, orgId, userId });
      await this.auditService.log({
        orgId,
        userId,
        action: AuditAction.SUBSCRIPTION_REACTIVATED,
        targetType: 'Subscription',
        targetId: subscription.id,
        metadata: { previousStatus: subscription.status, undoCancel: true },
        ipAddress,
        userAgent,
      });
      return { subscription: kept };
    }

    // Anything else (unpaid GRACE_PERIOD / PAST_DUE, or a plan that has ended) comes back
    // only by paying — reactivating never hands out a free period
    if (
      subscription.status === SubscriptionStatus.GRACE_PERIOD ||
      subscription.status === SubscriptionStatus.PAST_DUE
    ) {
      throw new BadRequestException('Your plan is unpaid. Pay to renew from Billing.');
    }
    throw new BadRequestException(
      `Cannot reactivate subscription with status: ${subscription.status}. Pay to renew from Billing.`,
    );
  }
}
