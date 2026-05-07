import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { WhatsAppSessionService } from '@/modules/whatsapp/domain/services/session.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUE_NAMES, EVENT_NAMES, WHATSAPP_CONFIG } from '@/common/constants';
import { AuditAction, WhatsAppSessionStatus } from '@prisma/client';

interface HealthCheckJobData {
  sessionId: string;
  action: 'reconnect' | 'check';
  attempt?: number;
}

@Injectable()
export class SessionHealthWorker implements OnModuleInit {
  private readonly logger = new Logger(SessionHealthWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly connectionManager: BaileysConnectionManager,
    private readonly sessionService: WhatsAppSessionService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<HealthCheckJobData>(
      QUEUE_NAMES.WHATSAPP_SESSION_HEALTH_CHECK,
      async (job) => this.handle(job.data),
    );
    this.logger.log('SessionHealthWorker subscribed');
  }

  // Periodic heartbeat check every 10 seconds
  @Cron('*/10 * * * * *')
  async checkStaleHeartbeats(): Promise<void> {
    const threshold = new Date(
      Date.now() - WHATSAPP_CONFIG.DISCONNECT_DETECTION_TIMEOUT_MS,
    );

    const staleSessions =
      await this.sessionRepo.findStaleConnectedSessions(threshold);

    for (const session of staleSessions) {
      this.logger.warn(`Stale heartbeat detected for session ${session.id}`);

      await this.queueService.publish(
        QUEUE_NAMES.WHATSAPP_SESSION_HEALTH_CHECK,
        {
          sessionId: session.id,
          action: 'check',
        },
        {
          singletonKey: `health-check-${session.id}`,
          singletonSeconds: 10,
        },
      );
    }
  }

  private async handle(data: HealthCheckJobData): Promise<void> {
    const { sessionId, action, attempt } = data;

    const session = await this.sessionRepo.findById(sessionId);
    if (!session || session.status === 'DISCONNECTED') {
      return;
    }

    if (action === 'reconnect') {
      await this.handleReconnect(session, attempt || 1);
    } else {
      await this.handleHealthCheck(session);
    }
  }

  private async handleReconnect(
    session: Record<string, any>,
    attempt: number,
  ): Promise<void> {
    if (!this.sessionService.canRetryReconnect(attempt - 1)) {
      // Max retries exhausted — preserve creds so user can reconnect without re-scanning QR
      await this.sessionRepo.markAsDisconnected(session.id);

      await this.auditService.log({
        orgId: session.orgId,
        userId: session.userId,
        action: AuditAction.WHATSAPP_SESSION_DISCONNECTED,
        targetType: 'WhatsAppSession',
        targetId: session.id,
        metadata: { reason: 'Max reconnect attempts exhausted', attempts: attempt },
      });

      this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_SESSION_DISCONNECTED, {
        sessionId: session.id,
        orgId: session.orgId,
        userId: session.userId,
        reason: 'Max reconnect attempts exhausted',
      });

      return;
    }

    // Try to reconnect via Baileys — recreate the socket connection
    try {
      await this.connectionManager.createConnection(
        session.id,
        session.userId,
        session.orgId,
      );
      // If createConnection succeeds, Baileys will emit connection.update
      // which triggers HandleSessionEventUseCase to update DB status
      this.logger.log(`Session ${session.id} reconnect initiated on attempt ${attempt}`);
      return;
    } catch (error) {
      this.logger.warn(`Reconnect attempt ${attempt} failed for ${session.id}`, error);
    }

    // Schedule next retry if allowed
    if (this.sessionService.canRetryReconnect(attempt)) {
      const delayMs = this.sessionService.getReconnectDelayMs(attempt);
      await this.queueService.publish(
        QUEUE_NAMES.WHATSAPP_SESSION_HEALTH_CHECK,
        {
          sessionId: session.id,
          action: 'reconnect',
          attempt: attempt + 1,
        },
        { startAfter: Math.round(delayMs / 1000) },
      );

      this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_SESSION_RECONNECTING, {
        sessionId: session.id,
        orgId: session.orgId,
        userId: session.userId,
        attempt: attempt + 1,
      });
    } else {
      // Final failure — preserve creds so user can reconnect without re-scanning QR
      await this.sessionRepo.markAsDisconnected(session.id);
      this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_SESSION_DISCONNECTED, {
        sessionId: session.id,
        orgId: session.orgId,
        userId: session.userId,
        reason: 'Reconnect failed after all attempts',
      });
    }
  }

  private async handleHealthCheck(session: Record<string, any>): Promise<void> {
    // Check if Baileys socket is still alive
    if (this.connectionManager.isConnected(session.id)) {
      // Socket is alive — update heartbeat
      await this.sessionRepo.updateHeartbeat(session.id);
      return;
    }

    // Socket is gone — start reconnect flow
    if (this.sessionService.canRetryReconnect(session.reconnectCount)) {
      await this.sessionRepo.incrementReconnectCount(session.id);

      await this.queueService.publish(
        QUEUE_NAMES.WHATSAPP_SESSION_HEALTH_CHECK,
        {
          sessionId: session.id,
          action: 'reconnect',
          attempt: session.reconnectCount + 1,
        },
        {
          startAfter: Math.round(
            this.sessionService.getReconnectDelayMs(session.reconnectCount) / 1000,
          ),
        },
      );
    } else {
      // No retries left — preserve creds so user can reconnect without re-scanning QR
      await this.sessionRepo.markAsDisconnected(session.id);

      this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_SESSION_DISCONNECTED, {
        sessionId: session.id,
        orgId: session.orgId,
        userId: session.userId,
        reason: 'Health check failed, no reconnect attempts left',
      });
    }
  }
}
