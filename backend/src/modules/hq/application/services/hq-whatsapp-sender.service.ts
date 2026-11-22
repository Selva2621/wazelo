import { Injectable } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { renderCloudTemplate } from '@/shared/utils/cloud-template';
import { OutboundMessageService } from '@/modules/messages/application/services/outbound-message.service';
import { HqLeadsRepository } from '../../infrastructure/repositories/hq-leads.repository';
import { OTP_TEMPLATE } from '../../domain/services/whatsapp-otp';

/**
 * Sends a 6-digit code from Wazelo HQ's WhatsApp number (template
 * `wazelo_verification_code`, {{1}} = the code). Used by "Sign in with WhatsApp code".
 */
@Injectable()
export class HqWhatsappSender {
  constructor(
    private readonly repo: HqLeadsRepository,
    private readonly outbound: OutboundMessageService,
  ) {}

  /** HQ has a connected number and a code template it can send */
  async ready(): Promise<boolean> {
    return !!(await this.sender());
  }

  /** False when HQ can't send right now (no number or no sendable template) */
  async sendCode(phone: string, code: string, idempotencyKey: string): Promise<boolean> {
    const sender = await this.sender();
    if (!sender) return false;
    const rendered = renderCloudTemplate(sender.template, [code], (t) => t);
    await this.outbound.send({
      orgId: sender.hqId,
      sessionId: sender.sessionId,
      contactPhone: phone,
      body: rendered.body,
      type: MessageType.TEXT,
      idempotencyKey,
      // Official numbers send the approved template; QR numbers send the text
      metadata: { platformAlert: 'login_code', cloudTemplate: rendered.cloudTemplate },
    });
    return true;
  }

  private async sender() {
    const hqId = await this.repo.findHqId();
    if (!hqId) return null;
    const [sessionId, template] = await Promise.all([
      this.repo.findHqSessionId(hqId),
      this.repo.findSendableTemplate(hqId, OTP_TEMPLATE),
    ]);
    return sessionId && template ? { hqId, sessionId, template } : null;
  }
}
