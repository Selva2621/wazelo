import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InvitationStatus } from '@prisma/client';
import { InvitationRepository } from '../../infrastructure/repositories/invitation.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';

@Injectable()
export class RevokeInviteUseCase {
  private readonly logger = new Logger(RevokeInviteUseCase.name);

  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    invitationId: string,
    orgId: string,
    revokedById: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const invitation = await this.invitationRepository.findByIdAndOrg(
      invitationId,
      orgId,
    );
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot revoke invitation that is ${invitation.status.toLowerCase()}`,
      );
    }

    await this.invitationRepository.markRevoked(invitationId);

    // Audit log
    await this.auditService.log({
      orgId,
      userId: revokedById,
      action: 'INVITATION_REVOKED',
      targetType: 'Invitation',
      targetId: invitationId,
      metadata: { email: invitation.email, role: invitation.role },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `User ${revokedById} revoked invitation ${invitationId} for ${invitation.email} in org ${orgId}`,
    );

    return { message: 'Invitation revoked successfully' };
  }
}
