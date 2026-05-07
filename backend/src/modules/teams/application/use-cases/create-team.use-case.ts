import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AuditAction } from '@prisma/client';
import { CreateTeamDto } from '../dto/create-team.dto';

@Injectable()
export class CreateTeamUseCase {
  private readonly logger = new Logger(CreateTeamUseCase.name);

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: CreateTeamDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const team = await this.teamRepository.create(orgId, dto.name, dto.managerId);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.ORG_SETTINGS_UPDATED,
      targetType: 'team',
      targetId: team.id,
      metadata: { name: dto.name, managerId: dto.managerId },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Team "${dto.name}" created in org ${orgId}`);

    return team;
  }
}
