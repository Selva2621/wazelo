import { Injectable } from '@nestjs/common';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';

@Injectable()
export class GetTeamSessionIdsUseCase {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly sessionRepository: WhatsAppSessionRepository,
  ) {}

  /**
   * Returns all userIds and their active sessionIds for a manager's team.
   * Includes the manager themselves.
   */
  async execute(
    managerId: string,
    orgId: string,
  ): Promise<{ userIds: string[]; sessionIds: string[] }> {
    const userIds = await this.teamRepository.getMemberUserIds(managerId, orgId);

    const sessions = await this.sessionRepository.findByUserIds(userIds, orgId);
    const sessionIds = sessions.map((s) => s.id);

    return { userIds, sessionIds };
  }
}
