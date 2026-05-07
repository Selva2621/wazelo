import { Module } from '@nestjs/common';
import { WidgetRepository } from './infrastructure/repositories/widget.repository';
import { WidgetAdminController } from './interfaces/controllers/widget-admin.controller';
import { WidgetPublicController } from './interfaces/controllers/widget-public.controller';
import {
  GetWidgetConfigUseCase,
  UpdateWidgetConfigUseCase,
  StartWidgetSessionUseCase,
  SendWidgetMessageUseCase,
} from './application/use-cases';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AuditModule, AiModule],
  controllers: [WidgetAdminController, WidgetPublicController],
  providers: [
    WidgetRepository,
    GetWidgetConfigUseCase,
    UpdateWidgetConfigUseCase,
    StartWidgetSessionUseCase,
    SendWidgetMessageUseCase,
  ],
  exports: [WidgetRepository],
})
export class WidgetModule {}
