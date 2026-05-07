import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class DeleteTeamUseCase {
  private readonly logger = new Logger(DeleteTeamUseCase.name);

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    teamId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.teamRepository.findById(teamId, orgId);
    if (!existing) {
      throw new NotFoundException('Team not found');
    }

    await this.teamRepository.softDelete(teamId);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.ORG_SETTINGS_UPDATED,
      targetType: 'team',
      targetId: teamId,
      metadata: { action: 'deleted', name: existing.name },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Team ${teamId} deleted in org ${orgId}`);

    return { success: true };
  }
}
