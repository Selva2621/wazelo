import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Signs webhook payloads using HMAC-SHA256 for delivery integrity verification.
 */
@Injectable()
export class WebhookSigningService {
  /**
   * Generate HMAC-SHA256 signature for a payload.
   * The receiving endpoint verifies: HMAC(secret, timestamp + '.' + body) === signature
   */
  sign(payload: string, secret: string, timestamp: number): string {
    const signedPayload = `${timestamp}.${payload}`;
    return crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');
  }

  /**
   * Verify a webhook signature.
   */
  verify(
    payload: string,
    secret: string,
    timestamp: number,
    signature: string,
  ): boolean {
    const expected = this.sign(payload, secret, timestamp);
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  }

  /**
   * Generate a random signing secret for new webhooks.
   */
  generateSecret(): string {
    return `whsec_${crypto.randomBytes(32).toString('hex')}`;
  }
}
