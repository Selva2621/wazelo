import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SendRenewalRemindersUseCase } from '@/modules/billing/application/use-cases/send-renewal-reminders.use-case';

/** Paid plans are not auto-renewed: "your plan ends in N days, renew now" every day at 10:00 IST. */
@Injectable()
export class RenewalReminderWorker {
  private readonly logger = new Logger(RenewalReminderWorker.name);

  constructor(private readonly reminders: SendRenewalRemindersUseCase) {}

  @Cron('0 30 4 * * *')
  async run(): Promise<void> {
    try {
      await this.reminders.execute();
    } catch (error) {
      this.logger.error('Renewal reminders failed', error instanceof Error ? error.stack : String(error));
    }
  }
}
