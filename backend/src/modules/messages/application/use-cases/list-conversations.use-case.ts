import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConversationRepository } from '../../infrastructure/repositories/conversation.repository';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { GetTeamSessionIdsUseCase } from '@/modules/teams/application/use-cases/get-team-session-ids.use-case';
import { ConversationStatus } from '@prisma/client';
import { ListConversationsQueryDto } from '../dto';

@Injectable()
export class ListConversationsUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly getTeamSessionIds: GetTeamSessionIdsUseCase,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    role: string,
    query: ListConversationsQueryDto,
  ) {
    let sessionId = query.sessionId;
    let sessionIds: string[] | undefined;

    if (role === 'EMPLOYEE') {
      // Employee: show conversations from ALL their sessions (current + past)
      const allIds = await this.sessionRepo.findAllSessionIdsByUserId(userId, orgId);
      if (allIds.length === 0) {
        return { data: [], total: 0, page: query.page, limit: query.limit };
      }
      sessionIds = allIds;
    } else if (role === 'MANAGER') {
      if (query.targetUserId) {
        // Drill-down: validate target is in manager's team
        const { userIds } = await this.getTeamSessionIds.execute(userId, orgId);
        if (!userIds.includes(query.targetUserId)) {
          throw new ForbiddenException('User is not in your team');
        }
        const allIds = await this.sessionRepo.findAllSessionIdsByUserId(query.targetUserId, orgId);
        if (allIds.length === 0) {
          return { data: [], total: 0, page: query.page, limit: query.limit };
        }
        sessionIds = allIds;
      } else if (query.teamView) {
        // Team view: all team members' sessions
        const result = await this.getTeamSessionIds.execute(userId, orgId);
        sessionIds = result.sessionIds;
      } else {
        // Default: own sessions (all history)
        const allIds = await this.sessionRepo.findAllSessionIdsByUserId(userId, orgId);
        if (allIds.length === 0) {
          return { data: [], total: 0, page: query.page, limit: query.limit };
        }
        sessionIds = allIds;
      }
    } else if (role === 'ADMIN') {
      if (query.targetUserId) {
        // Drill-down into any user's all sessions
        const allIds = await this.sessionRepo.findAllSessionIdsByUserId(query.targetUserId, orgId);
        if (allIds.length === 0) {
          return { data: [], total: 0, page: query.page, limit: query.limit };
        }
        sessionIds = allIds;
      }
      // No targetUserId = all org conversations (existing behavior)
    }

    return this.conversationRepo.findByOrgPaginated(orgId, {
      page: query.page,
      limit: query.limit,
      status: query.status as ConversationStatus | undefined,
      assignedToId: query.assignedToId,
      sessionId,
      sessionIds,
      contactPhone: query.contactPhone,
    });
  }
}
