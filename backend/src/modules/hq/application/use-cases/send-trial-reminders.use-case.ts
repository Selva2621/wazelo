import { Injectable, Logger } from '@nestjs/common';
import { HqLeadsRepository } from '../../infrastructure/repositories/hq-leads.repository';
import { TRIAL_REMINDER_DAYS } from '../../domain/services/platform-alerts';
import { SendPlatformAlertUseCase } from './send-platform-alert.use-case';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily: WhatsApp "your trial ends in N days" from Wazelo HQ, 3 days and 1 day before.
 * Each trial gets each reminder once (idempotent per subscription + N).
 */
@Injectable()
export class SendTrialRemindersUseCase {
  private readonly logger = new Logger(SendTrialRemindersUseCase.name);

  constructor(
    private readonly repo: HqLeadsRepository,
    private readonly alerts: SendPlatformAlertUseCase,
  ) {}

  async execute(now = new Date()): Promise<number> {
    if (!(await this.repo.findHqId())) return 0;
    let sent = 0;
    for (const days of TRIAL_REMINDER_DAYS) {
      // Trials ending on that calendar day (UTC)
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + days * DAY_MS);
      const to = new Date(from.getTime() + DAY_MS);
      for (const trial of await this.repo.trialsEndingBetween(from, to)) {
        const detail = days === 1 ? '1 day' : `${days} days`;
        const outcome = await this.alerts.execute('trial_ending', trial.orgId, `${trial.id}:${days}d`, detail);
        if (outcome === 'sent') sent++;
      }
    }
    if (sent) this.logger.log(`Sent ${sent} trial-ending reminder(s) from Wazelo HQ`);
    return sent;
  }
}
