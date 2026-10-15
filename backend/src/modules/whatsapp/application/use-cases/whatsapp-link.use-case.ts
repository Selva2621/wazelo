import {
  Injectable,
  BadRequestException,
  ConflictException,
  GoneException,
} from '@nestjs/common';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { WhatsAppLinkTokenService } from '../services/whatsapp-link-token.service';
import { ReconnectSessionUseCase } from './reconnect-session.use-case';
import { RequestPairingCodeUseCase } from './request-pairing-code.use-case';
import { OrgStatusService } from '@/modules/org/domain/services/org-status.service';
import { orgSuspendedException } from '@/modules/org/interfaces/guards/org-status.guard';

export type WhatsAppLinkState =
  | 'connected'
  | 'reconnecting'
  /** Creds intact — one tap reconnects */
  | 'reconnectable'
  /** A pairing code is waiting to be entered in WhatsApp */
  | 'pairing'
  /** Creds wiped — needs a new pairing code */
  | 'needs_pairing'
  /** Number blocked by WhatsApp — nothing to do from the link */
  | 'blocked';

/**
 * "Reconnect from your phone" — the public, login-free page behind the link in
 * disconnect emails. The token is bound to one user's session, and pairing
 * always uses that session's own number.
 */
@Injectable()
export class WhatsAppLinkUseCase {
  constructor(
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly connectionManager: BaileysConnectionManager,
    private readonly tokenService: WhatsAppLinkTokenService,
    private readonly reconnectSessionUseCase: ReconnectSessionUseCase,
    private readonly requestPairingCodeUseCase: RequestPairingCodeUseCase,
    private readonly orgStatus: OrgStatusService,
  ) {}

  async getStatus(token: string) {
    const { origin, current } = await this.resolve(token);
    const state = this.stateOf(current);
    return {
      state,
      phoneNumber: maskPhone(current.phoneNumber ?? origin.phoneNumber),
      pairingCode: state === 'pairing' ? this.connectionManager.getPairingCode(current.id) : null,
    };
  }

  async reconnect(token: string, ipAddress: string, userAgent: string) {
    const { payload, current } = await this.resolve(token);
    if (this.stateOf(current) !== 'reconnectable') {
      throw new ConflictException('This session cannot be reconnected — refresh the page');
    }
    await this.reconnectSessionUseCase.execute(
      payload.orgId,
      payload.userId,
      'EMPLOYEE',
      current.id,
      ipAddress,
      userAgent,
    );
    return { state: 'reconnecting' as WhatsAppLinkState };
  }

  async requestPairingCode(token: string, ipAddress: string, userAgent: string) {
    const { payload, origin, current } = await this.resolve(token);
    const state = this.stateOf(current);
    if (state !== 'needs_pairing' && state !== 'pairing') {
      throw new ConflictException('This session does not need a new code — refresh the page');
    }
    const phoneNumber = origin.phoneNumber ?? current.phoneNumber;
    if (!phoneNumber) {
      throw new BadRequestException('No number on record — open Wazelo to link WhatsApp');
    }

    const result = await this.requestPairingCodeUseCase.execute(
      payload.orgId,
      payload.userId,
      { phoneNumber },
      ipAddress,
      userAgent,
    );
    return { state: 'pairing' as WhatsAppLinkState, pairingCode: result.pairingCode };
  }

  private async resolve(token: string) {
    const payload = await this.tokenService.verify(token);
    if (!payload) throw new GoneException('This link is invalid or has expired');
    // Public route — the global org-status guard skips it, so check here
    if (await this.orgStatus.isSuspended(payload.orgId)) throw orgSuspendedException();

    const origin = await this.sessionRepo.findByIdAndOrg(payload.sessionId, payload.orgId);
    if (!origin || origin.userId !== payload.userId) {
      throw new GoneException('This link is invalid or has expired');
    }
    // A later session (e.g. linked again after this email) is what the user cares about now
    const current = (await this.sessionRepo.findAnyByUserId(payload.userId, payload.orgId)) ?? origin;
    return { payload, origin, current };
  }

  private stateOf(session: {
    id: string;
    status: string;
    encryptedCreds: string | null;
    disconnectReason: string | null;
  }): WhatsAppLinkState {
    switch (session.status) {
      case 'CONNECTED':
        return 'connected';
      case 'RECONNECTING':
        return 'reconnecting';
      case 'CONNECTING':
        // A QR started in the app has no code to show — a fresh code takes it over
        return this.connectionManager.getPairingCode(session.id) ? 'pairing' : 'needs_pairing';
      default:
        if (session.disconnectReason === 'BANNED') return 'blocked';
        return session.encryptedCreds ? 'reconnectable' : 'needs_pairing';
    }
  }
}

/** +919876543210 → +91 ••••• 3210 */
function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  return `${phone.slice(0, 3)} ••••• ${phone.slice(-4)}`;
}
