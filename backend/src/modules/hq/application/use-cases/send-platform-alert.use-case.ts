import { Injectable, Logger } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { renderCloudTemplate } from '@/shared/utils/cloud-template';
import { OutboundMessageService } from '@/modules/messages/application/services/outbound-message.service';
import { HqLeadsRepository } from '../../infrastructure/repositories/hq-leads.repository';
import { PLATFORM_ALERTS, PlatformAlertKey, alertIdempotencyKey } from '../../domain/services/platform-alerts';

export type AlertOutcome =
  | 'sent'
  | 'no_hq'
  | 'no_recipient'
  | 'no_consent'
  | 'no_hq_number'
  | 'no_template';

/**
 * Sends one Wazelo → customer WhatsApp alert from Wazelo HQ (its number, its approved
 * template, into the customer's HQ chat thread). Every missing piece is a quiet skip —
 * the email / in-app notice for the same event still goes, so nothing is lost.
 * `scope` makes it idempotent (e.g. the subscription id, or a day).
 */
@Injectable()
export class SendPlatformAlertUseCase {
  private readonly logger = new Logger(SendPlatformAlertUseCase.name);

  constructor(
    private readonly repo: HqLeadsRepository,
    private readonly outbound: OutboundMessageService,
  ) {}

  async execute(alert: PlatformAlertKey, customerOrgId: string, scope: string, detail = ''): Promise<AlertOutcome> {
    const hqId = await this.repo.findHqId();
    if (!hqId || hqId === customerOrgId) return 'no_hq';

    const to = await this.repo.alertRecipient(hqId, customerOrgId);
    if (!to) return 'no_recipient';
    if (!to.mayMessage) return 'no_consent';

    const sessionId = await this.repo.findHqSessionId(hqId);
    if (!sessionId) return this.skip(alert, 'no_hq_number');

    const template = await this.repo.findSendableTemplate(hqId, PLATFORM_ALERTS[alert].template);
    if (!template) return this.skip(alert, 'no_template');

    const rendered = renderCloudTemplate(template, [to.firstName, to.orgName, detail], (t) => t);
    await this.outbound.send({
      orgId: hqId,
      sessionId,
      contactPhone: to.phone,
      contactId: to.contactId,
      body: rendered.body,
      type: MessageType.TEXT,
      idempotencyKey: alertIdempotencyKey(alert, customerOrgId, scope),
      // Official numbers send the approved template; QR numbers send the text
      metadata: { platformAlert: alert, customerOrgId, cloudTemplate: rendered.cloudTemplate },
    });
    return 'sent';
  }

  private skip(alert: PlatformAlertKey, why: AlertOutcome): AlertOutcome {
    this.logger.debug(`Platform alert ${alert} skipped: ${why}`);
    return why;
  }
}
