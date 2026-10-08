import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { BillingModule } from '@/modules/billing/billing.module';
import { ObservabilityModule } from '@/modules/observability/observability.module';
import { EncryptionService } from '@/common/services/encryption.service';

// Repositories
import { SuperAdminRepository } from './infrastructure/repositories/super-admin.repository';
import { HelpTicketRepository } from './infrastructure/repositories/help-ticket.repository';
import { PlatformRepository } from './infrastructure/repositories/platform.repository';
import { PlatformAuditRepository } from './infrastructure/repositories/platform-audit.repository';

// Application services
import { PlatformAuditService } from './application/services/platform-audit.service';

// Domain services
import { SuperAdminTokenService } from './domain/services/super-admin-token.service';
import { TotpService } from './domain/services/totp.service';

// Use cases
import {
  SuperAdminSessionIssuer,
  SuperAdminTotpVerifier,
  SuperAdminLoginUseCase,
  CompleteSuperAdminTwoFactorLoginUseCase,
  RefreshSuperAdminSessionUseCase,
  LogoutSuperAdminUseCase,
  GetSuperAdminProfileUseCase,
  SetupSuperAdminTwoFactorUseCase,
  EnableSuperAdminTwoFactorUseCase,
  DisableSuperAdminTwoFactorUseCase,
} from './application/use-cases/super-admin-auth.use-cases';
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
  SuperAdminUpdatePlanUseCase,
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
import { CreateAlertRuleUseCase } from './application/use-cases/create-alert-rule.use-case';
import { GetOrgMessagingHealthUseCase } from './application/use-cases/get-org-messaging-health.use-case';
import { AnnouncementRepository } from './infrastructure/repositories/announcement.repository';
import {
  GetOrgEntitlementsUseCase,
  SetEntitlementOverrideUseCase,
  RemoveEntitlementOverrideUseCase,
} from './application/use-cases/entitlements.use-cases';
import {
  CreateAnnouncementUseCase,
  ListAnnouncementsUseCase,
  ArchiveAnnouncementUseCase,
  GetActiveAnnouncementsUseCase,
  DismissAnnouncementUseCase,
} from './application/use-cases/announcements.use-cases';
import { SuperAdminAnnouncementsController } from './interfaces/controllers/super-admin-announcements.controller';
import { AnnouncementsController } from './interfaces/controllers/announcements.controller';
import {
  ListPlatformPaymentsUseCase,
  ListPlatformInvoicesUseCase,
  GetPlatformGrowthUseCase,
} from './application/use-cases/platform-billing.use-cases';

@Module({
  imports: [JwtModule.register({}), ConfigModule, BillingModule, ObservabilityModule],
  controllers: [
    SuperAdminAuthController,
    SuperAdminOrgsController,
    SuperAdminTicketsController,
    SuperAdminPlansController,
    SupportTicketsController,
    SuperAdminAuditController,
    SuperAdminSystemController,
    SuperAdminBillingController,
    SuperAdminAnnouncementsController,
    AnnouncementsController,
  ],
  providers: [
    // Repositories
    SuperAdminRepository,
    HelpTicketRepository,
    PlatformRepository,
    PlatformAuditRepository,
    // Application services
    PlatformAuditService,
    // Domain services
    SuperAdminTokenService,
    TotpService,
    EncryptionService,
    // Use cases
    SuperAdminSessionIssuer,
    SuperAdminTotpVerifier,
    SuperAdminLoginUseCase,
    CompleteSuperAdminTwoFactorLoginUseCase,
    RefreshSuperAdminSessionUseCase,
    LogoutSuperAdminUseCase,
    GetSuperAdminProfileUseCase,
    SetupSuperAdminTwoFactorUseCase,
    EnableSuperAdminTwoFactorUseCase,
    DisableSuperAdminTwoFactorUseCase,
    GetPlatformStatsUseCase,
    GetAllOrgsUseCase,
    GetOrgDetailUseCase,
    GetPlatformActivityUseCase,
    ListSubscriptionsUseCase,
    ListPlatformAuditLogsUseCase,
    CreateAlertRuleUseCase,
    GetOrgMessagingHealthUseCase,
    AnnouncementRepository,
    GetOrgEntitlementsUseCase,
    SetEntitlementOverrideUseCase,
    RemoveEntitlementOverrideUseCase,
    CreateAnnouncementUseCase,
    ListAnnouncementsUseCase,
    ArchiveAnnouncementUseCase,
    GetActiveAnnouncementsUseCase,
    DismissAnnouncementUseCase,
    ListPlatformPaymentsUseCase,
    ListPlatformInvoicesUseCase,
    GetPlatformGrowthUseCase,
    SuspendOrgUseCase,
    ReactivateOrgUseCase,
    AdminCancelSubscriptionUseCase,
    AdminChangePlanUseCase,
    AdminExtendTrialUseCase,
    SuperAdminCreatePlanUseCase,
    SuperAdminUpdatePlanUseCase,
    CreateTicketUseCase,
    GetTicketUseCase,
    ListTicketsUseCase,
    ReplyToTicketUseCase,
    UpdateTicketStatusUseCase,
    AssignTicketUseCase,
    // Guards
    SuperAdminGuard,
  ],
})
export class SuperAdminModule {}
