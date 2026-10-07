import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';
import { assessMessagingHealth } from '../../domain/services/whatsapp-health';

const WINDOW_DAYS = 7;

/** WhatsApp sessions, channels and recent send outcomes for one org — support triage. */
@Injectable()
export class GetOrgMessagingHealthUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(orgId: string) {
    const org = await this.platformRepo.findOrgBasics(orgId);
    if (!org) throw new NotFoundException('Organization not found');

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const data = await this.platformRepo.findOrgMessagingHealth(orgId, since);

    const outboundTotal = Object.values(data.outboundByStatus).reduce((a, b) => a + b, 0);
    const outboundFailed = data.outboundByStatus.FAILED ?? 0;

    return {
      windowDays: WINDOW_DAYS,
      assessment: assessMessagingHealth({
        sessions: data.sessions,
        channels: data.channels,
        outboundTotal,
        outboundFailed,
      }),
      outbound: { total: outboundTotal, byStatus: data.outboundByStatus },
      failureReasons: data.failureReasons,
      sessions: data.sessions,
      channels: data.channels,
    };
  }
}
