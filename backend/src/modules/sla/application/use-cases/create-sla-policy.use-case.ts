import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { SlaRepository } from '../../infrastructure/repositories/sla.repository';
import { CreateSlaPolicyDto } from '../dto/create-sla-policy.dto';
import { EVENT_NAMES, SLA_CONFIG } from '@/common/constants';
import { AuditAction } from '@prisma/client';
import { SlaPolicyCreatedEvent } from '@/events/event-bus';

@Injectable()
export class CreateSlaPolicyUseCase {
  private readonly logger = new Logger(CreateSlaPolicyUseCase.name);

  constructor(
    private readonly slaRepo: SlaRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: CreateSlaPolicyDto,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    // Validate policy count limit
    const count = await this.slaRepo.countPolicies(orgId);
    if (count >= SLA_CONFIG.MAX_POLICIES_PER_ORG) {
      throw new BadRequestException(
        `Maximum of ${SLA_CONFIG.MAX_POLICIES_PER_ORG} SLA policies per organization`,
      );
    }

    // Validate name uniqueness
    const existing = await this.slaRepo.findPolicyByName(orgId, dto.name);
    if (existing) {
      throw new ConflictException(
        `SLA policy with name "${dto.name}" already exists`,
      );
    }

    // Validate warning threshold < breach threshold
    if (dto.warningThresholdMs && dto.warningThresholdMs >= dto.thresholdMs) {
      throw new BadRequestException(
        'Warning threshold must be less than breach threshold',
      );
    }

    // Validate business hours configuration
    if (dto.businessHoursOnly) {
      if (dto.businessHoursStart === undefined || dto.businessHoursEnd === undefined) {
        throw new BadRequestException(
          'Business hours start and end are required when businessHoursOnly is true',
        );
      }
      if (dto.businessHoursStart === dto.businessHoursEnd) {
        throw new BadRequestException(
          'Business hours start and end cannot be the same',
        );
      }
    }

    // Build escalation policy JSON
    const escalationPolicy: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      dto.escalationLevels?.length
        ? ({ levels: dto.escalationLevels } as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull;

    const policy = await this.slaRepo.createPolicy({
      orgId,
      name: dto.name,
      description: dto.description ?? null,
      metricType: dto.metricType,
      priority: dto.priority ?? 'NORMAL',
      thresholdMs: dto.thresholdMs,
      warningThresholdMs: dto.warningThresholdMs ?? null,
      isActive: true,
      businessHoursOnly: dto.businessHoursOnly ?? false,
      businessHoursStart: dto.businessHoursStart ?? null,
      businessHoursEnd: dto.businessHoursEnd ?? null,
      businessDays: dto.businessDays ?? Prisma.JsonNull,
      timezone: dto.timezone ?? null,
      notifyOnWarning: dto.notifyOnWarning ?? true,
      notifyOnBreach: dto.notifyOnBreach ?? true,
      notifyUserIds: dto.notifyUserIds ?? Prisma.JsonNull,
      escalationPolicy,
      createdById: userId,
    });

    // Audit
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SLA_POLICY_CREATED,
      targetId: policy.id,
      metadata: {
        name: policy.name,
        metricType: policy.metricType,
        thresholdMs: policy.thresholdMs,
      },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    // Event
    this.eventEmitter.emit(EVENT_NAMES.SLA_POLICY_CREATED, {
      policyId: policy.id,
      orgId,
      name: policy.name,
      metricType: policy.metricType,
      thresholdMs: policy.thresholdMs,
      createdById: userId,
    } satisfies SlaPolicyCreatedEvent);

    this.logger.log(
      `SLA policy created: id=${policy.id} name="${policy.name}" org=${orgId}`,
    );

    return policy;
  }
}
