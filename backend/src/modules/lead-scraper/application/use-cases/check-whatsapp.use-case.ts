import { Injectable } from '@nestjs/common';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';

export interface CheckWhatsAppResult {
  phone: string;
  exists: boolean | null;
  reason?: 'no_session';
}

@Injectable()
export class CheckWhatsAppUseCase {
  constructor(
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly baileysManager: BaileysConnectionManager,
  ) {}

  async execute(orgId: string, phone: string): Promise<CheckWhatsAppResult> {
    const session = await this.sessionRepo.findAnyActiveByOrgId(orgId);
    if (!session) {
      return { phone, exists: null, reason: 'no_session' };
    }
    const exists = await this.baileysManager.checkWhatsApp(session.id, phone);
    return { phone, exists };
  }
}
