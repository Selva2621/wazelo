import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

// Domain services
import { PasswordService } from './domain/services/password.service';
import { TokenService } from './domain/services/token.service';

// Repositories
import { SessionRepository } from './infrastructure/repositories/session.repository';
import { TokenRepository } from './infrastructure/repositories/token.repository';
import { UserIdentityRepository } from './infrastructure/repositories/user-identity.repository';

// Application services
import { SessionIssuer } from './application/services/session-issuer.service';
import { GoogleOAuthStateCodec } from './application/services/google-oauth-state.service';

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
import {
  GetAuthProvidersUseCase,
  StartGoogleAuthUseCase,
  CompleteGoogleAuthUseCase,
} from './application/use-cases/google-auth.use-cases';

// Controller
import { AuthController } from './interfaces/controllers/auth.controller';

// Guard
import { JwtAuthGuard } from './interfaces/guards/jwt-auth.guard';

// Dependent modules
import { OrgModule } from '../org/org.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { GoogleOAuthModule } from '@/infrastructure/external/google/google-oauth.module';

@Module({
  imports: [
    JwtModule.register({}),
    OrgModule,
    forwardRef(() => UsersModule),
    AuditModule,
    PlatformSettingsModule,
    GoogleOAuthModule,
  ],
  controllers: [AuthController],
  providers: [
    // Domain services
    PasswordService,
    TokenService,

    // Repositories
    SessionRepository,
    TokenRepository,
    UserIdentityRepository,

    // Application services
    SessionIssuer,
    GoogleOAuthStateCodec,

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
    GetAuthProvidersUseCase,
    StartGoogleAuthUseCase,
    CompleteGoogleAuthUseCase,

    // Guard
    JwtAuthGuard,
  ],
  exports: [JwtAuthGuard, TokenService, PasswordService],
})
export class AuthModule {}
