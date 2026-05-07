import {
  Injectable,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { InviteUserDto } from '../dto/invite-user.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { InvitationRepository } from '../../infrastructure/repositories/invitation.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { ConfigService } from '@nestjs/config';
import {
  QUEUE_NAMES,
  EVENT_NAMES,
  INVITATION_EXPIRY_HOURS,
  INVITATION_TOKEN_LENGTH,
} from '@/common/constants';

export interface InviteUserResult {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
}

@Injectable()
export class InviteUserUseCase {
  private readonly logger = new Logger(InviteUserUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly invitationRepository: InvitationRepository,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    invitedById: string,
    dto: InviteUserDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<InviteUserResult> {
    const email = dto.email.toLowerCase().trim();

    // Check if user already exists in this org
    const existingUser = await this.userRepository.findByEmailAndOrg(
      email,
      orgId,
    );
    if (existingUser) {
      throw new ConflictException(
        'A user with this email already exists in your organization',
      );
    }

    // Check if email belongs to another org (multi-tenant isolation)
    const userInOtherOrg = await this.userRepository.findByEmail(email);
    if (userInOtherOrg) {
      throw new ConflictException(
        'This email is already associated with another organization',
      );
    }

    // Revoke any existing pending invites for this email+org to prevent duplicates
    await this.invitationRepository.revokeExistingPendingInvites(email, orgId);

    // Generate secure invite token
    const token = randomBytes(INVITATION_TOKEN_LENGTH).toString('hex');
    const expiresAt = new Date(
      Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    // Create invitation record
    const invitation = await this.invitationRepository.create({
      orgId,
      email,
      role: dto.role,
      token,
      invitedById,
      expiresAt,
    });

    // Queue invite email (AC1: sent ≤2s — async via queue)
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    await this.queueService.publish(QUEUE_NAMES.SEND_INVITE_EMAIL, {
      type: 'invitation',
      to: email,
      role: dto.role,
      token,
      inviteUrl: `${frontendUrl}/auth/accept-invite?token=${token}`,
      orgId,
      invitationId: invitation.id,
    });

    // Audit log
    await this.auditService.log({
      orgId,
      userId: invitedById,
      action: 'USER_INVITED',
      targetType: 'Invitation',
      targetId: invitation.id,
      metadata: { email, role: dto.role, expiresAt: expiresAt.toISOString() },
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.USER_INVITED, {
      orgId,
      invitedById,
      invitationId: invitation.id,
      email,
      role: dto.role,
    });

    this.logger.log(
      `User ${invitedById} invited ${email} to org ${orgId} with role ${dto.role}`,
    );

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }
}
