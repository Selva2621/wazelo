import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { WhatsAppModule } from '@/modules/whatsapp/whatsapp.module';
import { AiModule } from '@/modules/ai/ai.module';

// Repository
import { AutomationRepository } from './infrastructure/repositories/automation.repository';

// Domain services
import { ConditionEvaluatorService } from './domain/services/condition-evaluator.service';
import { TriggerMatcherService } from './domain/services/trigger-matcher.service';
import { LoopPreventionService } from './domain/services/loop-prevention.service';
import { ActionExecutorService } from './domain/services/action-executor.service';

// Use cases
import {
  CreateAutomationRuleUseCase,
  UpdateAutomationRuleUseCase,
  ToggleAutomationRuleUseCase,
  DeleteAutomationRuleUseCase,
  GetAutomationRuleUseCase,
  ListAutomationRulesUseCase,
  ListExecutionLogsUseCase,
  EvaluateTriggerUseCase,
} from './application/use-cases';
import { GenerateAutomationRuleUseCase } from './application/use-cases/generate-automation-rule.use-case';

// Controller
import { AutomationController } from './interfaces/controllers/automation.controller';

@Module({
  imports: [AuditModule, BillingModule, AiModule, MessagesModule, WhatsAppModule],
  controllers: [AutomationController],
  providers: [
    // Repository
    AutomationRepository,
    // Domain services
    ConditionEvaluatorService,
    TriggerMatcherService,
    LoopPreventionService,
    ActionExecutorService,
    // Use cases
    CreateAutomationRuleUseCase,
    UpdateAutomationRuleUseCase,
    ToggleAutomationRuleUseCase,
    DeleteAutomationRuleUseCase,
    GetAutomationRuleUseCase,
    ListAutomationRulesUseCase,
    ListExecutionLogsUseCase,
    EvaluateTriggerUseCase,
    GenerateAutomationRuleUseCase,
  ],
  exports: [
    AutomationRepository,
    ConditionEvaluatorService,
    TriggerMatcherService,
    LoopPreventionService,
    ActionExecutorService,
    EvaluateTriggerUseCase,
  ],
})
export class AutomationModule {}
