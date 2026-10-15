import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { BillingModule } from '@/modules/billing/billing.module';
import { ObservabilityModule } from '@/modules/observability/observability.module';
import { EncryptionService } from '@/common/services/encryption.service';
import { PlatformSettingsModule } from '@/modules/platform-settings/platform-settings.module';
import { GoogleOAuthModule } from '@/infrastructure/external/google/google-oauth.module';
import {
  GetPlatformSettingsUseCase,
  UpdatePlatformSettingsUseCase,
} from './application/use-cases/platform-settings.use-cases';
import { SuperAdminSettingsController } from './interfaces/controllers/super-admin-settings.controller';

// Repositories
import { SuperAdminRepository } from './infrastructure/repositories/super-admin.repository';
import { HelpTicketRepository } from './infrastructure/repositories/help-ticket.repository';
import { PlatformRepository } from './infrastructure/repositories/platform.repository';
import { PlatformAuditRepository } from './infrastructure/repositories/platform-audit.repository';

// Application services
import { PlatformAuditService } from './application/services/platform-audit.service';
import { SuperAdminTicketNotifier } from './application/services/super-admin-ticket-notifier.service';
import { SuperAdminNotificationRepository } from './infrastructure/repositories/super-admin-notification.repository';
import {
  ListSuperAdminNotificationsUseCase,
  MarkAllSuperAdminNotificationsReadUseCase,
  MarkSuperAdminNotificationReadUseCase,
} from './application/use-cases/super-admin-notifications.use-cases';
import { SuperAdminNotificationsController } from './interfaces/controllers/super-admin-notifications.controller';

// Domain services
import { SuperAdminTokenService } from './domain/services/super-admin-token.service';
import { TotpService } from './domain/services/totp.service';

// Use cases
import {
  SuperAdminAuthPolicy,
  SuperAdminSessionIssuer,
  SuperAdminLockout,
  SuperAdminSecondFactor,
  SuperAdminLoginUseCase,
  CompleteSuperAdminTwoFactorLoginUseCase,
  StartSuperAdminTwoFactorEnrollmentUseCase,
  CompleteSuperAdminTwoFactorEnrollmentUseCase,
  RefreshSuperAdminSessionUseCase,
  LogoutSuperAdminUseCase,
  ListSuperAdminSessionsUseCase,
  RevokeSuperAdminSessionUseCase,
  GetSuperAdminProfileUseCase,
  SetupSuperAdminTwoFactorUseCase,
  EnableSuperAdminTwoFactorUseCase,
  DisableSuperAdminTwoFactorUseCase,
  RegenerateSuperAdminRecoveryCodesUseCase,
  CompleteSuperAdminPasswordChangeLoginUseCase,
  ChangeSuperAdminPasswordUseCase,
} from './application/use-cases/super-admin-auth.use-cases';
import {
  CreateSuperAdminAccountUseCase,
  ListSuperAdminAccountsUseCase,
  ResetSuperAdminTwoFactorUseCase,
  SetSuperAdminDisabledUseCase,
} from './application/use-cases/super-admin-accounts.use-cases';
import { SuperAdminAccountsController } from './interfaces/controllers/super-admin-accounts.controller';
import { GlobalSearchUseCase } from './application/use-cases/global-search.use-case';
import {
  AdminDeleteOrgUseCase,
  AdminExportOrgUseCase,
  AdminRestoreOrgUseCase,
  AdminUpdateOrgUseCase,
} from './application/use-cases/org-lifecycle.use-cases';
import { SuperAdminSessionRepository } from './infrastructure/repositories/super-admin-session.repository';
import { GetPlatformStatsUseCase } from './application/use-cases/get-platform-stats.use-case';
import { GetAllOrgsUseCase } from './application/use-cases/get-all-orgs.use-case';
import { GetOrgDetailUseCase } from './application/use-cases/get-org-detail.use-case';
import { GetPlatformActivityUseCase } from './application/use-cases/get-platform-activity.use-case';
import { ListSubscriptionsUseCase } from './application/use-cases/list-subscriptions.use-case';
import { ListPlatformAuditLogsUseCase } from './application/use-cases/list-platform-audit-logs.use-case';
import {
  SuspendOrgUseCase,
  ReactivateOrgUseCase,
  AdminCancelSubscriptionUseCase,
  AdminChangePlanUseCase,
  AdminExtendTrialUseCase,
} from './application/use-cases/org-management.use-cases';
import {
  SuperAdminCreatePlanUseCase,
  SuperAdminListPlansUseCase,
  SuperAdminUpdatePlanUseCase,
  SuperAdminArchivePlanUseCase,
  SuperAdminUnarchivePlanUseCase,
  SuperAdminDeletePlanUseCase,
} from './application/use-cases/super-admin-plans.use-cases';
import {
  CreateTicketUseCase,
  GetTicketUseCase,
  ListTicketsUseCase,
  ReplyToTicketUseCase,
  UpdateTicketStatusUseCase,
  AssignTicketUseCase,
} from './application/use-cases/ticket.use-cases';

