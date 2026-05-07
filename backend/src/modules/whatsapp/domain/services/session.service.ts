import { Injectable, Logger } from '@nestjs/common';
import { WHATSAPP_CONFIG } from '@/common/constants';

@Injectable()
export class WhatsAppSessionService {
  private readonly logger = new Logger(WhatsAppSessionService.name);

  isHeartbeatStale(lastHeartbeatAt: Date | null): boolean {
    if (!lastHeartbeatAt) return true;
    const elapsed = Date.now() - lastHeartbeatAt.getTime();
    return elapsed > WHATSAPP_CONFIG.DISCONNECT_DETECTION_TIMEOUT_MS;
  }

  canRetryReconnect(reconnectCount: number): boolean {
    return reconnectCount < WHATSAPP_CONFIG.MAX_RECONNECT_ATTEMPTS;
  }

  getReconnectDelayMs(attempt: number): number {
    // Exponential backoff: 5s, 10s, 20s
    return WHATSAPP_CONFIG.RECONNECT_DELAY_MS * Math.pow(2, attempt);
  }

  shouldAutoRefreshQr(qrExpiresAt: Date): boolean {
    return Date.now() >= qrExpiresAt.getTime();
  }

  validateSessionOwnership(
    sessionUserId: string,
    requestUserId: string,
    requestUserRole: string,
  ): boolean {
    // Admins can manage any session in their org; others only their own
    if (requestUserRole === 'ADMIN') return true;
    return sessionUserId === requestUserId;
  }
}
