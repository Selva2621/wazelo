import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SendTrialRemindersUseCase } from '@/modules/hq/application/use-cases/send-trial-reminders.use-case';

/** Wazelo HQ → customers: "your trial ends soon" on WhatsApp, every day at 10:00 IST. */
@Injectable()
export class HqTrialReminderWorker {
  private readonly logger = new Logger(HqTrialReminderWorker.name);

  constructor(private readonly reminders: SendTrialRemindersUseCase) {}

  @Cron('0 30 4 * * *')
  async run(): Promise<void> {
    try {
      await this.reminders.execute();
    } catch (error) {
      this.logger.error('HQ trial reminders failed', error instanceof Error ? error.stack : String(error));
    }
  }
}
