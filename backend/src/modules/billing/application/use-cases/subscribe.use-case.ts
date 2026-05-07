import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { UsageRepository } from '../../infrastructure/repositories/usage.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { SubscribeDto } from '../dto/subscribe.dto';
import { EVENT_NAMES } from '@/common/constants';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  AuditAction,
  SubscriptionStatus,
  UsageMetricType,
} from '@prisma/client';

@Injectable()
export class SubscribeUseCase {
  private readonly logger = new Logger(SubscribeUseCase.name);

  constructor(
    private readonly planRepo: PlanRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly usageRepo: UsageRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: SubscribeDto & { razorpayPaymentId?: string },
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

    // 2. Check no active subscription exists
    const activeSubscription = await this.subscriptionRepo.findActiveByOrg(orgId);
    if (activeSubscription) {
      throw new ConflictException(
        'Organization already has an active subscription. Use upgrade/downgrade instead.',
      );
    }

    // 3. Validate plan exists and is active
    const plan = await this.planRepo.findById(dto.planId);
    if (!plan || !plan.isActive || plan.deletedAt) {
      throw new NotFoundException('Plan not found or is no longer available');
    }

    // 3b. One-trial-per-org enforcement
    if (plan.trialDays > 0) {
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { trialUsedAt: true },
      });
      if (org?.trialUsedAt) {
        throw new ConflictException(
          'Your organization has already used its free trial. Please choose a paid plan.',
        );
      }
    }

    // 4. Calculate period dates
    const now = new Date();
    const periodStart = now;
    const periodEnd = this.calculatePeriodEnd(now, plan.billingCycle);

    // 5. Determine initial status
    // Trial takes precedence — even a free plan with trialDays > 0 starts as TRIAL
    const hasTrial = plan.trialDays > 0;
    const isFree = plan.priceInCents === 0;
    let initialStatus: SubscriptionStatus;
    let trialEndsAt: Date | undefined;

    if (hasTrial) {
      initialStatus = SubscriptionStatus.TRIAL;
      trialEndsAt = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);
    } else if (isFree) {
      initialStatus = SubscriptionStatus.ACTIVE;
    } else {
      // Paid plan without trial — payment must be pre-verified via Razorpay
      if (!dto.razorpayPaymentId) {
        throw new BadRequestException(
          'Payment is required for paid plans without a trial period. Complete checkout first.',
        );
      }
      initialStatus = SubscriptionStatus.ACTIVE;
    }

    // 6. Create subscription first (needed for payment foreign key)
    const subscription = await this.subscriptionRepo.create({
      orgId,
      planId: plan.id,
      status: initialStatus,
      billingCycle: plan.billingCycle,
      priceInCents: plan.priceInCents,
      currency: plan.currency,
      trialEndsAt,
      currentPeriodStart: periodStart,
      currentPeriodEnd: hasTrial && trialEndsAt ? trialEndsAt : periodEnd,
      idempotencyKey: dto.idempotencyKey,
    });

    // 6b. Record payment for paid plans (now we have the subscription ID)
    if (dto.razorpayPaymentId && initialStatus === SubscriptionStatus.ACTIVE && !hasTrial && !isFree) {
      const payment = await this.paymentRepo.createPayment({
        orgId,
        subscriptionId: subscription.id,
        amountInCents: plan.priceInCents,
        currency: plan.currency,
        externalId: dto.razorpayPaymentId,
        paymentMethod: 'razorpay',
        idempotencyKey: `subscribe-${dto.idempotencyKey || `${orgId}-${dto.planId}-${Date.now()}`}`,
      });
      await this.paymentRepo.transitionPaymentStatus(payment.id, 'PENDING', 'SUCCEEDED');
    }

    // 6c. Mark trial as used for this org (one trial per org lifetime)
    if (initialStatus === SubscriptionStatus.TRIAL) {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { trialUsedAt: now },
      });
    }

    // 7. Initialize usage counters for the period
    // During TRIAL, use lower trial-specific limits if defined on the plan
    const isTrial = initialStatus === SubscriptionStatus.TRIAL;

    const limits: Record<UsageMetricType, number> = {
      [UsageMetricType.MESSAGES_SENT]: isTrial && plan.trialMaxMessagesPerMonth != null
        ? plan.trialMaxMessagesPerMonth : plan.maxMessagesPerMonth,
      [UsageMetricType.ACTIVE_USERS]: isTrial && plan.trialMaxUsers != null
        ? plan.trialMaxUsers : plan.maxUsers,
      [UsageMetricType.WHATSAPP_SESSIONS]: isTrial && plan.trialMaxWhatsappSessions != null
        ? plan.trialMaxWhatsappSessions : plan.maxWhatsappSessions,
      [UsageMetricType.CAMPAIGN_EXECUTIONS]: isTrial && plan.trialMaxCampaignsPerMonth != null
        ? plan.trialMaxCampaignsPerMonth : plan.maxCampaignsPerMonth,
      [UsageMetricType.API_CALLS]: isTrial && plan.trialMaxMessagesPerMonth != null
        ? plan.trialMaxMessagesPerMonth : plan.maxMessagesPerMonth,
      [UsageMetricType.AI_CREDITS]: plan.aiCreditsPerMonth,
      [UsageMetricType.MESSAGE_TEMPLATES]: plan.maxMessageTemplates,
    };

    await this.usageRepo.resetUsageForOrg(
      orgId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
      limits,
    );

    // 8. Record subscription event
    await this.subscriptionRepo.recordEvent({
      orgId,
      subscriptionId: subscription.id,
      newStatus: initialStatus,
      triggeredById: userId,
      metadata: {
        planName: plan.name,
        planSlug: plan.slug,
        priceInCents: plan.priceInCents,
        billingCycle: plan.billingCycle,
      },
    });

    // 9. Emit event
    this.eventEmitter.emit(EVENT_NAMES.SUBSCRIPTION_CREATED, {
      subscriptionId: subscription.id,
      orgId,
      planId: plan.id,
      planName: plan.name,
      status: initialStatus,
      userId,
    });

    // 10. Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SUBSCRIPTION_CREATED,
      targetType: 'Subscription',
      targetId: subscription.id,
      metadata: {
        planId: plan.id,
        planName: plan.name,
        status: initialStatus,
        priceInCents: plan.priceInCents,
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `Subscription ${subscription.id} created for org ${orgId} on plan ${plan.name} (${initialStatus})`,
    );

    return { subscription, deduplicated: false };
  }

  private calculatePeriodEnd(start: Date, billingCycle: string): Date {
    const end = new Date(start);
    if (billingCycle === 'YEARLY') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }
}
