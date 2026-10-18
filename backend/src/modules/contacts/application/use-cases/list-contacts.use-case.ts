import { Injectable, ForbiddenException } from '@nestjs/common';
import {
  ContactRepository,
  ContactWithRelations,
  ContactOwnerScope,
  ContactGroups,
} from '../../infrastructure/repositories/contact.repository';
import { TeamRepository } from '@/modules/teams/infrastructure/repositories/team.repository';
import { ListContactsQueryDto } from '../dto/list-contacts-query.dto';

export interface ListContactsResult {
  contacts: ContactWithRelations[];
  total: number;
  take: number;
  skip: number;
}

@Injectable()
export class ListContactsUseCase {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    role: string,
    query: ListContactsQueryDto,
  ): Promise<ListContactsResult> {
    const { ownerId, ownerIds } = await this.resolveOwnerScope(orgId, userId, role, query.ownerId);

    const { contacts, total } = await this.contactRepository.findByOrgPaginated(
      orgId,
      {
        take: query.take,
        skip: query.skip,
        leadStatus: query.leadStatus,
        ownerId,
        ownerIds,
        source: query.source,
        scrapeRunId: query.scrapeRunId,
        tagIds: query.tagIds,
        productIds: query.productIds,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    );

    return {
      contacts,
      total,
      take: query.take ?? 50,
      skip: query.skip ?? 0,
    };
  }

  /** Lead-source groups (per source + per scrape run) with counts the caller may see */
  async groups(orgId: string, userId: string, role: string): Promise<ContactGroups> {
    const scope = await this.resolveOwnerScope(orgId, userId, role);
    return this.contactRepository.countGroups(orgId, scope);
  }

  private async resolveOwnerScope(
    orgId: string,
    userId: string,
    role: string,
    requestedOwnerId?: string,
  ): Promise<ContactOwnerScope> {
    if (role === 'EMPLOYEE') {
      // Employee sees only own contacts
      return { ownerId: userId };
    }
    if (role === 'MANAGER') {
      const teamUserIds = await this.teamRepository.getMemberUserIds(userId, orgId);
      if (requestedOwnerId) {
        // Manager drill-down: validate target is in team
        if (!teamUserIds.includes(requestedOwnerId)) {
          throw new ForbiddenException('User is not in your team');
        }
        return { ownerId: requestedOwnerId };
      }
      // Manager default: own + team members' contacts
      return { ownerIds: teamUserIds };
    }
    // ADMIN: pass through requested owner or see all
    return { ownerId: requestedOwnerId };
  }
}
