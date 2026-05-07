import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WebSocketModule } from '@/infrastructure/websocket/websocket.module';

// Repository
import { NotificationRepository } from './infrastructure/repositories/notification.repository';

// Domain services
import { NotificationDispatchService } from './domain/services/notification-dispatch.service';

// Use cases
import { ListNotificationsUseCase } from './application/use-cases/list-notifications.use-case';
import { MarkNotificationsReadUseCase } from './application/use-cases/mark-notifications-read.use-case';
import { DeleteNotificationsUseCase } from './application/use-cases/delete-notifications.use-case';
import { ManagePreferencesUseCase } from './application/use-cases/manage-preferences.use-case';
import { GetUnreadCountUseCase } from './application/use-cases/get-unread-count.use-case';

// Controller
import { NotificationsController } from './interfaces/controllers/notifications.controller';

@Module({
  imports: [AuditModule, WebSocketModule],
  controllers: [NotificationsController],
  providers: [
    // Repository
    NotificationRepository,

    // Domain services
    NotificationDispatchService,

    // Use cases
    ListNotificationsUseCase,
    MarkNotificationsReadUseCase,
    DeleteNotificationsUseCase,
    ManagePreferencesUseCase,
    GetUnreadCountUseCase,
  ],
  exports: [NotificationDispatchService, NotificationRepository],
})
export class NotificationsModule {}
