import { Injectable } from '@nestjs/common';
import { TeamRepository } from '@/modules/teams/infrastructure/repositories/team.repository';

export interface ScopeResult {
  /** undefined = no filter (org-wide), string[] = filter to these user IDs */
  userIds: string[] | undefined;
}

@Injectable()
export class AnalyticsScopeService {
  constructor(private readonly teamRepo: TeamRepository) {}

  /**
   * Resolves which user IDs a requester is allowed to see analytics for.
   *
   * - ADMIN: org-wide (optionally filtered to a specific userId)
   * - MANAGER: own ID + team member IDs
   * - EMPLOYEE: only own data
   */
  async resolveScope(
    orgId: string,
    role: string,
    requesterId: string,
    filterUserId?: string,
  ): Promise<ScopeResult> {
    if (role === 'ADMIN') {
      return { userIds: filterUserId ? [filterUserId] : undefined };
    }

    if (role === 'MANAGER') {
      const memberIds = await this.teamRepo.getMemberUserIds(
        requesterId,
        orgId,
      );
      // If admin requested a specific user, intersect with allowed scope
      if (filterUserId) {
        return {
          userIds: memberIds.includes(filterUserId) ? [filterUserId] : [],
        };
      }
      return { userIds: memberIds };
    }

    // EMPLOYEE — own data only
    return { userIds: [requesterId] };
  }
}
