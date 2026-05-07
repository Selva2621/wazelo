import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { WhatsAppModule } from '@/modules/whatsapp/whatsapp.module';

// Repository
import { SchedulerRepository } from './infrastructure/repositories/scheduler.repository';

// Use cases
import {
  CreateScheduledMessageUseCase,
  UpdateScheduledMessageUseCase,
  CancelScheduledMessageUseCase,
  GetScheduledMessageUseCase,
  ListScheduledMessagesUseCase,
} from './application/use-cases';

// Controller
import { SchedulerController } from './interfaces/controllers/scheduler.controller';

@Module({
  imports: [AuditModule, forwardRef(() => WhatsAppModule)],
  controllers: [SchedulerController],
  providers: [
    // Repository
    SchedulerRepository,
    // Use cases
    CreateScheduledMessageUseCase,
    UpdateScheduledMessageUseCase,
    CancelScheduledMessageUseCase,
    GetScheduledMessageUseCase,
    ListScheduledMessagesUseCase,
  ],
  exports: [SchedulerRepository],
})
export class SchedulerModule {}
