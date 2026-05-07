import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

// Domain services
import { PasswordService } from './domain/services/password.service';
import { TokenService } from './domain/services/token.service';

// Repositories
import { SessionRepository } from './infrastructure/repositories/session.repository';
import { TokenRepository } from './infrastructure/repositories/token.repository';

// Use cases
import {
  RegisterUseCase,
  VerifyEmailUseCase,
  ResendVerificationUseCase,
  LoginUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  SessionManagementUseCase,
  ChangePasswordUseCase,
} from './application/use-cases';

// Controller
import { AuthController } from './interfaces/controllers/auth.controller';

// Guard
import { JwtAuthGuard } from './interfaces/guards/jwt-auth.guard';

// Dependent modules
import { OrgModule } from '../org/org.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    JwtModule.register({}),
    OrgModule,
    forwardRef(() => UsersModule),
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    // Domain services
    PasswordService,
    TokenService,

    // Repositories
    SessionRepository,
    TokenRepository,

    // Use cases
    RegisterUseCase,
    VerifyEmailUseCase,
    ResendVerificationUseCase,
    LoginUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    SessionManagementUseCase,
    ChangePasswordUseCase,

    // Guard
    JwtAuthGuard,
  ],
  exports: [JwtAuthGuard, TokenService, PasswordService],
})
export class AuthModule {}
