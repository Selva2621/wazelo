import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WidgetRepository } from '../../infrastructure/repositories/widget.repository';
import { SendWidgetMessageDto } from '../dto/send-widget-message.dto';
import { EVENT_NAMES } from '@/common/constants';
import { KbRagSearchUseCase } from '@/modules/ai/application/use-cases/kb-rag-search.use-case';
import { AiCreditsService } from '@/modules/billing/domain/services/ai-credits.service';
import { KbMissRepository } from '@/modules/knowledge-base/infrastructure/repositories/kb-miss.repository';
import { AiReplyLimiterService, AI_REPLY_LIMITS } from '@/modules/ai/domain/services/ai-reply-limiter.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AiReplyOutcome, AuditAction } from '@prisma/client';
import { AiReplyTrailService } from '@/modules/ai/application/services/ai-reply-trail.service';

@Injectable()
export class SendWidgetMessageUseCase {
  private readonly logger = new Logger(SendWidgetMessageUseCase.name);

  constructor(
    private readonly widgetRepository: WidgetRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly kbRagSearch: KbRagSearchUseCase,
    private readonly aiCredits: AiCreditsService,
    private readonly kbMisses: KbMissRepository,
    private readonly limiter: AiReplyLimiterService,
    private readonly audit: AuditService,
    private readonly trail: AiReplyTrailService,
  ) {}

  async execute(orgSlug: string, dto: SendWidgetMessageDto, ip?: string) {
    const orgId = await this.widgetRepository.findOrgIdBySlug(orgSlug);
    if (!orgId) throw new NotFoundException('Widget not found');

    const config = await this.widgetRepository.findConfigByOrgId(orgId);
    if (!config?.enabled) throw new NotFoundException('Widget not found or disabled');

    // Find or create session for this visitor
    const session = await this.widgetRepository.findOrCreateSession({
      orgId,
      visitorId: dto.visitorId,
      pageUrl: dto.pageUrl,
    });

    // Persist visitor identity if provided (only sets missing fields)
    if (dto.visitorName || dto.visitorPhone || dto.visitorEmail) {
      await this.widgetRepository.updateSessionVisitor(session.id, orgId, {
        visitorName: dto.visitorName,
        visitorPhone: dto.visitorPhone,
        visitorEmail: dto.visitorEmail,
      });
    }

    // Save the visitor message
    const message = await this.widgetRepository.addMessage(
      session.id,
      orgId,
      'visitor',
      dto.body,
    );

    this.logger.log(
      `Widget message received: session=${session.id} org=${orgId}`,
    );

    // Emit event — automation / WA routing can hook here in future
    this.eventEmitter.emit(EVENT_NAMES.WIDGET_MESSAGE_RECEIVED, {
      orgId,
      sessionId: session.id,
      messageId: message.id,
      visitorId: dto.visitorId,
      visitorName: dto.visitorName,
      visitorPhone: dto.visitorPhone,
      body: dto.body,
      whatsappNumber: config.whatsappNumber,
    });

    // AI assistant: generate reply using org's KB and product data
    let agentReply: { messageId: string; body: string; createdAt: Date } | undefined;
    // Out of AI credits (or AI not on the plan), or over a reply limit: no auto-reply, a person answers
    const done = config.aiAssistantEnabled
      ? this.trail.start({ orgId, channel: 'WIDGET', widgetSessionId: session.id })
      : null;
    const affordable = !!done && (await this.aiCredits.canAfford(orgId, 'widget_reply'));
    if (done && !affordable) done({ outcome: AiReplyOutcome.NO_CREDITS });
    const overLimit = affordable ? this.overReplyLimit(orgId, session.id, ip) : null;
    if (done && overLimit) done({ outcome: AiReplyOutcome.LIMITED, reason: overLimit });

    if (done && affordable && !overLimit) {
      try {
        // The owner's "Custom instructions" from the widget settings shape the answer
        const ragResult = await this.kbRagSearch.execute(dto.body, orgId, config.aiSystemPrompt);
        const usage = { model: ragResult.usage?.model, tokens: ragResult.usage?.tokens };
        if (ragResult.answer) {
          await this.aiCredits.charge(orgId, 'widget_reply');
          done({
            outcome: AiReplyOutcome.ANSWERED,
            charged: true,
            sourcesUsed: ragResult.sources.length,
            confidence: ragResult.confidence,
            ...usage,
          });
          const agentMsg = await this.widgetRepository.addMessage(
            session.id,
            orgId,
            'agent',
            ragResult.answer,
          );
          agentReply = {
            messageId: agentMsg.id,
            body: ragResult.answer,
            createdAt: agentMsg.createdAt,
          };
          this.logger.log(
            `AI reply generated for session=${session.id} confidence=${ragResult.confidence}`,
          );
        } else if (ragResult.blocked) {
          // The reply check stopped it (likely a prompt injection): a person answers
          done({ outcome: AiReplyOutcome.BLOCKED, reason: ragResult.blocked, ...usage });
        } else {
          // Not in the knowledge base: shows up in the owner's unanswered questions
          done({ outcome: AiReplyOutcome.NOT_FOUND, ...usage });
          await this.kbMisses.record(orgId, dto.body, 'WIDGET');
        }
      } catch (err) {
        // Non-fatal: log and continue — visitor message was already saved
        done({ outcome: AiReplyOutcome.FAILED });
        this.logger.warn(
          `AI reply generation failed for session=${session.id}: ${(err as Error).message}`,
        );
      }
    }

    return {
      messageId: message.id,
      sessionId: session.id,
      createdAt: message.createdAt,
      agentReply,
    };
  }

  /**
   * The widget is public and its visitor id comes from the browser, so AI replies are
   * capped per session, per IP and per org: nobody can drain the org's AI credits.
   * Returns the limit that's full ("session" / "ip" / "org"), or null when within limits.
   */
  private overReplyLimit(orgId: string, sessionId: string, ip?: string): string | null {
    const result = this.limiter.tryTake([
      AI_REPLY_LIMITS.widgetSession(sessionId),
      ...(ip ? [AI_REPLY_LIMITS.widgetIp(ip)] : []),
      AI_REPLY_LIMITS.widgetOrg(orgId),
    ]);
    if (result.ok) return null;
    const scope = result.key.split(':')[1];
    if (result.firstBlock) {
      this.logger.warn(`Widget AI replies paused for org ${orgId}: ${scope} limit reached (session=${sessionId})`);
      void this.audit.log({
        orgId,
        action: AuditAction.AI_REPLY_LIMIT_REACHED,
        targetType: 'WidgetSession',
        targetId: sessionId,
        metadata: { channel: 'WIDGET', limit: scope },
        ipAddress: ip,
      });
    }
    return scope;
  }
}
