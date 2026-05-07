import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { NotificationRepository } from '../../infrastructure/repositories/notification.repository';
import { NotificationTarget } from '../value-objects/notification-target.vo';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { QueueService } from '@/infrastructure/queue/queue.service';
import {
  EVENT_NAMES,
  QUEUE_NAMES,
  NOTIFICATION_CONFIG,
} from '@/common/constants';
import { NotificationCreatedEvent } from '@/events/event-bus';

/**
 * Core domain service: dispatches notifications across channels
 * (in-app + email) after checking user preferences and deduplication.
 */
@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  // In-memory cooldown tracker: `userId:type` → last sent timestamp
  private readonly cooldownMap = new Map<string, number>();

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly wsGateway: AppWebSocketGateway,
    private readonly queueService: QueueService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Dispatch a notification to a single user, respecting preferences and cooldown.
   */
  async dispatch(target: NotificationTarget): Promise<void> {
    // 1. Check cooldown (anti-spam)
    if (this.isCooldownActive(target.userId, target.type)) {
      this.logger.debug(
        `Notification cooldown active for user=${target.userId} type=${target.type}`,
      );
      return;
    }

    // 2. Check idempotency — skip if already sent
    if (target.idempotencyKey) {
      const exists =
        await this.notificationRepository.findByIdempotencyKey(
          target.idempotencyKey,
        );
      if (exists) {
        this.logger.debug(
          `Duplicate notification skipped: idempotencyKey=${target.idempotencyKey}`,
        );
        return;
      }
    }

    // 3. Load user preferences for this notification type
    const preference =
      await this.notificationRepository.findPreference(
        target.userId,
        target.type,
      );

    const inAppEnabled = preference?.inAppEnabled ?? true;
    const emailEnabled = preference?.emailEnabled ?? this.defaultEmailEnabled(target.type);

    // 4. In-app notification
    if (inAppEnabled) {
      const notification =
        await this.notificationRepository.create({
          orgId: target.orgId,
          userId: target.userId,
          type: target.type,
          priority: target.priority,
          title: target.title,
          body: target.body,
          data: target.data ?? null,
          channel: 'IN_APP',
          groupKey: target.groupKey ?? null,
          idempotencyKey: target.idempotencyKey ?? null,
        });

      // Push via WebSocket (real-time delivery ≤1s)
      this.wsGateway.emitToUser(target.userId, 'notification:new', {
        id: notification.id,
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        isRead: false,
        createdAt: notification.createdAt,
      });

      // Emit internal event
      this.eventEmitter.emit(EVENT_NAMES.NOTIFICATION_CREATED, {
        notificationId: notification.id,
        orgId: target.orgId,
        userId: target.userId,
        type: target.type,
        priority: target.priority,
        title: target.title,
        channel: 'IN_APP',
      } satisfies NotificationCreatedEvent);

      // Enforce max notification limit per user (trim oldest)
      await this.notificationRepository.trimOldNotifications(
        target.userId,
        NOTIFICATION_CONFIG.MAX_NOTIFICATIONS_PER_USER,
      );
    }

    // 5. Email notification (queued via pg-boss)
    if (emailEnabled) {
      await this.queueService.publishOnce(
        QUEUE_NAMES.SEND_NOTIFICATION_EMAIL,
        {
          orgId: target.orgId,
          userId: target.userId,
          type: target.type,
          priority: target.priority,
          title: target.title,
          body: target.body,
          data: target.data,
        },
        // Singleton key for idempotency within email queue
        target.idempotencyKey ?? `email:${target.userId}:${target.type}:${Date.now()}`,
      );
    }

    // 6. Set cooldown
    this.setCooldown(target.userId, target.type);
  }

  /**
   * Dispatch the same notification to multiple users (org-wide).
   */
  async dispatchToOrg(
    orgId: string,
    userIds: string[],
    type: NotificationType,
    priority: NotificationPriority,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    groupKey?: string,
  ): Promise<void> {
    await Promise.all(
      userIds.map((userId) =>
        this.dispatch({
          orgId,
          userId,
          type,
          priority,
          title,
          body,
          data,
          groupKey,
          idempotencyKey: groupKey ? `${groupKey}:${userId}` : undefined,
        }),
      ),
    );
  }

  /**
   * Certain notification types have email disabled by default
   * (e.g., individual message received — too noisy).
   */
  private defaultEmailEnabled(type: NotificationType): boolean {
    const emailDisabledByDefault: NotificationType[] = [
      'MESSAGE_RECEIVED',
      'CONTACT_ASSIGNED',
      'CONTACT_REASSIGNED',
      'AUTOMATION_EXECUTED',
    ];
    return !emailDisabledByDefault.includes(type);
  }

  private isCooldownActive(userId: string, type: NotificationType): boolean {
    const key = `${userId}:${type}`;
    const lastSent = this.cooldownMap.get(key);
    if (!lastSent) return false;
    const elapsed = (Date.now() - lastSent) / 1000;
    return elapsed < NOTIFICATION_CONFIG.COOLDOWN_SECONDS;
  }

  private setCooldown(userId: string, type: NotificationType): void {
    const key = `${userId}:${type}`;
    this.cooldownMap.set(key, Date.now());

    // Prevent memory leak: clean up old entries periodically
    if (this.cooldownMap.size > 10_000) {
      const now = Date.now();
      const maxAge = NOTIFICATION_CONFIG.COOLDOWN_SECONDS * 1000;
      for (const [k, v] of this.cooldownMap) {
        if (now - v > maxAge) {
          this.cooldownMap.delete(k);
        }
      }
    }
  }
}
