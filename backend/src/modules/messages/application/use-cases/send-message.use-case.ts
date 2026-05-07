import {
  Injectable,
  BadRequestException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { MessageRepository } from '../../infrastructure/repositories/message.repository';
import { ConversationRepository } from '../../infrastructure/repositories/conversation.repository';
import { MessageEventRepository } from '../../infrastructure/repositories/message-event.repository';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { RateLimiterService } from '../../domain/services/rate-limiter.service';
import { QUEUE_NAMES, EVENT_NAMES, MESSAGING_CONFIG } from '@/common/constants';
import { AuditAction, MessageDirection, MessageStatus, MessageType } from '@prisma/client';
import { SendMessageDto } from '../dto';

@Injectable()
export class SendMessageUseCase {
  private readonly logger = new Logger(SendMessageUseCase.name);

  constructor(
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly messageRepo: MessageRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly messageEventRepo: MessageEventRepository,
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
    private readonly rateLimiter: RateLimiterService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: SendMessageDto,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Idempotency check — return existing message if duplicate request
    if (dto.idempotencyKey) {
      const existing = await this.messageRepo.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        return { message: existing, deduplicated: true };
      }
    }

    // 2. Resolve which WhatsApp session to use for sending
    //    Priority: conversationId (use conversation's session) > viaSessionUserId > caller's own session
    let session: Awaited<ReturnType<typeof this.sessionRepo.findActiveByUserId>> = null;

    if (dto.conversationId) {
      // Sending within an existing conversation — use that conversation's session
      const conv = await this.conversationRepo.findByIdAndOrg(dto.conversationId, orgId);
      if (conv) {
        session = conv.sessionId ? await this.sessionRepo.findById(conv.sessionId) : null;
        if (session && session.status !== 'CONNECTED') {
          session = null; // Session exists but isn't connected
        }
      }
    }

    if (!session && dto.viaSessionUserId) {
      // Admin/Manager explicitly specifying which user's session to use
      session = await this.sessionRepo.findActiveByUserId(dto.viaSessionUserId, orgId);
    }

    if (!session) {
      // Default: use caller's own session
      session = await this.sessionRepo.findActiveByUserId(userId, orgId);
    }

    if (!session || session.status !== 'CONNECTED') {
      throw new BadRequestException(
        'No connected WhatsApp session available to send this message.',
      );
    }

    // 3. Validate message content
    if (dto.type === 'TEXT' && !dto.body) {
      throw new BadRequestException('Text messages require a body');
    }
    if (['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'].includes(dto.type) && !dto.mediaUrl) {
      throw new BadRequestException(`${dto.type} messages require a mediaUrl`);
    }
    if (dto.type === 'INTERACTIVE') {
      if (!dto.interactive) {
        throw new BadRequestException('INTERACTIVE messages require an interactive payload');
      }
      if (dto.interactive.type === 'button') {
        if (!dto.interactive.buttons || dto.interactive.buttons.length === 0) {
          throw new BadRequestException('Button interactive messages require at least one button');
        }
        if (dto.interactive.buttons.length > 3) {
          throw new BadRequestException('Button interactive messages allow a maximum of 3 buttons');
        }
      }
      if (dto.interactive.type === 'list') {
        if (!dto.interactive.sections || dto.interactive.sections.length === 0) {
          throw new BadRequestException('List interactive messages require at least one section');
        }
        const totalRows = dto.interactive.sections.reduce((sum, s) => sum + s.rows.length, 0);
        if (totalRows > 10) {
          throw new BadRequestException('List interactive messages allow a maximum of 10 rows total');
        }
      }
    }

    // 4. Rate limit check
    const rateResult = await this.rateLimiter.checkLimit(session.id, orgId);
    if (!rateResult.allowed) {
      this.eventEmitter.emit(EVENT_NAMES.RATE_LIMIT_EXCEEDED, {
        sessionId: session.id,
        orgId,
        userId,
        limitType: rateResult.limitType,
        currentCount: rateResult.currentCount,
        maxAllowed: rateResult.maxAllowed,
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded (${rateResult.limitType}). Retry after ${rateResult.retryAfterSeconds}s.`,
          retryAfterSeconds: rateResult.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 5. Find or create conversation thread
    //    If conversationId is provided (replying in existing thread), reuse it
    //    Otherwise find/create by sessionId + contactPhone
    let conversation;
    if (dto.conversationId) {
      conversation = await this.conversationRepo.findById(dto.conversationId);
      if (!conversation || conversation.orgId !== orgId) {
        conversation = await this.conversationRepo.findOrCreate({
          orgId,
          sessionId: session.id,
          contactPhone: dto.contactPhone,
        });
      }
    } else {
      conversation = await this.conversationRepo.findOrCreate({
        orgId,
        sessionId: session.id,
        contactPhone: dto.contactPhone,
      });
    }

    // 6. Persist message in DB with QUEUED status
    const message = await this.messageRepo.create({
      orgId,
      sessionId: session.id,
      conversationId: conversation.id,
      direction: MessageDirection.OUTBOUND,
      type: dto.type as MessageType,
      contactPhone: dto.contactPhone,
      contactName: dto.contactName,
      body: dto.type === 'INTERACTIVE' ? (dto.interactive?.body ?? dto.body) : dto.body,
      mediaUrl: dto.mediaUrl,
      mediaMimeType: dto.mediaMimeType,
      metadata: dto.interactive ? { interactive: dto.interactive } as any : undefined,
      idempotencyKey: dto.idempotencyKey,
      priority: dto.priority,
      maxRetries: MESSAGING_CONFIG.MAX_RETRY_COUNT,
    });

    // 7. Record event
    await this.messageEventRepo.record({
      messageId: message.id,
      orgId,
      status: MessageStatus.QUEUED,
      metadata: { userId, contactPhone: dto.contactPhone },
    });

    // 8. Queue for async send — NO direct send allowed (AC1)
    //    singletonKey prevents duplicate jobs for the same message
    await this.queueService.publishOnce(
      QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
      {
        messageId: message.id,
        sessionId: session.id,
        orgId,
      },
      `msg-${message.id}`,
      {
        retryLimit: MESSAGING_CONFIG.MAX_RETRY_COUNT,
        retryDelay: MESSAGING_CONFIG.RETRY_BASE_DELAY_SECONDS,
        retryBackoff: true,
        priority: dto.priority ?? 0,
      },
    );

    // 9. Update conversation last message
    await this.conversationRepo.updateLastMessage(
      conversation.id,
      dto.body || null,
      false,
    );

    // 10. Emit queued event for real-time UI
    this.eventEmitter.emit(EVENT_NAMES.MESSAGE_QUEUED, {
      messageId: message.id,
      conversationId: conversation.id,
      sessionId: session.id,
      orgId,
      contactPhone: dto.contactPhone,
      type: dto.type,
    });

    // 11. Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.MESSAGE_QUEUED,
      targetType: 'Message',
      targetId: message.id,
      metadata: {
        contactPhone: dto.contactPhone,
        type: dto.type,
        sessionId: session.id,
        conversationId: conversation.id,
        priority: dto.priority,
      },
      ipAddress,
      userAgent,
    });

    return { message, conversation, deduplicated: false };
  }
}
