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

    const allowedStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.CANCELLED,
      SubscriptionStatus.EXPIRED,
      SubscriptionStatus.GRACE_PERIOD,
      SubscriptionStatus.PAST_DUE,
    ];

    if (!allowedStatuses.includes(subscription.status as SubscriptionStatus)) {
      throw new BadRequestException(
        `Cannot reactivate subscription with status: ${subscription.status}`,
      );
    }

    // Reactivate with a new period
    const now = new Date();
    const periodEnd = new Date(now);
    if (subscription.billingCycle === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const updated = await this.subscriptionRepo.transitionStatus(
      subscription.id,
      allowedStatuses,
      SubscriptionStatus.ACTIVE,
      {
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        cancelReason: null,
        graceEndsAt: null,
      },
    );

    if (!updated) {
      throw new BadRequestException('Failed to reactivate — concurrent modification');
    }

    await this.subscriptionRepo.recordEvent({
      orgId,
      subscriptionId: subscription.id,
      previousStatus: subscription.status as SubscriptionStatus,
      newStatus: SubscriptionStatus.ACTIVE,
      triggeredById: userId,
      reason: 'Subscription reactivated',
    });

    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_REACTIVATED, {
      subscriptionId: subscription.id,
      orgId,
      userId,
    });

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SUBSCRIPTION_REACTIVATED,
      targetType: 'Subscription',
      targetId: subscription.id,
      metadata: { previousStatus: subscription.status },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Subscription ${subscription.id} reactivated by user ${userId}`);

    return { subscription: updated };
  }
}
