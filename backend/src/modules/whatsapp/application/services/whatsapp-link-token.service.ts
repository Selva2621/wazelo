import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'crypto';
import { WHATSAPP_CONFIG } from '@/common/constants';

export interface WhatsAppLinkTokenPayload {
  sessionId: string;
  userId: string;
  orgId: string;
}

/**
 * Signs/verifies the "reconnect from your phone" link sent when a session drops.
 * It only lets the holder reconnect or re-link the session's own number, so a
 * leaked link can't attach a different WhatsApp account. The key is derived
 * from the refresh-token secret for this purpose only.
 */
@Injectable()
export class WhatsAppLinkTokenService {
  private readonly secret: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    const base = config.getOrThrow<string>('jwt.refreshSecret');
    this.secret = createHmac('sha256', base).update('wazelo:whatsapp-link:v1').digest('hex');
  }

  sign(payload: WhatsAppLinkTokenPayload): Promise<string> {
    return this.jwt.signAsync(
      { sid: payload.sessionId, sub: payload.userId, org: payload.orgId, typ: 'wa_link' },
      { secret: this.secret, expiresIn: WHATSAPP_CONFIG.LINK_TOKEN_TTL_SECONDS, algorithm: 'HS256' },
    );
  }

  /** Null when tampered with, expired or malformed. */
  async verify(token: string): Promise<WhatsAppLinkTokenPayload | null> {
    try {
      const p = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        secret: this.secret,
        algorithms: ['HS256'],
      });
      if (p.typ !== 'wa_link') return null;
      if (typeof p.sid !== 'string' || typeof p.sub !== 'string' || typeof p.org !== 'string') return null;
      return { sessionId: p.sid, userId: p.sub, orgId: p.org };
    } catch {
      return null;
    }
  }
}
