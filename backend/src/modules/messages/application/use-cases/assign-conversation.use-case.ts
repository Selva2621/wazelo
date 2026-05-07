import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationRepository } from '../../infrastructure/repositories/conversation.repository';
import { EVENT_NAMES } from '@/common/constants';
import { TeamRepository } from '@/modules/teams/infrastructure/repositories/team.repository';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';

export interface ConversationAssignedEvent {
  conversationId: string;
  orgId: string;
  assignedToId: string | null;
  assignedById: string;
}

@Injectable()
export class AssignConversationUseCase {
  private readonly logger = new Logger(AssignConversationUseCase.name);

  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly userRepo: UserRepository,
    private readonly teamRepo: TeamRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    conversationId: string,
    orgId: string,
    requestingUserId: string,
    requestingUserRole: string,
    assignedToId: string | null,
  ): Promise<{ success: boolean; assignedToId: string | null }> {
    // EMPLOYEE cannot assign conversations
    if (requestingUserRole === 'EMPLOYEE') {
      throw new ForbiddenException('Employees cannot assign conversations');
    }

    const conversation = await this.conversationRepo.findByIdAndOrg(conversationId, orgId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Validate target user belongs to org (if assigning, not unassigning)
    if (assignedToId !== null) {
      const targetUser = await this.userRepo.findById(assignedToId);
      if (!targetUser || targetUser.orgId !== orgId) {
        throw new NotFoundException('Target user not found in this organisation');
      }

      // MANAGER can only assign to their own team members (or themselves)
      if (requestingUserRole === 'MANAGER') {
        const allowedIds = await this.teamRepo.getMemberUserIds(requestingUserId, orgId);
        if (!allowedIds.includes(assignedToId)) {
          throw new ForbiddenException('You can only assign conversations to your own team members');
        }
      }
    }

    await this.conversationRepo.assignTo(conversationId, assignedToId);

    const event: ConversationAssignedEvent = {
      conversationId,
      orgId,
      assignedToId,
      assignedById: requestingUserId,
    };
    this.eventEmitter.emit(EVENT_NAMES.CONVERSATION_ASSIGNED, event);

    this.logger.log(
      `Conversation ${conversationId} assigned to ${assignedToId ?? 'nobody'} by ${requestingUserId}`,
    );

    return { success: true, assignedToId };
  }
}
