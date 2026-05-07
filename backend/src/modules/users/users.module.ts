import { Module, forwardRef } from '@nestjs/common';

// Repositories
import { UserRepository } from './infrastructure/repositories/user.repository';
import { InvitationRepository } from './infrastructure/repositories/invitation.repository';

// Use cases
import {
  InviteUserUseCase,
  AcceptInviteUseCase,
  CreateUserUseCase,
  ListUsersUseCase,
  GetUserUseCase,
  UpdateUserUseCase,
  ChangeRoleUseCase,
  DisableUserUseCase,
  EnableUserUseCase,
  DeleteUserUseCase,
  RevokeInviteUseCase,
  ListInvitationsUseCase,
} from './application/use-cases';

// Controller
import { UsersController } from './interfaces/controllers/users.controller';

// Dependent modules
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    AuditModule,
    BillingModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [
    // Repositories
    UserRepository,
    InvitationRepository,

    // Use cases
    InviteUserUseCase,
    AcceptInviteUseCase,
    CreateUserUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    ChangeRoleUseCase,
    DisableUserUseCase,
    EnableUserUseCase,
    DeleteUserUseCase,
    RevokeInviteUseCase,
    ListInvitationsUseCase,
  ],
  exports: [UserRepository, InvitationRepository],
})
export class UsersModule {}
