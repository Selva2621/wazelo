import { Injectable } from '@nestjs/common';
import { TeamRepository } from '../../infrastructure/repositories/team.repository';

@Injectable()
export class ListTeamsUseCase {
  constructor(private readonly teamRepository: TeamRepository) {}

  async execute(orgId: string, userId: string, role: string) {
    if (role === 'MANAGER') {
      return this.teamRepository.findByManagerId(userId, orgId);
    }
    // ADMIN sees all teams
    return this.teamRepository.findByOrgId(orgId);
  }
}
