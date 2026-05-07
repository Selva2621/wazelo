import { Injectable, ForbiddenException } from '@nestjs/common';
import {
  ContactRepository,
  ContactWithRelations,
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
    let ownerId = query.ownerId;
    let ownerIds: string[] | undefined;

    if (role === 'EMPLOYEE') {
      // Employee sees only own contacts
      ownerId = userId;
    } else if (role === 'MANAGER') {
      if (query.ownerId) {
        // Manager drill-down: validate target is in team
        const teamUserIds = await this.teamRepository.getMemberUserIds(userId, orgId);
        if (!teamUserIds.includes(query.ownerId)) {
          throw new ForbiddenException('User is not in your team');
        }
        ownerId = query.ownerId;
      } else {
        // Manager default: own + team members' contacts
        ownerIds = await this.teamRepository.getMemberUserIds(userId, orgId);
      }
    }
    // ADMIN: pass through query.ownerId or see all

    const { contacts, total } = await this.contactRepository.findByOrgPaginated(
      orgId,
      {
        take: query.take,
        skip: query.skip,
        leadStatus: query.leadStatus,
        ownerId,
        ownerIds,
        source: query.source,
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
}
