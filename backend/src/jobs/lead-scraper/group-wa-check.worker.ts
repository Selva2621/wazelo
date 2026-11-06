import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import {
  GroupWaCheckJobData,
  GroupWhatsAppCheckUseCase,
} from '@/modules/lead-scraper/application/use-cases/group-whatsapp-check.use-case';
import { QUEUE_NAMES } from '@/common/constants';

@Injectable()
export class GroupWaCheckWorker implements OnModuleInit {
  private readonly logger = new Logger(GroupWaCheckWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly groupCheck: GroupWhatsAppCheckUseCase,
  ) {}

  async onModuleInit() {
    // One lookup per job; each job queues the next. The shared per-number
    // throttle keeps parallel group and lead-scraper checks within safe limits.
    await this.queueService.subscribeConcurrent<GroupWaCheckJobData>(
      QUEUE_NAMES.GROUP_WA_CHECK,
      async (job) => this.groupCheck.step(job.data),
      2,
    );
    this.logger.log('GroupWaCheckWorker subscribed to group-wa-check queue');
  }
}
