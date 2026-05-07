import { Injectable } from '@nestjs/common';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { ListSessionsQueryDto } from '../dto';
import { WhatsAppSessionStatus } from '@prisma/client';

@Injectable()
export class ListSessionsUseCase {
  constructor(private readonly sessionRepo: WhatsAppSessionRepository) {}

  async execute(orgId: string, query: ListSessionsQueryDto) {
    return this.sessionRepo.findByOrgIdPaginated(orgId, {
      status: query.status as WhatsAppSessionStatus | undefined,
      userId: query.userId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }
}
