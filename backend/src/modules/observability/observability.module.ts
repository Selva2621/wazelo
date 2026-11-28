import { Module } from '@nestjs/common';
import { QueueModule } from '@/infrastructure/queue/queue.module';
import { WebSocketModule } from '@/infrastructure/websocket/websocket.module';

// Repositories
import { MetricsRepository } from './infrastructure/repositories/metrics.repository';
import { AlertsRepository } from './infrastructure/repositories/alerts.repository';

// Services
import { MetricsService } from './domain/services/metrics.service';
import { ErrorTrackingService } from './domain/services/error-tracking.service';
import { AlertService } from './domain/services/alert.service';
import { HealthService } from './domain/services/health.service';

import { PublicPingController } from './interfaces/controllers/public-ping.controller';

// Health/metrics/alerts/errors are platform-wide and are served only to super admins
// (super-admin module, /super-admin/system). The one controller here is the public
// "is it up" ping, which reveals nothing.
@Module({
  imports: [QueueModule, WebSocketModule],
  controllers: [PublicPingController],
  providers: [
    // Repositories
    MetricsRepository,
    AlertsRepository,

    // Services
    MetricsService,
    ErrorTrackingService,
    AlertService,
    HealthService,
  ],
  exports: [
    MetricsService,
    ErrorTrackingService,
    AlertService,
    HealthService,
    MetricsRepository,
  ],
})
export class ObservabilityModule {}
