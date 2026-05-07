import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { DealRepository } from '@/modules/deals/infrastructure/repositories/deal.repository';
import { PipelineRepository } from '@/modules/deals/infrastructure/repositories/pipeline.repository';
import { ConfigResolutionService } from '@/modules/settings/domain/services/config-resolution.service';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class PurchaseIntentHandler {
  private readonly logger = new Logger(PurchaseIntentHandler.name);

  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly dealRepo: DealRepository,
    private readonly pipelineRepo: PipelineRepository,
    private readonly configService: ConfigResolutionService,
    private readonly wsGateway: AppWebSocketGateway,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED, { async: true })
  async handleMessage(payload: {
    messageId: string;
    orgId: string;
    conversationId: string;
    contactId: string;
    contactPhone: string;
    sessionId: string;
    body?: string;
    type?: string;
  }) {
    // Only process text messages
    if (payload.type && payload.type !== 'TEXT') return;
    if (!payload.body || payload.body.trim().length < 5) return;

    try {
      // Check if feature is enabled for this org
      const setting = await this.configService.resolveSetting(
        payload.orgId,
        'ai',
        'auto_detect_purchase_intent',
      );
      if (!setting || setting.value !== 'true') return;

      // Check if contact already has an open deal
      const existingDeal = await this.dealRepo.findOpenByContact(payload.orgId, payload.contactId);
      if (existingDeal) return;

      // Get default pipeline
      const pipeline = await this.pipelineRepo.findDefaultOrFirst(payload.orgId);
      if (!pipeline || !pipeline.stages.length) return;

      // Ask AI to detect purchase intent
      const result = await this.aiProvider.complete({
        systemPrompt: 'You analyze customer messages for purchase intent. Respond ONLY with valid JSON, no other text.',
        userPrompt: `Does this customer message indicate purchase intent (wanting to buy, requesting pricing, interested in purchasing, asking about plans/packages)?

Message: "${payload.body}"

Respond with JSON: {"intent": true/false, "confidence": 0.0-1.0, "keywords": ["matched keywords"]}`,
        maxTokens: 100,
      });

      // Parse AI response
      let parsed: { intent: boolean; confidence: number; keywords: string[] };
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return;
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return;
      }

      if (!parsed.intent || parsed.confidence < 0.7) return;

      // Get contact name for deal title
      const contact = await this.prisma.contact.findFirst({
        where: { id: payload.contactId, orgId: payload.orgId },
        select: { name: true, phoneNumber: true },
      });

      const contactName = contact?.name || contact?.phoneNumber || payload.contactPhone;
      const firstStage = pipeline.stages[0];

      // Create deal
      const deal = await this.dealRepo.create({
        orgId: payload.orgId,
        pipelineId: pipeline.id,
        stageId: firstStage.id,
        contactId: payload.contactId,
        title: `Purchase Intent - ${contactName}`,
      });

      this.logger.log(
        `Auto-created deal "${deal.title}" (confidence: ${parsed.confidence}) for org ${payload.orgId}`,
      );

      // Notify via WebSocket
      this.wsGateway.emitToOrg(payload.orgId, 'deal:auto-created', {
        deal,
        confidence: parsed.confidence,
        keywords: parsed.keywords,
        messageBody: payload.body,
      });
    } catch (error) {
      this.logger.error(
        `Purchase intent detection failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
