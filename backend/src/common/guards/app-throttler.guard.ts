import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'crypto';

/**
 * Global rate limit guard. Developer API calls are limited per API key, so
 * one integration can't use up the limit of others behind the same IP (and a
 * key can't dodge its limit by switching IPs). Everything else stays per IP.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const apiKey = req.headers?.['x-api-key'];
    if (typeof apiKey === 'string' && apiKey) {
      // Hash so raw keys never sit in the throttler's storage
      return `apikey:${createHash('sha256').update(apiKey).digest('hex')}`;
    }
    return super.getTracker(req);
  }
}
