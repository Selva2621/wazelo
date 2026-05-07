import { Injectable, Logger } from '@nestjs/common';
import { MessageRepository } from '../../infrastructure/repositories/message.repository';
import { MESSAGING_CONFIG } from '@/common/constants';

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds to wait before retrying if rate-limited */
  retryAfterSeconds: number;
  /** Current count within the window */
  currentCount: number;
  /** Maximum allowed in the window */
  maxAllowed: number;
  /** Which limit was hit */
  limitType?: 'session' | 'org';
}

/**
 * Sliding-window rate limiter for outbound messages.
 * Enforces both per-session and per-org limits using DB counts.
 *
 * Design decisions:
 * - Uses DB-based counting (not Redis) to stay consistent with pg-boss architecture
 * - Checks session limit first (more granular), then org limit
 * - Burst multiplier allows short spikes above sustained rate
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  constructor(private readonly messageRepo: MessageRepository) {}

  /**
   * Check if a message can be sent for the given session + org.
   * Returns { allowed, retryAfterSeconds } — caller decides to queue or reject.
   */
  async checkLimit(sessionId: string, orgId: string): Promise<RateLimitResult> {
    const windowMs = 60_000; // 1 minute window

    // Check per-session limit
    const sessionCount = await this.messageRepo.countRecentBySession(
      sessionId,
      windowMs,
    );
    const sessionMax =
      MESSAGING_CONFIG.RATE_LIMIT_PER_SESSION_PER_MINUTE *
      MESSAGING_CONFIG.RATE_LIMIT_BURST_MULTIPLIER;

    if (sessionCount >= sessionMax) {
      const retryAfter = this.calculateRetryAfter(sessionCount, sessionMax);
      this.logger.warn(
        `Session ${sessionId} rate limited: ${sessionCount}/${sessionMax} per minute`,
      );
      return {
        allowed: false,
        retryAfterSeconds: retryAfter,
        currentCount: sessionCount,
        maxAllowed: sessionMax,
        limitType: 'session',
      };
    }

    // Check per-org limit
    const orgCount = await this.messageRepo.countRecentByOrg(orgId, windowMs);
    const orgMax =
      MESSAGING_CONFIG.RATE_LIMIT_PER_ORG_PER_MINUTE *
      MESSAGING_CONFIG.RATE_LIMIT_BURST_MULTIPLIER;

    if (orgCount >= orgMax) {
      const retryAfter = this.calculateRetryAfter(orgCount, orgMax);
      this.logger.warn(
        `Org ${orgId} rate limited: ${orgCount}/${orgMax} per minute`,
      );
      return {
        allowed: false,
        retryAfterSeconds: retryAfter,
        currentCount: orgCount,
        maxAllowed: orgMax,
        limitType: 'org',
      };
    }

    return {
      allowed: true,
      retryAfterSeconds: 0,
      currentCount: sessionCount,
      maxAllowed: sessionMax,
    };
  }

  /**
   * Calculate recommended retry delay when rate-limited.
   * Uses ratio of current vs max to determine how long to wait.
   */
  private calculateRetryAfter(current: number, max: number): number {
    // If way over limit, wait longer
    const overageRatio = current / max;
    if (overageRatio >= 2) return 60;
    if (overageRatio >= 1.5) return 30;
    return 10;
  }
}
