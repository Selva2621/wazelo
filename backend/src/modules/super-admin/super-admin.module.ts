import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { BillingModule } from '@/modules/billing/billing.module';

// Repositories
import { SuperAdminRepository } from './infrastructure/repositories/super-admin.repository';
import { HelpTicketRepository } from './infrastructure/repositories/help-ticket.repository';

// Domain services
import { SuperAdminTokenService } from './domain/services/super-admin-token.service';

// Use cases
import { SuperAdminLoginUseCase } from './application/use-cases/super-admin-login.use-case';
import { GetPlatformStatsUseCase } from './application/use-cases/get-platform-stats.use-case';
import { GetAllOrgsUseCase } from './application/use-cases/get-all-orgs.use-case';
import { GetOrgDetailUseCase } from './application/use-cases/get-org-detail.use-case';
import {
  CreateTicketUseCase,
  GetTicketUseCase,
  ListTicketsUseCase,
  ReplyToTicketUseCase,
  UpdateTicketStatusUseCase,
} from './application/use-cases/ticket.use-cases';

// Guards
import { SuperAdminGuard } from './interfaces/guards/super-admin.guard';

// Controllers
import { SuperAdminAuthController } from './interfaces/controllers/super-admin-auth.controller';
import { SuperAdminOrgsController } from './interfaces/controllers/super-admin-orgs.controller';
import { SuperAdminTicketsController } from './interfaces/controllers/super-admin-tickets.controller';
import { SuperAdminPlansController } from './interfaces/controllers/super-admin-plans.controller';

@Module({
  imports: [JwtModule.register({}), ConfigModule, BillingModule],
  controllers: [
    SuperAdminAuthController,
    SuperAdminOrgsController,
    SuperAdminTicketsController,
    SuperAdminPlansController,
  ],
  providers: [
    // Repositories
    SuperAdminRepository,
    HelpTicketRepository,
    // Domain services
    SuperAdminTokenService,
    // Use cases
    SuperAdminLoginUseCase,
    GetPlatformStatsUseCase,
    GetAllOrgsUseCase,
    GetOrgDetailUseCase,
    CreateTicketUseCase,
    GetTicketUseCase,
    ListTicketsUseCase,
    ReplyToTicketUseCase,
    UpdateTicketStatusUseCase,
    // Guards
    SuperAdminGuard,
  ],
})
export class SuperAdminModule {}
