import { Injectable } from '@nestjs/common';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { WhatsAppCheckThrottleService } from '../../domain/services/whatsapp-check-throttle.service';

export interface CheckWhatsAppResult {
  phone: string;
  exists: boolean | null;
  reason?: 'no_session' | 'rate_limited';
  cached?: boolean;
}

@Injectable()
export class CheckWhatsAppUseCase {
  constructor(
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly baileysManager: BaileysConnectionManager,
    private readonly throttle: WhatsAppCheckThrottleService,
  ) {}

  async execute(orgId: string, phone: string): Promise<CheckWhatsAppResult> {
    const cached = this.throttle.getCached(phone);
    if (cached !== undefined) {
      return { phone, exists: cached, cached: true };
    }

    const session = await this.sessionRepo.findAnyActiveByOrgId(orgId);
    if (!session) {
      return { phone, exists: null, reason: 'no_session' };
    }

    if (!this.throttle.tryAcquire(session.id)) {
      return { phone, exists: null, reason: 'rate_limited' };
    }

    const exists = await this.baileysManager.checkWhatsApp(session.id, phone);
    if (exists !== null) this.throttle.remember(phone, exists);
    return { phone, exists };
  }
}
