import { Injectable } from '@nestjs/common';
import { SEND_SAFETY_CONFIG } from '@/common/constants';

export type SendLane = 'direct' | 'bulk';

export interface PaceDecision {
  /** Epoch ms this message may be sent at */
  sendAt: number;
  /** ms to wait from now (0 = send immediately) */
  waitMs: number;
}

interface SessionPace {
  /** Earliest time the next inbox reply may go out on this number */
  nextDirectAt: number;
  /** Earliest time the next bulk message may go out on this number */
  nextBulkAt: number;
}

/**
 * Spaces sends on one WhatsApp number to human pace.
 *
 * Every send reserves a slot: the caller either waits inline (short waits) or
 * re-queues the job to run at `sendAt`, passing `sendAt` back as its slot so
 * it isn't reserved twice. Bulk messages (campaigns, sequences) get a long
 * random gap; direct inbox replies only a short one.
 *
 * In-memory is fine: there is a single backend instance.
 */
@Injectable()
export class SendPacerService {
  private readonly pace = new Map<string, SessionPace>();

  laneFor(priority: number | null | undefined): SendLane {
    return (priority ?? 0) < 0 ? 'bulk' : 'direct';
  }

  /**
   * Reserve the next send slot for a session. Synchronous, so concurrent workers
   * can't take the same slot.
   *
   * The lanes are separate: bulk slots reserved far ahead never delay an inbox
   * reply, while a reply pushes the next bulk message back a little so the two
   * don't go out back-to-back.
   */
  reserve(sessionId: string, lane: SendLane, now = Date.now()): PaceDecision {
    const state = this.pace.get(sessionId) ?? { nextDirectAt: 0, nextBulkAt: 0 };
    const directGap = this.randomBetween(
      SEND_SAFETY_CONFIG.DIRECT_GAP_MIN_MS,
      SEND_SAFETY_CONFIG.DIRECT_GAP_MAX_MS,
    );

    let sendAt: number;
    if (lane === 'direct') {
      sendAt = Math.max(now, state.nextDirectAt);
      state.nextDirectAt = sendAt + directGap;
      state.nextBulkAt = Math.max(state.nextBulkAt, sendAt + directGap);
    } else {
      sendAt = Math.max(now, state.nextBulkAt);
      state.nextBulkAt = sendAt + this.randomBetween(
        SEND_SAFETY_CONFIG.BULK_GAP_MIN_MS,
        SEND_SAFETY_CONFIG.BULK_GAP_MAX_MS,
      );
    }
    this.pace.set(sessionId, state);

    return { sendAt, waitMs: sendAt - now };
  }

  /** Forget a session's pacing (number disconnected). */
  reset(sessionId: string): void {
    this.pace.delete(sessionId);
  }

  typingDelayMs(): number {
    return this.randomBetween(SEND_SAFETY_CONFIG.TYPING_MIN_MS, SEND_SAFETY_CONFIG.TYPING_MAX_MS);
  }

  private randomBetween(min: number, max: number): number {
    return Math.round(min + Math.random() * (max - min));
  }
}