// Guards
import { SuperAdminGuard } from './interfaces/guards/super-admin.guard';

// Controllers
import { SuperAdminAuthController } from './interfaces/controllers/super-admin-auth.controller';
import { SuperAdminOrgsController } from './interfaces/controllers/super-admin-orgs.controller';
import { SuperAdminTicketsController } from './interfaces/controllers/super-admin-tickets.controller';
import { SuperAdminPlansController } from './interfaces/controllers/super-admin-plans.controller';
import { SupportTicketsController } from './interfaces/controllers/support-tickets.controller';
import { SuperAdminAuditController } from './interfaces/controllers/super-admin-audit.controller';
import { SuperAdminSystemController } from './interfaces/controllers/super-admin-system.controller';
import { SuperAdminBillingController } from './interfaces/controllers/super-admin-billing.controller';
import {
  CreateAlertRuleUseCase,
  DeleteAlertRuleUseCase,
  UpdateAlertRuleUseCase,
} from './application/use-cases/create-alert-rule.use-case';
import { ListFailedJobsUseCase, RetryFailedJobUseCase } from './application/use-cases/failed-jobs.use-cases';
import { GetOrgMessagingHealthUseCase } from './application/use-cases/get-org-messaging-health.use-case';
import { AnnouncementRepository } from './infrastructure/repositories/announcement.repository';
import {
  GetOrgEntitlementsUseCase,
  SetEntitlementOverrideUseCase,
  RemoveEntitlementOverrideUseCase,
} from './application/use-cases/entitlements.use-cases';
import { ListKillSwitchesUseCase, SetKillSwitchUseCase } from './application/use-cases/kill-switches.use-cases';
import {
  CreateAnnouncementUseCase,
  ListAnnouncementsUseCase,
  ArchiveAnnouncementUseCase,
  RestoreAnnouncementUseCase,
  UpdateAnnouncementUseCase,
  GetActiveAnnouncementsUseCase,
  DismissAnnouncementUseCase,
} from './application/use-cases/announcements.use-cases';
import { SuperAdminAnnouncementsController } from './interfaces/controllers/super-admin-announcements.controller';
import { AnnouncementsController } from './interfaces/controllers/announcements.controller';
import {
  ListPlatformPaymentsUseCase,
  ListPlatformInvoicesUseCase,
  GetPlatformGrowthUseCase,
  GetPlatformUsageUseCase,
  RecordPaymentRefundUseCase,
} from './application/use-cases/platform-billing.use-cases';
import { GetOrgCreditsUseCase, GrantCreditUseCase, RevokeCreditUseCase } from './application/use-cases/credits.use-cases';
import {
  CreateManualInvoiceUseCase,
  MarkInvoicePaidUseCase,
  VoidInvoiceUseCase,
} from './application/use-cases/manual-invoices.use-cases';
import { CreateCouponUseCase, DeactivateCouponUseCase, ListCouponsUseCase } from './application/use-cases/coupons.use-cases';
import { ManualInvoiceRepository } from './infrastructure/repositories/manual-invoice.repository';
import { SuperAdminBillingOpsController } from './interfaces/controllers/super-admin-billing-ops.controller';

