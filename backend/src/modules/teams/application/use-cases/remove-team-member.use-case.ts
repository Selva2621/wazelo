import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class RemoveTeamMemberUseCase {
  private readonly logger = new Logger(RemoveTeamMemberUseCase.name);

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    teamId: string,
    memberUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const team = await this.teamRepository.findById(teamId, orgId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const existingMember = await this.teamRepository.findMember(teamId, memberUserId);
    if (!existingMember) {
      throw new NotFoundException('User is not a member of this team');
    }

    await this.teamRepository.removeMember(teamId, memberUserId);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.ORG_SETTINGS_UPDATED,
      targetType: 'team_member',
      targetId: existingMember.id,
      metadata: { teamId, memberUserId, action: 'removed' },
      ipAddress,
      userAgent,
    });

    this.logger.log(`User ${memberUserId} removed from team ${teamId}`);

    return { success: true };
  }
}
