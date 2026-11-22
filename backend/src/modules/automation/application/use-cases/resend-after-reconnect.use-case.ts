import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';
import { AutomationRepository } from '../../infrastructure/repositories/automation.repository';
import { RESEND_WINDOW_MS, resendFromStep } from '../../domain/services/resend-after-reconnect';

/**
 * A WhatsApp number connected: rule runs whose message failed because the org had
 * no connected number (in the last 24 hours) run again once, from that step.
 */
@Injectable()
export class ResendAfterReconnectUseCase {
  private readonly logger = new Logger(ResendAfterReconnectUseCase.name);

  constructor(
    private readonly automationRepo: AutomationRepository,
    private readonly queueService: QueueService,
  ) {}

  async execute(orgId: string, now = new Date()): Promise<number> {
    const failed = await this.automationRepo.findFailedNotResent(orgId, new Date(now.getTime() - RESEND_WINDOW_MS));
    let resent = 0;
    for (const run of failed) {
      const startAtAction = resendFromStep(run.actionResults);
      if (startAtAction === null) continue;
      // One resend per run, even if the number reconnects twice in a row
      if (!(await this.automationRepo.claimForResend(run.id))) continue;
      await this.queueService.publishOnce(
        QUEUE_NAMES.AUTOMATION_EVALUATE,
        {
          executionId: run.id,
          ruleId: run.ruleId,
          orgId,
          contactId: run.contactId ?? undefined,
          depth: 0,
          startAtAction,
        },
        `auto-resend-${run.id}`,
      );
      resent++;
    }
    if (resent) this.logger.log(`Resending ${resent} automation run(s) for org ${orgId} after a number connected`);
    return resent;
  }
}
