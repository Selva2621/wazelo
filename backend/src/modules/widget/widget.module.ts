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
import { BillingModule } from '../billing/billing.module';

@Module({
  // BillingModule: AI credits for the widget's AI assistant replies
  imports: [AuditModule, AiModule, BillingModule],
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
