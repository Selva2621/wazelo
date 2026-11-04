import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';
import { wantsHuman } from '@/modules/chatbot/domain/services/handoff-intent';
import { MISSES_BEFORE_HANDOFF } from '@/modules/chatbot/application/services/bot-behavior.service';
import { WebsiteChatRepository } from '../../infrastructure/repositories/website-chat.repository';
import { WebsiteHandoffService } from '../services/website-handoff.service';
import { WebsiteChatUseCase, hasDetails } from './website-chat.use-case';
import { CHAT_EVENT, CHAT_STATE, NOT_FOUND_MESSAGE } from '../../domain/services/website-chat';

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
    private readonly chats: WebsiteChatRepository,
    private readonly handoff: WebsiteHandoffService,
    private readonly websiteChat: WebsiteChatUseCase,
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

    // No chat before the visitor gave first name, mobile and email (the form before the chat)
    const withDetails = (await this.chats.findSession(session.id, orgId)) ?? session;
    if (!hasDetails(withDetails)) throw new BadRequestException('Fill in your name, mobile number and email to start the chat');

    // Writing again after the chat ended starts it over with the AI
    if (session.state === CHAT_STATE.ENDED) await this.websiteChat.reopen(orgId, session.id);
    await this.handoff.scheduleIdleCheck(orgId, session.id);

    // Save the visitor message
    const message = await this.widgetRepository.addMessage(
      session.id,
      orgId,
      'visitor',
      dto.body,
    );
    await this.widgetRepository.touch(session.id);

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

    const base = { messageId: message.id, sessionId: session.id, createdAt: message.createdAt };
    const current = await this.websiteChat.visitorState(orgId, session.id);
    const state = current?.state ?? CHAT_STATE.AI;

    // Waiting for a person, or a person has the chat: the AI stays out of it
    if (state !== CHAT_STATE.AI) {
      this.handoff.activity(orgId, session.id);
      return { ...base, agentReply: undefined, chat: current };
    }

    // "Talk to a person", "aal kitta pesanum", …: straight to the team (no AI, no credits)
    if (wantsHuman(dto.body)) {
      const outcome = await this.handoff.request(orgId, session.id, 'ASKED_FOR_PERSON');
      return { ...base, agentReply: this.reply(outcome.message), chat: await this.websiteChat.visitorState(orgId, session.id) };
    }

    // AI assistant: generate reply using org's KB and product data
    let agentReply: { messageId: string; body: string; createdAt: Date } | undefined;
    // Older chats a person answered before chats could be "taken": the AI stays quiet
    // for the org's bot pause time after their last reply, like the WhatsApp bot does
    const teamHandling =
      config.aiAssistantEnabled &&
      (await this.widgetRepository.teamRepliedSince(
        session.id,
        new Date(Date.now() - (await this.widgetRepository.botPauseHours(orgId)) * 3_600_000),
      ));
    // Out of AI credits (or AI not on the plan), or over a reply limit: no auto-reply, a person answers
    const done = config.aiAssistantEnabled && !teamHandling
      ? this.trail.start({ orgId, channel: 'WIDGET', widgetSessionId: session.id })
      : null;
    const affordable = !!done && (await this.aiCredits.canAfford(orgId, 'widget_reply'));
    if (done && !affordable) {
      done({ outcome: AiReplyOutcome.NO_CREDITS });
      await this.handoff.record(orgId, session.id, CHAT_EVENT.AI_SKIPPED, { type: 'ai' }, { reason: 'NO_CREDITS' });
      // Nobody else would answer: the team is called in
      const outcome = await this.handoff.request(orgId, session.id, 'UNANSWERED');
      return { ...base, agentReply: this.reply(outcome.message), chat: await this.websiteChat.visitorState(orgId, session.id) };
    }
    const overLimit = affordable ? this.overReplyLimit(orgId, session.id, ip) : null;
    if (done && overLimit) {
      done({ outcome: AiReplyOutcome.LIMITED, reason: overLimit });
      await this.handoff.record(orgId, session.id, CHAT_EVENT.AI_SKIPPED, { type: 'ai' }, { reason: 'LIMIT', limit: overLimit });
    }

    if (done && affordable && !overLimit) {
      try {
        // The chat so far, like the WhatsApp bot reads it. Tone and rules come from the
        // AI assistant's shared instructions (in the business profile), same as WhatsApp.
        const chat = (await this.widgetRepository.findRecentMessages(session.id, orgId)).map((m) => ({
          fromVisitor: m.sender === 'visitor',
          body: sanitizePromptInput(m.body, 1000),
        }));
        const ragResult = await this.kbRagSearch.execute(dto.body, orgId, null, {
          conversation: chat.map((m) => `${m.fromVisitor ? 'Customer' : 'Agent'}: ${m.body}`).join('\n'),
          teamText: chat.filter((m) => !m.fromVisitor).map((m) => m.body).join('\n'),
        });
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
          // "bot", not "agent": the team's own replies are told apart from the AI's
          const agentMsg = await this.widgetRepository.addMessage(
            session.id,
            orgId,
            'bot',
            ragResult.answer,
          );
          agentReply = {
            messageId: agentMsg.id,
            body: ragResult.answer,
            createdAt: agentMsg.createdAt,
          };
          await this.chats.clearMisses(session.id);
          await this.handoff.record(orgId, session.id, CHAT_EVENT.AI_ANSWERED, { type: 'ai' }, {
            messageId: agentMsg.id,
            confidence: ragResult.confidence,
            sources: ragResult.sources.length,
          });
          this.logger.log(
            `AI reply generated for session=${session.id} confidence=${ragResult.confidence}`,
          );
        } else if (ragResult.blocked) {
          // The reply check stopped it (likely a prompt injection): a person answers
          done({ outcome: AiReplyOutcome.BLOCKED, reason: ragResult.blocked, ...usage });
          await this.handoff.record(orgId, session.id, CHAT_EVENT.AI_BLOCKED, { type: 'ai' }, { reason: ragResult.blocked });
          const outcome = await this.handoff.request(orgId, session.id, 'UNANSWERED');
          agentReply = this.reply(outcome.message);
        } else {
          // Not in the knowledge base: shows up in the owner's unanswered questions
          done({ outcome: AiReplyOutcome.NOT_FOUND, ...usage });
          await this.kbMisses.record(orgId, dto.body, 'WIDGET');
          const streak = await this.chats.addMiss(session.id);
          await this.handoff.record(orgId, session.id, CHAT_EVENT.AI_NOT_FOUND, { type: 'ai' }, { streak });
          if (streak >= MISSES_BEFORE_HANDOFF) {
            // Two in a row: a person takes over
            const outcome = await this.handoff.request(orgId, session.id, 'UNANSWERED');
            agentReply = this.reply(outcome.message);
          } else {
            // Never silence: the visitor hears that the team will check
            agentReply = this.reply(await this.handoff.say(orgId, session.id, NOT_FOUND_MESSAGE));
          }
        }
      } catch (err) {
        // Non-fatal: the visitor message was already saved; the failure is on the chat's timeline
        done({ outcome: AiReplyOutcome.FAILED });
        await this.handoff.recordFailure(orgId, session.id, 'ai-reply', err);
        agentReply = this.reply(await this.handoff.say(orgId, session.id, NOT_FOUND_MESSAGE));
      }
    }

    this.handoff.activity(orgId, session.id);
    return { ...base, agentReply, chat: await this.websiteChat.visitorState(orgId, session.id) };
  }

  private reply(m: { id: string; body: string; createdAt: Date } | null) {
    return m ? { messageId: m.id, body: m.body, createdAt: m.createdAt } : undefined;
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
