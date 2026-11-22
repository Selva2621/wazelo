import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { CancelSubscriptionDto } from '../dto/subscribe.dto';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class CancelSubscriptionUseCase {
  private readonly logger = new Logger(CancelSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: CancelSubscriptionDto,
    ipAddress: string,
    userAgent: string,
  ) {
    const subscription = await this.subscriptionRepo.findActiveByOrg(orgId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED || subscription.cancelledAt) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    const cancel = { cancelledAt: new Date(), cancelReason: dto.reason || null, scheduledPlanId: null, scheduledChangeAt: null };
    // A paid-up plan (or a trial) stays usable until its period ends: only the renewal is
    // cancelled, and the billing job ends it then (Reactivate before that undoes it).
    // Unpaid (past due / grace) has nothing paid ahead, so it ends now. Data is NOT deleted.
    const atPeriodEnd = subscription.status === SubscriptionStatus.ACTIVE || subscription.status === SubscriptionStatus.TRIAL;
    const updated = atPeriodEnd
      ? await this.subscriptionRepo.transitionStatus(subscription.id, subscription.status, subscription.status, cancel)
      : await this.subscriptionRepo.transitionStatus(
          subscription.id,
          [SubscriptionStatus.PAST_DUE, SubscriptionStatus.GRACE_PERIOD],
          SubscriptionStatus.CANCELLED,
          cancel,
        );

    if (!updated) {
      throw new BadRequestException('Failed to cancel subscription — concurrent modification');
    }

    // Record event
    await this.subscriptionRepo.recordEvent({
      orgId,
      subscriptionId: subscription.id,
      previousStatus: subscription.status,
      newStatus: updated.status,
      triggeredById: userId,
      reason: dto.reason,
      metadata: atPeriodEnd ? { type: 'cancel_at_period_end', endsAt: subscription.currentPeriodEnd.toISOString() } : undefined,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_CANCELLED, {
      subscriptionId: subscription.id,
      orgId,
      userId,
      reason: dto.reason,
    });

    // Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SUBSCRIPTION_CANCELLED,
      targetType: 'Subscription',
      targetId: subscription.id,
      metadata: { reason: dto.reason },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `Subscription ${subscription.id} cancelled by user ${userId}${atPeriodEnd ? ` (ends ${subscription.currentPeriodEnd.toISOString()})` : ''}`,
    );

    return { subscription: updated, endsAt: atPeriodEnd ? subscription.currentPeriodEnd : new Date() };
  }
}
