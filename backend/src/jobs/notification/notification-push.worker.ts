import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import PgBoss from 'pg-boss';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { WebPushService } from '@/infrastructure/external/push/web-push.service';
import { NotificationDeviceRepository } from '@/modules/notifications/infrastructure/repositories/notification-device.repository';
import { QUEUE_NAMES } from '@/common/constants';

interface PushNotificationJob {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const WHATSAPP_TYPES: NotificationType[] = [
  'WHATSAPP_SESSION_DISCONNECTED',
  'WHATSAPP_SESSION_UNSTABLE',
  'WHATSAPP_PHONE_INACTIVE',
];

/** Delivers urgent notifications to each of the user's devices that has push on. */
@Injectable()
export class NotificationPushWorker implements OnModuleInit {
  private readonly logger = new Logger(NotificationPushWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly webPush: WebPushService,
    private readonly deviceRepo: NotificationDeviceRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<PushNotificationJob>(
      QUEUE_NAMES.SEND_PUSH_NOTIFICATION,
      async (job: PgBoss.Job<PushNotificationJob>) => this.handle(job.data),
    );
    this.logger.log('Notification push worker subscribed');
  }

  private async handle(job: PushNotificationJob): Promise<void> {
    if (!this.webPush.isEnabled()) return;

    // Only this user's devices that have push on
    const devices = await this.deviceRepo.findPushTargets(job.userId);
    if (!devices.length) return;

    const payload = {
      title: job.title,
      body: job.body,
      url: this.urlFor(job),
      // WhatsApp status alerts replace each other instead of piling up
      tag: WHATSAPP_TYPES.includes(job.type) ? 'whatsapp-status' : job.type,
    };

    for (const device of devices) {
      try {
        const result = await this.webPush.send(device, payload);
        if (result === 'gone') await this.deviceRepo.clearEndpoint(device.endpoint);
      } catch (error) {
        this.logger.warn(`Push to device ${device.id} failed: ${(error as Error).message}`);
      }
    }
  }

  private urlFor(job: PushNotificationJob): string {
    const token = job.data?.reconnectToken;
    if (job.type === 'WHATSAPP_SESSION_DISCONNECTED' && typeof token === 'string') {
      return `/wa/${encodeURIComponent(token)}`;
    }
    if (WHATSAPP_TYPES.includes(job.type)) return '/settings/whatsapp';
    return '/notifications';
  }
}
