import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AuditAction } from '@prisma/client';
import { UpdateTeamDto } from '../dto/update-team.dto';

@Injectable()
export class UpdateTeamUseCase {
  private readonly logger = new Logger(UpdateTeamUseCase.name);

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    teamId: string,
    dto: UpdateTeamDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.teamRepository.findById(teamId, orgId);
    if (!existing) {
      throw new NotFoundException('Team not found');
    }

    const updated = await this.teamRepository.update(teamId, orgId, dto);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.ORG_SETTINGS_UPDATED,
      targetType: 'team',
      targetId: teamId,
      metadata: { changes: dto },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Team ${teamId} updated in org ${orgId}`);

    return updated;
  }
}
