import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { SlaRepository } from '../../infrastructure/repositories/sla.repository';
import { UpdateSlaPolicyDto } from '../dto/update-sla-policy.dto';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction } from '@prisma/client';
import { SlaPolicyUpdatedEvent } from '@/events/event-bus';

@Injectable()
export class UpdateSlaPolicyUseCase {
  private readonly logger = new Logger(UpdateSlaPolicyUseCase.name);

  constructor(
    private readonly slaRepo: SlaRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    policyId: string,
    dto: UpdateSlaPolicyDto,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    const existing = await this.slaRepo.findPolicyById(policyId, orgId);
    if (!existing) {
      throw new NotFoundException('SLA policy not found');
    }

    // Validate name uniqueness if changing
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.slaRepo.findPolicyByName(orgId, dto.name);
      if (duplicate) {
        throw new ConflictException(
          `SLA policy with name "${dto.name}" already exists`,
        );
      }
    }

    // Validate warning threshold
    const effectiveThreshold = dto.thresholdMs ?? existing.thresholdMs;
    const effectiveWarning = dto.warningThresholdMs ?? existing.warningThresholdMs;
    if (effectiveWarning && effectiveWarning >= effectiveThreshold) {
      throw new BadRequestException(
        'Warning threshold must be less than breach threshold',
      );
    }

    // Build changes tracking
    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined && (existing as Record<string, unknown>)[key] !== value) {
        changes[key] = value;
      }
    }

    // Determine audit action
    let auditAction: AuditAction = AuditAction.SLA_POLICY_UPDATED;
    if (dto.isActive !== undefined && dto.isActive !== existing.isActive) {
      auditAction = dto.isActive
        ? AuditAction.SLA_POLICY_ENABLED
        : AuditAction.SLA_POLICY_DISABLED;
    }

    const escalationPolicy = dto.escalationLevels !== undefined
      ? dto.escalationLevels.length
        ? ({ levels: dto.escalationLevels } as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull
      : undefined;

    const updated = await this.slaRepo.updatePolicy(policyId, orgId, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.metricType !== undefined ? { metricType: dto.metricType } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.thresholdMs !== undefined ? { thresholdMs: dto.thresholdMs } : {}),
      ...(dto.warningThresholdMs !== undefined ? { warningThresholdMs: dto.warningThresholdMs } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.businessHoursOnly !== undefined ? { businessHoursOnly: dto.businessHoursOnly } : {}),
      ...(dto.businessHoursStart !== undefined ? { businessHoursStart: dto.businessHoursStart } : {}),
      ...(dto.businessHoursEnd !== undefined ? { businessHoursEnd: dto.businessHoursEnd } : {}),
      ...(dto.businessDays !== undefined ? { businessDays: dto.businessDays as number[] } : {}),
      ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
      ...(dto.notifyOnWarning !== undefined ? { notifyOnWarning: dto.notifyOnWarning } : {}),
      ...(dto.notifyOnBreach !== undefined ? { notifyOnBreach: dto.notifyOnBreach } : {}),
      ...(dto.notifyUserIds !== undefined ? { notifyUserIds: dto.notifyUserIds as string[] } : {}),
      ...(escalationPolicy !== undefined ? { escalationPolicy } : {}),
    });

    // Audit
    await this.auditService.log({
      orgId,
      userId,
      action: auditAction,
      targetId: policyId,
      metadata: changes,
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    // Event
    this.eventEmitter.emit(EVENT_NAMES.SLA_POLICY_UPDATED, {
      policyId,
      orgId,
      changes,
      updatedById: userId,
    } satisfies SlaPolicyUpdatedEvent);

    this.logger.log(`SLA policy updated: id=${policyId} org=${orgId}`);

    return updated;
  }
}
