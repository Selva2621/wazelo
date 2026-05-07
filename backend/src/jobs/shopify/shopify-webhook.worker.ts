import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { ProcessShopifyWebhookUseCase, ShopifyWebhookJob } from '@/modules/shopify/application/use-cases/process-shopify-webhook.use-case';
import { QUEUE_NAMES } from '@/common/constants';

@Injectable()
export class ShopifyWebhookWorker implements OnModuleInit {
  private readonly logger = new Logger(ShopifyWebhookWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly processUseCase: ProcessShopifyWebhookUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribeConcurrent<ShopifyWebhookJob>(
      QUEUE_NAMES.PROCESS_SHOPIFY_WEBHOOK,
      async (job) => this.handle(job.data, job.id),
      5,
    );

    this.logger.log('ShopifyWebhookWorker subscribed');
  }

  private async handle(data: ShopifyWebhookJob, jobId: string): Promise<void> {
    this.logger.debug(
      `Processing Shopify webhook: event=${data.event} org=${data.orgId} job=${jobId}`,
    );

    try {
      await this.processUseCase.execute(data);
    } catch (error) {
      this.logger.error(
        `Shopify webhook processing failed: event=${data.event} org=${data.orgId} job=${jobId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error; // Let pg-boss handle retry
    }
  }
}
