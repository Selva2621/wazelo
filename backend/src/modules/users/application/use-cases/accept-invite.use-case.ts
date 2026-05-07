import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationStatus, UserStatus } from '@prisma/client';
import { AcceptInviteDto } from '../dto/accept-invite.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { InvitationRepository } from '../../infrastructure/repositories/invitation.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PasswordService } from '@/modules/auth/domain/services/password.service';
import { EVENT_NAMES } from '@/common/constants';

export interface AcceptInviteResult {
  message: string;
  email: string;
}

@Injectable()
export class AcceptInviteUseCase {
  private readonly logger = new Logger(AcceptInviteUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly invitationRepository: InvitationRepository,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    dto: AcceptInviteDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AcceptInviteResult> {
    // Find invitation by token
    const invitation = await this.invitationRepository.findByToken(dto.token);
    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    // Check if already used
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `This invitation has been ${invitation.status.toLowerCase()}`,
      );
    }

    // Check expiry (AC2: Expiry enforced)
    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await this.invitationRepository.markExpired(invitation.id);
      await this.auditService.log({
        orgId: invitation.orgId,
        action: 'INVITATION_EXPIRED',
        targetType: 'Invitation',
        targetId: invitation.id,
        metadata: { email: invitation.email },
        ipAddress,
        userAgent,
      });
      throw new BadRequestException('This invitation has expired');
    }

    // Check if email already exists in system
    const existingUser = await this.userRepository.findByEmail(
      invitation.email,
    );
    if (existingUser) {
      // If user already exists in the SAME org, just mark invite accepted
      if (existingUser.orgId === invitation.orgId) {
        await this.invitationRepository.markAccepted(invitation.id);
        throw new ConflictException(
          'You are already a member of this organization',
        );
      }
      // If user exists in ANOTHER org, reject
      throw new ConflictException(
        'This email is already associated with another organization',
      );
    }

    // Hash password before transaction
    const passwordHash = await this.passwordService.hash(dto.password);

    // Create user + mark invitation accepted in a single transaction
    const user = await this.prisma.$transaction(
      async (tx) => {
        // Double-check inside transaction to prevent race conditions
        const existsCheck = await tx.user.count({
          where: {
            email: invitation.email.toLowerCase(),
            deletedAt: null,
          },
        });
        if (existsCheck > 0) {
          throw new ConflictException(
            'A user with this email was just created. Please try logging in.',
          );
        }

        // Re-check invitation is still PENDING (concurrency guard)
        const inviteCheck = await tx.invitation.findFirst({
          where: { id: invitation.id, status: InvitationStatus.PENDING },
        });
        if (!inviteCheck) {
          throw new BadRequestException(
            'This invitation is no longer valid',
          );
        }

        // Create user with role from invitation (AC3: Role assigned correctly)
        const newUser = await tx.user.create({
          data: {
            orgId: invitation.orgId,
            email: invitation.email.toLowerCase(),
            passwordHash,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            role: invitation.role,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
          },
        });

        // Mark invitation as accepted (single-use)
        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: InvitationStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
        });

        return newUser;
      },
      {
        timeout: 10000,
        isolationLevel: 'Serializable',
      },
    );

    // Audit log
    await this.auditService.log({
      orgId: invitation.orgId,
      userId: user.id,
      action: 'INVITATION_ACCEPTED',
      targetType: 'Invitation',
      targetId: invitation.id,
      metadata: {
        email: invitation.email,
        role: invitation.role,
        invitedById: invitation.invitedById,
      },
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.INVITATION_ACCEPTED, {
      orgId: invitation.orgId,
      userId: user.id,
      invitationId: invitation.id,
      email: invitation.email,
      role: invitation.role,
    });

    this.logger.log(
      `Invitation ${invitation.id} accepted by ${invitation.email} for org ${invitation.orgId}`,
    );

    return {
      message: 'Invitation accepted. You can now log in.',
      email: user.email,
    };
  }
}
