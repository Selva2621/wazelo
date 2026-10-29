import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { ProcessShopifyWebhookUseCase, ShopifyWebhookJob } from '@/modules/shopify/application/use-cases/process-shopify-webhook.use-case';
import { KillSwitchService } from '@/modules/billing/domain/services/kill-switch.service';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
import { QUEUE_NAMES } from '@/common/constants';

/** While the Shopify kill switch is on, events are re-queued this often… */
const KILL_SWITCH_DEFER_SECONDS = 300;
/** …and dropped once they've waited this long (stale order/cart events). */
const KILL_SWITCH_MAX_DEFER_MS = 24 * 60 * 60 * 1000;

type DeferrableShopifyJob = ShopifyWebhookJob & { killSwitchDeferredSince?: string };

@Injectable()
export class ShopifyWebhookWorker implements OnModuleInit {
  private readonly logger = new Logger(ShopifyWebhookWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly processUseCase: ProcessShopifyWebhookUseCase,
    private readonly killSwitches: KillSwitchService,
    private readonly usageTracking: UsageTrackingService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribeConcurrent<DeferrableShopifyJob>(
      QUEUE_NAMES.PROCESS_SHOPIFY_WEBHOOK,
      async (job) => this.handle(job.data, job.id),
      5,
    );

    this.logger.log('ShopifyWebhookWorker subscribed');
  }

  private async handle(data: DeferrableShopifyJob, jobId: string): Promise<void> {
    this.logger.debug(
      `Processing Shopify webhook: event=${data.event} org=${data.orgId} job=${jobId}`,
    );

    if (await this.killSwitches.isDisabled('shopify')) {
      await this.deferWhileDisabled(data, jobId);
      return;
    }

    // A store connected before a downgrade stops triggering anything
    if (!(await this.usageTracking.isFeatureEnabled(data.orgId, 'shopify'))) {
      this.logger.log(`Shopify not in plan for org=${data.orgId} — skipping event=${data.event} job=${jobId}`);
      return;
    }

    try {
      const { killSwitchDeferredSince: _deferred, ...job } = data;
      await this.processUseCase.execute(job as ShopifyWebhookJob);
    } catch (error) {
      this.logger.error(
        `Shopify webhook processing failed: event=${data.event} org=${data.orgId} job=${jobId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error; // Let pg-boss handle retry
    }
  }

  /** Re-queue the event for later instead of failing it; give up after 24h. */
  private async deferWhileDisabled(data: DeferrableShopifyJob, jobId: string): Promise<void> {
    const since = data.killSwitchDeferredSince ?? new Date().toISOString();
    if (Date.now() - new Date(since).getTime() > KILL_SWITCH_MAX_DEFER_MS) {
      this.logger.warn(
        `Shopify kill switch on for over 24h — dropping event=${data.event} org=${data.orgId} job=${jobId}`,
      );
      return;
    }
    await this.queueService.publishDelayed(
      QUEUE_NAMES.PROCESS_SHOPIFY_WEBHOOK,
      { ...data, killSwitchDeferredSince: since },
      KILL_SWITCH_DEFER_SECONDS,
    );
    this.logger.log(
      `Shopify switched off platform-wide — deferred event=${data.event} org=${data.orgId} job=${jobId} by ${KILL_SWITCH_DEFER_SECONDS}s`,
    );
  }
}
