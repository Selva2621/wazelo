import { Injectable } from '@nestjs/common';
import { InvitationRepository } from '../../infrastructure/repositories/invitation.repository';
import { Invitation } from '@prisma/client';

@Injectable()
export class ListInvitationsUseCase {
  constructor(
    private readonly invitationRepository: InvitationRepository,
  ) {}

  async execute(orgId: string): Promise<Invitation[]> {
    return this.invitationRepository.findByOrgId(orgId);
  }
}