@Module({
  imports: [JwtModule.register({}), ConfigModule, BillingModule, ObservabilityModule, PlatformSettingsModule, GoogleOAuthModule],
  controllers: [
    SuperAdminAuthController,
    SuperAdminAccountsController,
    SuperAdminOrgsController,
    SuperAdminTicketsController,
    SuperAdminPlansController,
    SupportTicketsController,
    SuperAdminAuditController,
    SuperAdminSystemController,
    SuperAdminBillingController,
    SuperAdminBillingOpsController,
    SuperAdminAnnouncementsController,
    AnnouncementsController,
    SuperAdminNotificationsController,
    SuperAdminSettingsController,
  ],
  providers: [
    // Repositories
    SuperAdminRepository,
    SuperAdminSessionRepository,
    HelpTicketRepository,
    PlatformRepository,
    PlatformAuditRepository,
    SuperAdminNotificationRepository,
    ManualInvoiceRepository,
    // Application services
    PlatformAuditService,
    SuperAdminTicketNotifier,
    // Domain services
    SuperAdminTokenService,
    TotpService,
    EncryptionService,
    // Use cases
    SuperAdminAuthPolicy,
    SuperAdminSessionIssuer,
    SuperAdminLockout,
    SuperAdminSecondFactor,
    SuperAdminLoginUseCase,
    CompleteSuperAdminTwoFactorLoginUseCase,
    StartSuperAdminTwoFactorEnrollmentUseCase,
    CompleteSuperAdminTwoFactorEnrollmentUseCase,
    RefreshSuperAdminSessionUseCase,
    LogoutSuperAdminUseCase,
    ListSuperAdminSessionsUseCase,
    RevokeSuperAdminSessionUseCase,
    GetSuperAdminProfileUseCase,
    SetupSuperAdminTwoFactorUseCase,
    EnableSuperAdminTwoFactorUseCase,
    DisableSuperAdminTwoFactorUseCase,
    RegenerateSuperAdminRecoveryCodesUseCase,
    CompleteSuperAdminPasswordChangeLoginUseCase,
    ChangeSuperAdminPasswordUseCase,
    ListSuperAdminAccountsUseCase,
    CreateSuperAdminAccountUseCase,
    SetSuperAdminDisabledUseCase,
    ResetSuperAdminTwoFactorUseCase,
    AdminUpdateOrgUseCase,
    AdminDeleteOrgUseCase,
    AdminRestoreOrgUseCase,
    AdminExportOrgUseCase,
    GlobalSearchUseCase,
    GetPlatformStatsUseCase,
    GetAllOrgsUseCase,
    GetOrgDetailUseCase,
    GetPlatformActivityUseCase,
    ListSubscriptionsUseCase,
    ListPlatformAuditLogsUseCase,
    CreateAlertRuleUseCase,
    UpdateAlertRuleUseCase,
    DeleteAlertRuleUseCase,
    ListFailedJobsUseCase,
    RetryFailedJobUseCase,
    GetOrgMessagingHealthUseCase,
    AnnouncementRepository,
    GetOrgEntitlementsUseCase,
    SetEntitlementOverrideUseCase,
    RemoveEntitlementOverrideUseCase,
    ListKillSwitchesUseCase,
    SetKillSwitchUseCase,
    CreateAnnouncementUseCase,
    ListAnnouncementsUseCase,
    ArchiveAnnouncementUseCase,
    RestoreAnnouncementUseCase,
    UpdateAnnouncementUseCase,
    GetActiveAnnouncementsUseCase,
    DismissAnnouncementUseCase,
    ListPlatformPaymentsUseCase,
    ListPlatformInvoicesUseCase,
    GetPlatformGrowthUseCase,
    GetPlatformUsageUseCase,
    RecordPaymentRefundUseCase,
    GetOrgCreditsUseCase,
    GrantCreditUseCase,
    RevokeCreditUseCase,
    CreateManualInvoiceUseCase,
    MarkInvoicePaidUseCase,
    VoidInvoiceUseCase,
    ListCouponsUseCase,
    CreateCouponUseCase,
    DeactivateCouponUseCase,
    SuspendOrgUseCase,
    ReactivateOrgUseCase,
    AdminCancelSubscriptionUseCase,
    AdminChangePlanUseCase,
    AdminExtendTrialUseCase,
    SuperAdminCreatePlanUseCase,
    SuperAdminListPlansUseCase,
    SuperAdminUpdatePlanUseCase,
    SuperAdminArchivePlanUseCase,
    SuperAdminUnarchivePlanUseCase,
    SuperAdminDeletePlanUseCase,
    CreateTicketUseCase,
    GetTicketUseCase,
    ListTicketsUseCase,
    ReplyToTicketUseCase,
    UpdateTicketStatusUseCase,
    AssignTicketUseCase,
    ListSuperAdminNotificationsUseCase,
    MarkSuperAdminNotificationReadUseCase,
    MarkAllSuperAdminNotificationsReadUseCase,
    GetPlatformSettingsUseCase,
    UpdatePlatformSettingsUseCase,
    // Guards
    SuperAdminGuard,
  ],
})
export class SuperAdminModule {}
