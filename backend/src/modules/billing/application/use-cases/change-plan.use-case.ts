import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { UsageRepository } from '../../infrastructure/repositories/usage.repository';
import { ProrationService } from '../../domain/services/proration.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { ChangePlanDto } from '../dto/subscribe.dto';
import { EVENT_NAMES } from '@/common/constants';
import {
  AuditAction,
  SubscriptionStatus,
  UsageMetricType,
} from '@prisma/client';

@Injectable()
export class ChangePlanUseCase {
  private readonly logger = new Logger(ChangePlanUseCase.name);

  constructor(
    private readonly planRepo: PlanRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly usageRepo: UsageRepository,
    private readonly prorationService: ProrationService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: ChangePlanDto,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.subscriptionRepo.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        return { subscription: existing, deduplicated: true };
      }
    }

    // 2. Get current active subscription
    const subscription = await this.subscriptionRepo.findByOrgWithPlan(orgId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found for this organization');
    }

    // 3. Validate new plan
    const newPlan = await this.planRepo.findById(dto.newPlanId);
    if (!newPlan || !newPlan.isActive || newPlan.deletedAt) {
      throw new NotFoundException('Target plan not found or is no longer available');
    }

    if (subscription.planId === dto.newPlanId) {
      throw new BadRequestException('Already subscribed to this plan');
    }

    // 4. Determine if upgrade or downgrade
    const currentPlan = subscription.plan;
    const isUpgrade = newPlan.priceInCents > currentPlan.priceInCents;

    if (isUpgrade) {
      return this.handleUpgrade(subscription, currentPlan, newPlan, orgId, userId, ipAddress, userAgent);
    } else {
      return this.handleDowngrade(subscription, currentPlan, newPlan, orgId, userId, ipAddress, userAgent);
    }
  }

  /**
   * Upgrade → immediate effect with proration.
   */
  private async handleUpgrade(
    subscription: any,
    currentPlan: any,
    newPlan: any,
    orgId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    // Calculate proration
    const proration = this.prorationService.calculate(
      subscription.priceInCents,
      newPlan.priceInCents,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
    );

    // Validate current usage doesn't already exceed new plan limits
    // (This should not block upgrade since new plan has higher limits, but log warning)

    // Clear any scheduled downgrade
    if (subscription.scheduledPlanId) {
      await this.subscriptionRepo.clearScheduledDowngrade(subscription.id);
    }

    // Update subscription to new plan immediately
    const updated = await this.subscriptionRepo.updatePlan(
      subscription.id,
      newPlan.id,
      newPlan.priceInCents,
    );

    if (!updated) {
      throw new BadRequestException('Failed to update subscription — concurrent modification');
    }

    // Update usage limits for current period
    const limits: Record<UsageMetricType, number> = {
      [UsageMetricType.MESSAGES_SENT]: newPlan.maxMessagesPerMonth,
      [UsageMetricType.ACTIVE_USERS]: newPlan.maxUsers,
      [UsageMetricType.WHATSAPP_SESSIONS]: newPlan.maxWhatsappSessions,
      [UsageMetricType.CAMPAIGN_EXECUTIONS]: newPlan.maxCampaignsPerMonth,
      [UsageMetricType.API_CALLS]: newPlan.maxMessagesPerMonth,
      [UsageMetricType.AI_CREDITS]: newPlan.aiCreditsPerMonth,
      [UsageMetricType.MESSAGE_TEMPLATES]: newPlan.maxMessageTemplates,
    };

    await this.usageRepo.resetUsageForOrg(
      orgId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
      limits,
    );

    // Record event
    await this.subscriptionRepo.recordEvent({
      orgId,
      subscriptionId: subscription.id,
      previousStatus: subscription.status,
      newStatus: subscription.status,
      previousPlanId: currentPlan.id,
      newPlanId: newPlan.id,
      triggeredById: userId,
      metadata: {
        type: 'upgrade',
        proration,
      },
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_UPGRADED, {
      subscriptionId: subscription.id,
      orgId,
      previousPlanId: currentPlan.id,
      newPlanId: newPlan.id,
      proratedAmountInCents: proration.netAmountInCents,
      userId,
    });

    // Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SUBSCRIPTION_UPGRADED,
      targetType: 'Subscription',
      targetId: subscription.id,
      metadata: {
        previousPlan: currentPlan.name,
        newPlan: newPlan.name,
        proration,
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `Subscription ${subscription.id} upgraded from ${currentPlan.name} to ${newPlan.name}`,
    );

    return {
      subscription: updated,
      type: 'upgrade',
      effectiveImmediately: true,
      proration,
      deduplicated: false,
    };
  }

  /**
   * Downgrade → scheduled for next billing cycle.
   * Validate that current usage won't exceed new plan's lower limits.
   */
  private async handleDowngrade(
    subscription: any,
    currentPlan: any,
    newPlan: any,
    orgId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    // Validate current usage against new (lower) limits
    const violations = await this.checkDowngradeViability(orgId, newPlan);
    if (violations.length > 0) {
      throw new BadRequestException({
        message: 'Cannot downgrade: current usage exceeds target plan limits',
        violations,
      });
    }

    // Schedule downgrade for end of current billing period
    const updated = await this.subscriptionRepo.scheduleDowngrade(
      subscription.id,
      newPlan.id,
      subscription.currentPeriodEnd,
    );

    if (!updated) {
      throw new BadRequestException('Failed to schedule downgrade — concurrent modification');
    }

    // Record event
    await this.subscriptionRepo.recordEvent({
      orgId,
      subscriptionId: subscription.id,
      previousStatus: subscription.status,
      newStatus: subscription.status,
      previousPlanId: currentPlan.id,
      newPlanId: newPlan.id,
      triggeredById: userId,
      reason: `Downgrade scheduled for ${subscription.currentPeriodEnd.toISOString()}`,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_DOWNGRADE_SCHEDULED, {
      subscriptionId: subscription.id,
      orgId,
      currentPlanId: currentPlan.id,
      scheduledPlanId: newPlan.id,
      scheduledAt: subscription.currentPeriodEnd.toISOString(),
      userId,
    });

    // Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SUBSCRIPTION_DOWNGRADE_SCHEDULED,
      targetType: 'Subscription',
      targetId: subscription.id,
      metadata: {
        currentPlan: currentPlan.name,
        newPlan: newPlan.name,
        scheduledAt: subscription.currentPeriodEnd.toISOString(),
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `Subscription ${subscription.id} downgrade scheduled from ${currentPlan.name} to ${newPlan.name} at ${subscription.currentPeriodEnd.toISOString()}`,
    );

    return {
      subscription: updated,
      type: 'downgrade',
      effectiveImmediately: false,
      scheduledAt: subscription.currentPeriodEnd,
      deduplicated: false,
    };
  }

  /**
   * Check if current resource usage exceeds the new plan's limits.
   * Returns list of violations if any.
   */
  private async checkDowngradeViability(
    orgId: string,
    newPlan: any,
  ): Promise<{ metric: string; currentValue: number; newLimit: number }[]> {
    const violations: { metric: string; currentValue: number; newLimit: number }[] = [];

    // Check active users
    const activeUsers = await this.usageRepo.getActiveUserCount(orgId);
    if (activeUsers > newPlan.maxUsers) {
      violations.push({
        metric: 'active_users',
        currentValue: activeUsers,
        newLimit: newPlan.maxUsers,
      });
    }

    // Check active WhatsApp sessions
    const activeSessions = await this.usageRepo.getActiveSessionCount(orgId);
    if (activeSessions > newPlan.maxWhatsappSessions) {
      violations.push({
        metric: 'whatsapp_sessions',
        currentValue: activeSessions,
        newLimit: newPlan.maxWhatsappSessions,
      });
    }

    return violations;
  }
}
