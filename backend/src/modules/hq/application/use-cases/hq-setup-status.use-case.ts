import { Injectable } from '@nestjs/common';
import { HqLeadsRepository } from '../../infrastructure/repositories/hq-leads.repository';
import { PLATFORM_ALERTS, PlatformAlertKey } from '../../domain/services/platform-alerts';
import { OTP_TEMPLATE } from '../../domain/services/whatsapp-otp';

/**
 * What Wazelo HQ still needs before it can WhatsApp customers: a connected number
 * and, per alert, a template with the expected name it can send (QR: any not rejected; official number: Meta-approved).
 */
@Injectable()
export class HqSetupStatusUseCase {
  constructor(private readonly repo: HqLeadsRepository) {}

  async execute(hqId: string) {
    const names = [...Object.values(PLATFORM_ALERTS).map((a) => a.template), OTP_TEMPLATE];
    const [sessionId, sendable] = await Promise.all([
      this.repo.findHqSessionId(hqId),
      this.repo.sendableTemplateNames(hqId, names),
    ]);
    return {
      whatsappConnected: !!sessionId,
      alerts: [
        ...(Object.keys(PLATFORM_ALERTS) as PlatformAlertKey[]).map((key) => ({
          key,
          label: PLATFORM_ALERTS[key].label,
          template: PLATFORM_ALERTS[key].template,
          ready: sendable.has(PLATFORM_ALERTS[key].template),
        })),
        {
          key: 'verification_code',
          label: 'Sign-up WhatsApp verification code',
          template: OTP_TEMPLATE,
          ready: sendable.has(OTP_TEMPLATE),
        },
      ],
    };
  }
}
