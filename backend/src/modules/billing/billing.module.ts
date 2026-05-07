import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '@/modules/audit/audit.module';

// Repositories
import { PlanRepository } from './infrastructure/repositories/plan.repository';
import { SubscriptionRepository } from './infrastructure/repositories/subscription.repository';
import { UsageRepository } from './infrastructure/repositories/usage.repository';
import { PaymentRepository } from './infrastructure/repositories/payment.repository';

// Domain services
import { UsageTrackingService } from './domain/services/usage-tracking.service';
import { ProrationService } from './domain/services/proration.service';
import { StripePaymentService } from './domain/services/stripe-payment.service';
import { RazorpayPaymentService } from './domain/services/razorpay-payment.service';

// Use cases
import { CreatePlanUseCase } from './application/use-cases/create-plan.use-case';
import { UpdatePlanUseCase } from './application/use-cases/update-plan.use-case';
import { ListPlansUseCase } from './application/use-cases/list-plans.use-case';
import { SubscribeUseCase } from './application/use-cases/subscribe.use-case';
import { ChangePlanUseCase } from './application/use-cases/change-plan.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case';
import { ReactivateSubscriptionUseCase } from './application/use-cases/reactivate-subscription.use-case';
import { GetSubscriptionUseCase } from './application/use-cases/get-subscription.use-case';
import { ListInvoicesUseCase, ListPaymentsUseCase } from './application/use-cases/list-invoices.use-case';

// Guards
import { UsageLimitGuard } from './interfaces/guards/usage-limit.guard';
import { FeatureFlagGuard } from './interfaces/guards/feature-flag.guard';

// Controllers
import { BillingController } from './interfaces/controllers/billing.controller';
import { StripeWebhookController } from './interfaces/controllers/stripe-webhook.controller';
import { RazorpayWebhookController } from './interfaces/controllers/razorpay-webhook.controller';

@Module({
  imports: [AuditModule, ConfigModule],
  controllers: [BillingController, StripeWebhookController, RazorpayWebhookController],
  providers: [
    // Repositories
    PlanRepository,
    SubscriptionRepository,
    UsageRepository,
    PaymentRepository,

    // Domain services
    UsageTrackingService,
    ProrationService,
    StripePaymentService,
    RazorpayPaymentService,

    // Use cases
    CreatePlanUseCase,
    UpdatePlanUseCase,
    ListPlansUseCase,
    SubscribeUseCase,
    ChangePlanUseCase,
    CancelSubscriptionUseCase,
    ReactivateSubscriptionUseCase,
    GetSubscriptionUseCase,
    ListInvoicesUseCase,
    ListPaymentsUseCase,

    // Guards
    UsageLimitGuard,
    FeatureFlagGuard,
  ],
  exports: [
    // Export for use in other modules (guards, workers)
    UsageTrackingService,
    ProrationService,
    PlanRepository,
    SubscriptionRepository,
    UsageRepository,
    PaymentRepository,
    UsageLimitGuard,
    FeatureFlagGuard,
    StripePaymentService,
    RazorpayPaymentService,
    // Plan management — used by super-admin module
    ListPlansUseCase,
    CreatePlanUseCase,
    UpdatePlanUseCase,
  ],
})
export class BillingModule {}
