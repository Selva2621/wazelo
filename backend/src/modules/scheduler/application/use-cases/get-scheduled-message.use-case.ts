import { Injectable, NotFoundException } from '@nestjs/common';
import { SchedulerRepository } from '../../infrastructure/repositories/scheduler.repository';

@Injectable()
export class GetScheduledMessageUseCase {
  constructor(private readonly schedulerRepo: SchedulerRepository) {}

  async execute(id: string, orgId: string) {
    const message = await this.schedulerRepo.findByIdAndOrg(id, orgId);
    if (!message) {
      throw new NotFoundException('Scheduled message not found');
    }
    return message;
  }
}
