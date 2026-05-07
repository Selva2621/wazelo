import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { AnalyticsModule } from '@/modules/analytics/analytics.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { TeamsModule } from '@/modules/teams/teams.module';

// Repository
import { SlaRepository } from './infrastructure/repositories/sla.repository';

// Domain services
import { SlaCalculationService } from './domain/services/sla-calculation.service';

// Use cases
import { CreateSlaPolicyUseCase } from './application/use-cases/create-sla-policy.use-case';
import { UpdateSlaPolicyUseCase } from './application/use-cases/update-sla-policy.use-case';
import { DeleteSlaPolicyUseCase } from './application/use-cases/delete-sla-policy.use-case';
import { GetSlaPolicyUseCase } from './application/use-cases/get-sla-policy.use-case';
import { ListSlaPoliciesUseCase } from './application/use-cases/list-sla-policies.use-case';
import { ListSlaTrackingsUseCase } from './application/use-cases/list-sla-trackings.use-case';
import { ListSlaBreachesUseCase } from './application/use-cases/list-sla-breaches.use-case';
import { AcknowledgeSlaBreachUseCase } from './application/use-cases/acknowledge-sla-breach.use-case';
import { GetSlaPerformanceUseCase } from './application/use-cases/get-sla-performance.use-case';

// Controller
import { SlaController } from './interfaces/controllers/sla.controller';

@Module({
  imports: [AuditModule, AnalyticsModule, NotificationsModule, TeamsModule],
  controllers: [SlaController],
  providers: [
    // Repository
    SlaRepository,

    // Domain services
    SlaCalculationService,

    // Use cases
    CreateSlaPolicyUseCase,
    UpdateSlaPolicyUseCase,
    DeleteSlaPolicyUseCase,
    GetSlaPolicyUseCase,
    ListSlaPoliciesUseCase,
    ListSlaTrackingsUseCase,
    ListSlaBreachesUseCase,
    AcknowledgeSlaBreachUseCase,
    GetSlaPerformanceUseCase,
  ],
  exports: [SlaRepository, SlaCalculationService],
})
export class SlaModule {}
