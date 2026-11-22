import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HqLeadsRepository } from '../../infrastructure/repositories/hq-leads.repository';

/**
 * Wazelo HQ's alert and code templates are there by default: on startup, any that
 * are missing are created in HQ's Templates screen (a new HQ gets them when it is
 * created). Startup never fails because of this.
 */
@Injectable()
export class HqDefaultTemplatesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HqDefaultTemplatesService.name);

  constructor(private readonly repo: HqLeadsRepository) {}

  async onApplicationBootstrap() {
    try {
      const hqId = await this.repo.findHqId();
      if (!hqId) return;
      const created = await this.repo.seedDefaultTemplates(hqId);
      if (created.length) this.logger.log(`Created HQ templates: ${created.join(', ')}`);
    } catch (err) {
      this.logger.warn(`HQ default templates not created: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
