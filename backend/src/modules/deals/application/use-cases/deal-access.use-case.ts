import { Injectable } from '@nestjs/common';
import { TeamRepository } from '@/modules/teams/infrastructure/repositories/team.repository';
import type { DealScope } from '../../infrastructure/repositories/deal.repository';

/**
 * Deals follow contact visibility: an employee sees deals on their own
 * contacts or assigned to them, a manager their team's, an admin all.
 */
@Injectable()
export class DealAccessUseCase {
  constructor(private readonly teamRepository: TeamRepository) {}

  async scopeFor(user: { orgId: string; sub: string; role: string }): Promise<DealScope> {
    if (user.role === 'EMPLOYEE') return { userIds: [user.sub] };
    if (user.role === 'MANAGER') {
      return { userIds: await this.teamRepository.getMemberUserIds(user.sub, user.orgId) };
    }
    return undefined;
  }
}
