import {
  Controller, Post, Get, Body, HttpCode, HttpStatus, Req, Res, UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import {
  SuperAdminLoginDto,
  SuperAdminTwoFactorCodeDto,
  SuperAdminTwoFactorLoginDto,
} from '../../application/dto/super-admin-auth.dto';
import {
  SuperAdminLoginUseCase,
  CompleteSuperAdminTwoFactorLoginUseCase,
  RefreshSuperAdminSessionUseCase,
  LogoutSuperAdminUseCase,
  GetSuperAdminProfileUseCase,
  SetupSuperAdminTwoFactorUseCase,
  EnableSuperAdminTwoFactorUseCase,
  DisableSuperAdminTwoFactorUseCase,
  SuperAdminSession,
} from '../../application/use-cases/super-admin-auth.use-cases';
import { SuperAdminTokenService } from '../../domain/services/super-admin-token.service';
import { requestMeta } from '../request-meta';

const REFRESH_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // matches the 1d refresh token expiry

@Controller('super-admin/auth')
export class SuperAdminAuthController {
  constructor(
    private readonly loginUseCase: SuperAdminLoginUseCase,
    private readonly twoFactorLoginUseCase: CompleteSuperAdminTwoFactorLoginUseCase,
    private readonly refreshUseCase: RefreshSuperAdminSessionUseCase,
    private readonly logoutUseCase: LogoutSuperAdminUseCase,
    private readonly profileUseCase: GetSuperAdminProfileUseCase,
    private readonly setupTwoFactorUseCase: SetupSuperAdminTwoFactorUseCase,
    private readonly enableTwoFactorUseCase: EnableSuperAdminTwoFactorUseCase,
    private readonly disableTwoFactorUseCase: DisableSuperAdminTwoFactorUseCase,
    private readonly tokenService: SuperAdminTokenService,
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
    const result = await this.loginUseCase.execute(dto, requestMeta(req));
    if (result.requiresTwoFactor) {
      return result;
    }
    return { requiresTwoFactor: false, ...this.startSession(res, result) };
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

  @Post('refresh')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[this.REFRESH_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }
    try {
      const session = await this.refreshUseCase.execute(refreshToken);
      return this.startSession(res, session);
    } catch (err) {
      this.clearRefreshCookie(res);
      throw err;
    }
  }

  /**
   * Public so an expired access token can still log out: the refresh cookie
   * identifies the account. Revokes every session for that account.
   */
  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[this.REFRESH_COOKIE];
    this.clearRefreshCookie(res);
    if (!refreshToken) return;
    try {
      const payload = await this.tokenService.verify(refreshToken, 'refresh');
      await this.logoutUseCase.execute(payload.sub, requestMeta(req));
    } catch {
      // Already expired or revoked — nothing left to revoke
    }
  }

  @Get('me')
  @SuperAdminOnly()
  async me(@CurrentUser() user: JwtPayload) {
    return this.profileUseCase.execute(user.sub);
  }

  @Post('2fa/setup')
  @SuperAdminOnly()
  @HttpCode(HttpStatus.OK)
  async setupTwoFactor(@CurrentUser() user: JwtPayload) {
    return this.setupTwoFactorUseCase.execute(user.sub);
  }

  @Post('2fa/enable')
  @SuperAdminOnly()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async enableTwoFactor(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SuperAdminTwoFactorCodeDto,
    @Req() req: Request,
  ) {
    return this.enableTwoFactorUseCase.execute(user.sub, dto.code, requestMeta(req));
  }

  @Post('2fa/disable')
  @SuperAdminOnly()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async disableTwoFactor(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SuperAdminTwoFactorCodeDto,
    @Req() req: Request,
  ) {
    return this.disableTwoFactorUseCase.execute(user.sub, dto.code, requestMeta(req));
  }

  // ───────────────────────────────────────────
  // HELPERS
  // ───────────────────────────────────────────

  /** Sets the refresh cookie and returns the session body without the refresh token. */
  private startSession(res: Response, session: SuperAdminSession) {
    const { refreshToken, ...body } = session;
    this.setRefreshCookie(res, refreshToken);
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
      // Cross-site API in production: see AuthController.setRefreshCookie
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: REFRESH_COOKIE_MAX_AGE,
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
