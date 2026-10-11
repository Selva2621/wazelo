import {
  Controller, Post, Get, Delete, Body, Param, HttpCode, HttpStatus, Req, Res, UnauthorizedException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { CsrfProtected } from '@/common/decorators/csrf-protected.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { SuperAdminRequestUser } from '../guards/super-admin.guard';
import {
  SuperAdminChallengeDto,
  SuperAdminLoginDto,
  SuperAdminTwoFactorCodeDto,
  SuperAdminTwoFactorEnrollDto,
  SuperAdminTwoFactorLoginDto,
  SuperAdminPasswordChangeLoginDto,
  ChangeSuperAdminPasswordDto,
} from '../../application/dto/super-admin-auth.dto';
import {
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
  SuperAdminSession,
  SuperAdminLoginResult,
} from '../../application/use-cases/super-admin-auth.use-cases';
import { REFRESH_EXPIRY_MS } from '../../domain/services/super-admin-token.service';
import { requestMeta } from '../request-meta';

@Controller('super-admin/auth')
export class SuperAdminAuthController {
  constructor(
    private readonly loginUseCase: SuperAdminLoginUseCase,
    private readonly twoFactorLoginUseCase: CompleteSuperAdminTwoFactorLoginUseCase,
    private readonly startEnrollmentUseCase: StartSuperAdminTwoFactorEnrollmentUseCase,
    private readonly completeEnrollmentUseCase: CompleteSuperAdminTwoFactorEnrollmentUseCase,
    private readonly refreshUseCase: RefreshSuperAdminSessionUseCase,
    private readonly logoutUseCase: LogoutSuperAdminUseCase,
    private readonly listSessionsUseCase: ListSuperAdminSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSuperAdminSessionUseCase,
    private readonly profileUseCase: GetSuperAdminProfileUseCase,
    private readonly setupTwoFactorUseCase: SetupSuperAdminTwoFactorUseCase,
    private readonly enableTwoFactorUseCase: EnableSuperAdminTwoFactorUseCase,
    private readonly disableTwoFactorUseCase: DisableSuperAdminTwoFactorUseCase,
    private readonly regenerateRecoveryCodesUseCase: RegenerateSuperAdminRecoveryCodesUseCase,
    private readonly passwordChangeLoginUseCase: CompleteSuperAdminPasswordChangeLoginUseCase,
    private readonly changePasswordUseCase: ChangeSuperAdminPasswordUseCase,
  ) {}

  @Post('login')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: SuperAdminLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondToLoginStep(res, await this.loginUseCase.execute(dto, requestMeta(req)));
  }

  /** First sign-in with a temporary password: set a real one, then continue (usually to 2FA). */
  @Post('login/password')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async loginPasswordChange(
    @Body() dto: SuperAdminPasswordChangeLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.passwordChangeLoginUseCase.execute(dto.challengeToken, dto.newPassword, requestMeta(req));
    return this.respondToLoginStep(res, result);
  }

  /** Self-service password change; signs out this account's other devices. */
  @Post('password')
  @SuperAdminOnly()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: SuperAdminRequestUser,
    @Body() dto: ChangeSuperAdminPasswordDto,
    @Req() req: Request,
  ) {
    return this.changePasswordUseCase.execute(
      user.sub,
      user.sessionFamilyId,
      dto.currentPassword,
      dto.newPassword,
      requestMeta(req),
    );
  }

  @Post('login/2fa')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async loginTwoFactor(
    @Body() dto: SuperAdminTwoFactorLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.twoFactorLoginUseCase.execute(dto.challengeToken, dto.code, requestMeta(req));
    return this.startSession(res, session);
  }

  /** Mandatory 2FA enrolment during sign-in: returns the QR code for the new secret. */
  @Post('login/2fa/setup')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async loginTwoFactorSetup(@Body() dto: SuperAdminChallengeDto, @Req() req: Request) {
    return this.startEnrollmentUseCase.execute(dto.challengeToken, requestMeta(req));
  }

  /** Confirms the first code, turns 2FA on and signs in. Recovery codes are shown once. */
  @Post('login/2fa/enroll')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async loginTwoFactorEnroll(
    @Body() dto: SuperAdminTwoFactorEnrollDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { recoveryCodes, ...session } = await this.completeEnrollmentUseCase.execute(
      dto.challengeToken,
      dto.code,
      requestMeta(req),
    );
    return { ...this.startSession(res, session), recoveryCodes };
  }

  @Post('refresh')
  @Public()
  @CsrfProtected()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[this.REFRESH_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }
    try {
      const session = await this.refreshUseCase.execute(refreshToken, requestMeta(req));
      return this.startSession(res, session);
    } catch (err) {
      this.clearRefreshCookie(res);
      throw err;
    }
  }

  /**
   * Public so an expired access token can still log out: the refresh cookie
   * identifies the session. Signs out this device only.
   */
  @Post('logout')
  @Public()
  @CsrfProtected()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[this.REFRESH_COOKIE];
    this.clearRefreshCookie(res);
    if (refreshToken) {
      await this.logoutUseCase.execute(refreshToken, requestMeta(req));
    }
  }

  @Post('logout-all')
  @SuperAdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutEverywhere(
    @CurrentUser() user: SuperAdminRequestUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearRefreshCookie(res);
    await this.logoutUseCase.everywhere(user.sub, requestMeta(req));
  }

  @Get('sessions')
  @SuperAdminOnly()
  async sessions(@CurrentUser() user: SuperAdminRequestUser) {
    return this.listSessionsUseCase.execute(user.sub, user.sessionFamilyId);
  }

  @Delete('sessions/:id')
  @SuperAdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @CurrentUser() user: SuperAdminRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    await this.revokeSessionUseCase.execute({ id: user.sub, email: user.email }, id, requestMeta(req));
  }

  @Get('me')
  @SuperAdminOnly()
  async me(@CurrentUser() user: SuperAdminRequestUser) {
    return this.profileUseCase.execute(user.sub);
  }

  @Post('2fa/setup')
  @SuperAdminOnly()
  @HttpCode(HttpStatus.OK)
  async setupTwoFactor(@CurrentUser() user: SuperAdminRequestUser, @Req() req: Request) {
    return this.setupTwoFactorUseCase.execute(user.sub, requestMeta(req));
  }

  /** Returns the profile plus recovery codes (shown once). Signs out other devices. */
  @Post('2fa/enable')
  @SuperAdminOnly()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async enableTwoFactor(
    @CurrentUser() user: SuperAdminRequestUser,
    @Body() dto: SuperAdminTwoFactorCodeDto,
    @Req() req: Request,
  ) {
    const { profile, recoveryCodes } = await this.enableTwoFactorUseCase.execute(
      user.sub,
      user.sessionFamilyId,
      dto.code,
      requestMeta(req),
    );
    return { ...profile, recoveryCodes };
  }

  @Post('2fa/disable')
  @SuperAdminOnly()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async disableTwoFactor(
    @CurrentUser() user: SuperAdminRequestUser,
    @Body() dto: SuperAdminTwoFactorCodeDto,
    @Req() req: Request,
  ) {
    return this.disableTwoFactorUseCase.execute(user.sub, dto.code, requestMeta(req));
  }

  @Post('2fa/recovery-codes')
  @SuperAdminOnly()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async regenerateRecoveryCodes(
    @CurrentUser() user: SuperAdminRequestUser,
    @Body() dto: SuperAdminTwoFactorCodeDto,
    @Req() req: Request,
  ) {
    return this.regenerateRecoveryCodesUseCase.execute(user.sub, dto.code, requestMeta(req));
  }

  // ───────────────────────────────────────────
  // HELPERS
  // ───────────────────────────────────────────

  /** A further step (2FA, enrolment, password change) goes back as-is; a finished login starts the session. */
  private respondToLoginStep(res: Response, result: SuperAdminLoginResult) {
    if (result.requiresTwoFactor || result.requiresTwoFactorSetup || result.requiresPasswordChange) {
      return result;
    }
    return {
      requiresTwoFactor: false,
      requiresTwoFactorSetup: false,
      requiresPasswordChange: false,
      ...this.startSession(res, result),
    };
  }

  /** Sets the refresh cookie (when rotated) and returns the session body without the refresh token. */
  private startSession(res: Response, session: SuperAdminSession) {
    const { refreshToken, ...body } = session;
    if (refreshToken) this.setRefreshCookie(res, refreshToken);
    return body;
  }

  /** Separate from the tenant `refresh_token` cookie so the two sessions never collide. */
  private get REFRESH_COOKIE(): string {
    return process.env.NODE_ENV === 'production' ? '__Host-sa_refresh_token' : 'sa_refresh_token';
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(this.REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // Cross-site API in production: see AuthController.setRefreshCookie.
      // Refresh and logout are @CsrfProtected, so SameSite=None is safe here.
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: REFRESH_EXPIRY_MS,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(this.REFRESH_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
  }
}
