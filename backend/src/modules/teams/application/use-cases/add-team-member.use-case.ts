import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AddTeamMemberUseCase {
  private readonly logger = new Logger(AddTeamMemberUseCase.name);

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
    if (existingMember) {
      throw new ConflictException('User is already a member of this team');
    }

    const member = await this.teamRepository.addMember(teamId, memberUserId);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.ORG_SETTINGS_UPDATED,
      targetType: 'team_member',
      targetId: member.id,
      metadata: { teamId, memberUserId },
      ipAddress,
      userAgent,
    });

    this.logger.log(`User ${memberUserId} added to team ${teamId}`);

    return member;
  }
}
