import { Injectable } from '@nestjs/common';
import { DeadLetterRepository } from '../../infrastructure/repositories/dead-letter.repository';
import { ListDeadLettersQueryDto } from '../dto';

@Injectable()
export class ListDeadLettersUseCase {
  constructor(private readonly deadLetterRepo: DeadLetterRepository) {}

  async execute(orgId: string, query: ListDeadLettersQueryDto) {
    return this.deadLetterRepo.findByOrgPaginated(orgId, {
      page: query.page,
      limit: query.limit,
      reprocessed: query.reprocessed,
    });
  }
}
