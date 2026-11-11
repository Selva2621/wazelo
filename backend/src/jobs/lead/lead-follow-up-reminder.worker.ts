import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  RemindDueLeadsUseCase,
  SendDailySummariesUseCase,
} from '@/modules/lead-follow-ups/application/use-cases/lead-follow-up.use-cases';

/**
 * Every minute: remind people about leads they were given and haven't contacted in time.
 * Every 10 minutes: send brand managers their day-end summary once it's past 7 PM their time.
 */
@Injectable()
export class LeadFollowUpReminderWorker {
  private readonly logger = new Logger(LeadFollowUpReminderWorker.name);
  private running = false;
  private summarising = false;

  constructor(
    private readonly remindDue: RemindDueLeadsUseCase,
    private readonly dailySummaries: SendDailySummariesUseCase,
  ) {}

  @Cron('30 */10 * * * *')
  async summaries(): Promise<void> {
    if (this.summarising) return;
    this.summarising = true;
    try {
      await this.dailySummaries.execute();
    } catch (error) {
      this.logger.error(`Day-end summary run failed: ${(error as Error).message}`);
    } finally {
      this.summarising = false;
    }
  }

  @Cron('0 * * * * *')
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.remindDue.execute();
    } catch (error) {
      this.logger.error(`Lead reminder run failed: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
