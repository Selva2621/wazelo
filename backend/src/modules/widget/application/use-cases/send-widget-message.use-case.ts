import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WidgetRepository } from '../../infrastructure/repositories/widget.repository';
import { SendWidgetMessageDto } from '../dto/send-widget-message.dto';
import { EVENT_NAMES } from '@/common/constants';
import { KbRagSearchUseCase } from '@/modules/ai/application/use-cases/kb-rag-search.use-case';
import { AiCreditsService } from '@/modules/billing/domain/services/ai-credits.service';
import { KbMissRepository } from '@/modules/knowledge-base/infrastructure/repositories/kb-miss.repository';

@Injectable()
export class SendWidgetMessageUseCase {
  private readonly logger = new Logger(SendWidgetMessageUseCase.name);

  constructor(
    private readonly widgetRepository: WidgetRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly kbRagSearch: KbRagSearchUseCase,
    private readonly aiCredits: AiCreditsService,
    private readonly kbMisses: KbMissRepository,
  ) {}

  async execute(orgSlug: string, dto: SendWidgetMessageDto) {
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
    // Out of AI credits (or AI not on the plan): no auto-reply, a person answers
    if (config.aiAssistantEnabled && (await this.aiCredits.canAfford(orgId, 'widget_reply'))) {
      try {
        const ragResult = await this.kbRagSearch.execute(dto.body, orgId);
        if (ragResult.answer) {
          await this.aiCredits.charge(orgId, 'widget_reply');
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
        } else {
          // Not in the knowledge base: shows up in the owner's unanswered questions
          await this.kbMisses.record(orgId, dto.body, 'WIDGET');
        }
      } catch (err) {
        // Non-fatal: log and continue — visitor message was already saved
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
}
