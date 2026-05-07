import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction } from '@prisma/client';

@Injectable()
export class CreatePlanUseCase {
  private readonly logger = new Logger(CreatePlanUseCase.name);

  constructor(
    private readonly planRepo: PlanRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    userId: string,
    dto: CreatePlanDto,
    ipAddress: string,
    userAgent: string,
  ) {
    // Check if an active plan with same slug+cycle already exists
    const existing = await this.planRepo.findActiveBySlugAndCycle(
      dto.slug,
      dto.billingCycle,
    );

    if (existing) {
      throw new BadRequestException(
        `An active plan with slug "${dto.slug}" and cycle "${dto.billingCycle}" already exists. ` +
        'Deactivate the existing plan first, or use a different slug.',
      );
    }

    // If setting as default, ensure only one default plan exists
    if (dto.isDefault) {
      const currentDefault = await this.planRepo.findDefault();
      if (currentDefault) {
        throw new BadRequestException(
          `Plan "${currentDefault.name}" is already set as default. ` +
          'Update it first before setting a new default.',
        );
      }
    }

    const plan = await this.planRepo.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      billingCycle: dto.billingCycle,
      priceInCents: dto.priceInCents,
      currency: dto.currency,
      trialDays: dto.trialDays,
      maxUsers: dto.maxUsers,
      maxWhatsappSessions: dto.maxWhatsappSessions,
      maxMessagesPerMonth: dto.maxMessagesPerMonth,
      maxCampaignsPerMonth: dto.maxCampaignsPerMonth,
      campaignsEnabled: dto.campaignsEnabled,
      automationEnabled: dto.automationEnabled,
      apiEnabled: dto.apiEnabled,
      maxApiCallsPerMonth: dto.maxApiCallsPerMonth,
      aiCreditsPerMonth: dto.aiCreditsPerMonth,
      aiEnabled: dto.aiEnabled,
      maxMessageTemplates: dto.maxMessageTemplates,
      shopifyEnabled: dto.shopifyEnabled,
      maxShopifyStores: dto.maxShopifyStores,
      softLimitPercent: dto.softLimitPercent,
      gracePeriodDays: dto.gracePeriodDays,
      isDefault: dto.isDefault,
      sortOrder: dto.sortOrder,
    });

    this.eventEmitter.emit(EVENT_NAMES.PLAN_CREATED, {
      planId: plan.id,
      name: plan.name,
      slug: plan.slug,
      userId,
    });

    await this.auditService.log({
      userId,
      action: AuditAction.PLAN_CREATED,
      targetType: 'Plan',
      targetId: plan.id,
      metadata: {
        name: plan.name,
        slug: plan.slug,
        billingCycle: plan.billingCycle,
        priceInCents: plan.priceInCents,
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Plan ${plan.id} (${plan.name}) created by user ${userId}`);
    return { plan };
  }
}
