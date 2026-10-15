import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeveloperApiRepository } from '@/modules/developer-api/infrastructure/repositories/developer-api.repository';
import { SettingsRepository } from '@/modules/settings/infrastructure/repositories/settings.repository';
import { SETTINGS_CONFIG } from '@/common/constants';

/** Days of Developer API request logs kept for Settings → API Logs. */
const API_REQUEST_LOG_RETENTION_DAYS = 30;

/** Prunes Developer API request logs and old webhook delivery logs once a day. */
@Injectable()
export class ApiLogCleanupWorker {
  private readonly logger = new Logger(ApiLogCleanupWorker.name);

  constructor(
    private readonly developerApiRepository: DeveloperApiRepository,
    private readonly settingsRepository: SettingsRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - API_REQUEST_LOG_RETENTION_DAYS * 86_400_000);
      const requestLogs = await this.developerApiRepository.deleteApiRequestLogsBefore(cutoff);
      const deliveries = await this.settingsRepository.deleteOldDeliveries(
        SETTINGS_CONFIG.WEBHOOK_DELIVERY_RETENTION_DAYS,
      );
      if (requestLogs + deliveries > 0) {
        this.logger.log(`Pruned ${requestLogs} API request logs and ${deliveries} webhook deliveries`);
      }
    } catch (error) {
      this.logger.error(
        'API log cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
