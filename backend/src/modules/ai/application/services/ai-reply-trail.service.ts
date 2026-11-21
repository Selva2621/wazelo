import { Injectable, Logger } from '@nestjs/common';
import { AiReplyOutcome } from '@prisma/client';
import { AiReplyLogRepository } from '../../infrastructure/repositories/ai-reply-log.repository';

export interface TrailStart {
  orgId: string;
  channel: 'WHATSAPP' | 'WIDGET';
  conversationId?: string;
  widgetSessionId?: string;
  flowId?: string;
}

export interface TrailEnd {
  outcome: AiReplyOutcome;
  reason?: string;
  model?: string;
  tokens?: number;
  charged?: boolean;
  sourcesUsed?: number;
  confidence?: number;
}

/** Records the outcome once; later calls are ignored */
export type TrailRecorder = (end: TrailEnd) => void;

/**
 * The AI reply trail: one row per automatic bot decision, with what it cost and how
 * long it took, never the message text. Recording is fire-and-forget: it never
 * slows down or breaks a reply.
 */
@Injectable()
export class AiReplyTrailService {
  private readonly logger = new Logger(AiReplyTrailService.name);

  constructor(private readonly repo: AiReplyLogRepository) {}

  /** Earlier safety stops (blocked / limited) in this chat over the last `days` days; 0 if unknown */
  recentSafetyStops(orgId: string, conversationId: string, days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.repo.countSafetyStops(orgId, conversationId, since).catch(() => 0);
  }

  start(start: TrailStart): TrailRecorder {
    const startedAt = Date.now();
    let recorded = false;
    return (end) => {
      if (recorded) return;
      recorded = true;
      this.repo
        .create({
          ...start,
          outcome: end.outcome,
          reason: end.reason?.slice(0, 40),
          model: end.model?.slice(0, 100),
          tokens: end.tokens,
          charged: end.charged ?? false,
          sourcesUsed: end.sourcesUsed ?? 0,
          confidence: end.confidence,
          latencyMs: Date.now() - startedAt,
        })
        .catch((err) => this.logger.warn(`Couldn't record AI reply trail for org ${start.orgId}: ${(err as Error).message}`));
    };
  }
}
