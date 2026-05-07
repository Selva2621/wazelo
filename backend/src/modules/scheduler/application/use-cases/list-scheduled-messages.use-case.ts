import { Injectable } from '@nestjs/common';
import { SchedulerRepository } from '../../infrastructure/repositories/scheduler.repository';
import { ListScheduledMessagesDto } from '../dto';

@Injectable()
export class ListScheduledMessagesUseCase {
  constructor(private readonly schedulerRepo: SchedulerRepository) {}

  async execute(orgId: string, dto: ListScheduledMessagesDto) {
    return this.schedulerRepo.list({
      orgId,
      status: dto.status,
      limit: dto.limit ?? 20,
      offset: dto.offset ?? 0,
    });
  }
}
