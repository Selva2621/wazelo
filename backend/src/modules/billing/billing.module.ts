import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '@/modules/audit/audit.module';

// Repositories
import { PlanRepository } from './infrastructure/repositories/plan.repository';
import { SubscriptionRepository } from './infrastructure/repositories/subscription.repository';
import { UsageRepository } from './infrastructure/repositories/usage.repository';
import { PaymentRepository } from './infrastructure/repositories/payment.repository';
import { EntitlementOverrideRepository } from './infrastructure/repositories/entitlement-override.repository';
import { KillSwitchRepository } from './infrastructure/repositories/kill-switch.repository';
import { CreditRepository } from './infrastructure/repositories/credit.repository';
import { CouponRepository } from './infrastructure/repositories/coupon.repository';
import { AiCreditRepository } from './infrastructure/repositories/ai-credit.repository';
import { PlatformSettingsModule } from '@/modules/platform-settings/platform-settings.module';
import { AiCreditsService } from './domain/services/ai-credits.service';
import {
  CreateAiCreditOrderUseCase,
  FulfillAiCreditOrderUseCase,
  GetAiCreditsUseCase,
  ListAiCreditHistoryUseCase,
} from './application/use-cases/ai-credits.use-cases';
import { AiCreditGuard, AiCreditChargeInterceptor } from './interfaces/guards/ai-credit.guard';
import { AiCreditsController } from './interfaces/controllers/ai-credits.controller';

// Domain services
import { UsageTrackingService } from './domain/services/usage-tracking.service';
import { EntitlementOverrideService } from './domain/services/entitlement-override.service';
import { KillSwitchService } from './domain/services/kill-switch.service';
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
import { ApplyRenewalCreditUseCase } from './application/use-cases/apply-renewal-credit.use-case';
import { CreateCheckoutOrderUseCase, ResolveCheckoutOrderUseCase } from './application/use-cases/checkout-order.use-cases';
import { ActivateTrialPaymentUseCase } from './application/use-cases/activate-trial-payment.use-case';
import { ValidateCouponUseCase } from './application/use-cases/validate-coupon.use-case';
import { CouponCheckoutService } from './application/services/coupon-checkout.service';

// Guards
import { UsageLimitGuard } from './interfaces/guards/usage-limit.guard';
import { FeatureFlagGuard } from './interfaces/guards/feature-flag.guard';
import { PlatformFeatureGuard } from './interfaces/guards/platform-feature.guard';

// Controllers
import { BillingController } from './interfaces/controllers/billing.controller';
import { StripeWebhookController } from './interfaces/controllers/stripe-webhook.controller';
import { RazorpayWebhookController } from './interfaces/controllers/razorpay-webhook.controller';

@Module({
  imports: [AuditModule, ConfigModule, PlatformSettingsModule],
  controllers: [BillingController, StripeWebhookController, RazorpayWebhookController, AiCreditsController],
  providers: [
    // AI credits (plan allowance + purchased packs)
    AiCreditRepository,
    AiCreditsService,
    AiCreditGuard,
    AiCreditChargeInterceptor,
    GetAiCreditsUseCase,
    ListAiCreditHistoryUseCase,
    CreateAiCreditOrderUseCase,
    FulfillAiCreditOrderUseCase,

    // Repositories
    PlanRepository,
    SubscriptionRepository,
    UsageRepository,
    PaymentRepository,
    EntitlementOverrideRepository,
    KillSwitchRepository,
    CreditRepository,
    CouponRepository,

    // Application services
    CouponCheckoutService,

    // Domain services
    UsageTrackingService,
    EntitlementOverrideService,
    KillSwitchService,
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
    ApplyRenewalCreditUseCase,
    CreateCheckoutOrderUseCase,
    ResolveCheckoutOrderUseCase,
    ActivateTrialPaymentUseCase,
    ValidateCouponUseCase,

    // Guards
    UsageLimitGuard,
    FeatureFlagGuard,
    PlatformFeatureGuard,
  ],
  exports: [
    // Export for use in other modules (guards, workers)
    UsageTrackingService,
    // AI credit metering (@AiCredits routes, chatbot, event handlers) + packs (super-admin)
    AiCreditsService,
    AiCreditRepository,
    AiCreditGuard,
    AiCreditChargeInterceptor,
    // Super admin per-org overrides (written only by the super-admin module)
    EntitlementOverrideService,
    EntitlementOverrideRepository,
    // Platform kill switches (read by guards + workers, written by super-admin)
    KillSwitchService,
    KillSwitchRepository,
    ProrationService,
    PlanRepository,
    SubscriptionRepository,
    UsageRepository,
    PaymentRepository,
    UsageLimitGuard,
    FeatureFlagGuard,
    PlatformFeatureGuard,
    StripePaymentService,
    RazorpayPaymentService,
    // Plan management — used by super-admin module
    ListPlansUseCase,
    CreatePlanUseCase,
    UpdatePlanUseCase,
    // Account credits + coupons (renewal worker, super-admin)
    CreditRepository,
    CouponRepository,
    ApplyRenewalCreditUseCase,
  ],
})
export class BillingModule {}
