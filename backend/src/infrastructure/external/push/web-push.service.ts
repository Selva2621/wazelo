import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Path opened when the notification is clicked */
  url: string;
  /** Same tag replaces an earlier notification instead of stacking */
  tag?: string;
}

/** 'gone' = the browser dropped the subscription; the caller should delete it */
export type PushResult = 'sent' | 'gone';

/** Sends Web Push messages signed with the server's VAPID keys. */
@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly publicKey: string;
  private readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.publicKey = config.get<string>('push.vapidPublicKey') ?? '';
    const privateKey = config.get<string>('push.vapidPrivateKey') ?? '';
    this.enabled = Boolean(this.publicKey && privateKey);

    if (this.enabled) {
      webpush.setVapidDetails(
        config.get<string>('push.vapidSubject') ?? 'mailto:hello@wazelo.in',
        this.publicKey,
        privateKey,
      );
    } else {
      this.logger.warn('VAPID keys not set — browser push notifications are off');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getPublicKey(): string | null {
    return this.enabled ? this.publicKey : null;
  }

  async send(target: PushTarget, payload: PushPayload): Promise<PushResult> {
    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24, urgency: 'high' },
      );
      return 'sent';
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) return 'gone';
      throw error;
    }
  }
}
