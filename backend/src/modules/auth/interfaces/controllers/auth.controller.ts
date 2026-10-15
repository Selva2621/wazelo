import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Get,
  Param,
  Delete,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public, CurrentUser, JwtPayload, Roles, CsrfProtected } from '@/common/decorators';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../../application/dto';
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
} from '../../application/use-cases';
import {
  CompleteGoogleAuthUseCase,
  GetAuthProvidersUseCase,
  StartGoogleAuthUseCase,
} from '../../application/use-cases/google-auth.use-cases';
import { GOOGLE_STATE_TTL_SECONDS } from '../../application/services/google-oauth-state.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly sessionManagementUseCase: SessionManagementUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly getAuthProvidersUseCase: GetAuthProvidersUseCase,
    private readonly startGoogleAuthUseCase: StartGoogleAuthUseCase,
    private readonly completeGoogleAuthUseCase: CompleteGoogleAuthUseCase,
    private readonly configService: ConfigService,
  ) {}

  // ───────────────────────────────────────────
  // PUBLIC ENDPOINTS
  // ───────────────────────────────────────────

  @Public()
  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.registerUseCase.execute(
      dto,
      this.getIp(req),
      this.getUa(req),
    );
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    return this.verifyEmailUseCase.execute(
      dto.token,
      this.getIp(req),
      this.getUa(req),
    );
  }

  @Public()
  @Post('resend-verification')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Req() req: Request,
  ) {
    return this.resendVerificationUseCase.execute(
      dto.email,
      this.getIp(req),
      this.getUa(req),
    );
  }

  @Public()
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginUseCase.execute(
      dto,
      this.getIp(req),
      this.getUa(req),
    );
    // Set refresh token as httpOnly cookie — never exposed to JavaScript
    this.setRefreshCookie(res, result.refreshToken, dto.rememberMe ?? false);
    // Strip refreshToken from JSON body
    const { refreshToken: _, ...jsonBody } = result;
    return jsonBody;
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.forgotPasswordUseCase.execute(
      dto.email,
      this.getIp(req),
      this.getUa(req),
    );
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.resetPasswordUseCase.execute(
      dto.token,
      dto.newPassword,
      this.getIp(req),
      this.getUa(req),
    );
  }

  @Public()
  // Acts on the SameSite=None refresh cookie: keep the x-requested-with check
  @CsrfProtected()
  @Post('refresh')
  // Every page load and open tab refreshes once; 3/min logged people out on quick reloads.
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req as any).cookies?.[this.REFRESH_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }
    const result = await this.refreshTokenUseCase.execute(
      refreshToken,
      this.getIp(req),
      this.getUa(req),
    );
    // Rotate the refresh token cookie — preserve original rememberMe setting. On the
    // concurrent-refresh grace path there is no new token: the browser already has it.
    if (result.refreshToken) {
      this.setRefreshCookie(res, result.refreshToken, result.rememberMe);
    }
    // Return only accessToken + expiresIn — never expose refreshToken or rememberMe
    const { refreshToken: _, rememberMe: __, ...jsonBody } = result;
    return jsonBody;
  }

  // ───────────────────────────────────────────
  // CONTINUE WITH GOOGLE (top-level browser navigations, so GET + redirects)
  // ───────────────────────────────────────────

  /** Which external sign-in options the auth pages should show. */
  @Public()
  @Get('providers')
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  async providers() {
    return this.getAuthProvidersUseCase.execute();
  }

  /** Starts Google sign-in: sets the short-lived state cookie and redirects to Google. */
  @Public()
  @Get('google/start')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async googleStart(
    @Query('intent') intent: string | undefined,
    @Query('remember') remember: string | undefined,
    @Res() res: Response,
  ) {
    const { redirectUrl, stateCookie } = await this.startGoogleAuthUseCase.execute({
      intent: intent === 'signup' ? 'signup' : 'signin',
      rememberMe: remember === '1' || remember === 'true',
    });
    res.cookie(this.GOOGLE_STATE_COOKIE, stateCookie, this.googleStateCookieOptions(GOOGLE_STATE_TTL_SECONDS * 1000));
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, redirectUrl);
  }

  /** Google redirects here. Ends on the frontend: /auth/google/complete, or the login page with ?ssoError=… */
  @Public()
  @Get('google/callback')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const stateCookie = (req as any).cookies?.[this.GOOGLE_STATE_COOKIE];
    // One attempt per state: clear it whatever happens next
    res.clearCookie(this.GOOGLE_STATE_COOKIE, this.googleStateCookieOptions());
    res.setHeader('Cache-Control', 'no-store');

    const result = await this.completeGoogleAuthUseCase.execute({
      code: typeof code === 'string' ? code : undefined,
      state: typeof state === 'string' ? state : undefined,
      error: typeof error === 'string' ? error : undefined,
      stateCookie: typeof stateCookie === 'string' ? stateCookie : undefined,
      ipAddress: this.getIp(req),
      userAgent: this.getUa(req),
    });

    const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3001').replace(/\/$/, '');
    if (!result.ok) {
      res.redirect(302, `${frontendUrl}/auth/login?ssoError=${encodeURIComponent(result.code)}`);
      return;
    }
    this.setRefreshCookie(res, result.refreshToken, result.rememberMe);
    // Hints only (the session itself is the HttpOnly refresh cookie): new account, remembered session
    const hints = new URLSearchParams();
    if (result.isNewUser) hints.set('new', '1');
    if (result.rememberMe) hints.set('r', '1');
    const query = hints.toString();
    res.redirect(302, `${frontendUrl}/auth/google/complete${query ? `?${query}` : ''}`);
  }

  // ───────────────────────────────────────────
  // AUTHENTICATED ENDPOINTS
  // ───────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req as any).cookies?.[this.REFRESH_COOKIE] ?? '';
    this.clearRefreshCookie(res);
    return this.logoutUseCase.execute(
      refreshToken,
      user.sub,
      user.orgId,
      this.getIp(req),
      this.getUa(req),
    );
  }

  @Get('sessions')
  async listSessions(@CurrentUser() user: JwtPayload) {
    return this.sessionManagementUseCase.listActiveSessions(
      user.sub,
      user.orgId,
    );
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.sessionManagementUseCase.revokeSession(
      sessionId,
      user.sub,
      user.orgId,
      user.role,
      this.getIp(req),
      this.getUa(req),
    );
  }

  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.sessionManagementUseCase.revokeAllSessions(
      user.sub,
      user.orgId,
      undefined,
      this.getIp(req),
      this.getUa(req),
    );
  }

  // Admin-only: revoke a session by ID (can be any user in the org)
  @Delete('admin/sessions/:sessionId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async adminRevokeSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.sessionManagementUseCase.revokeSession(
      sessionId,
      user.sub,
      user.orgId,
      user.role,
      this.getIp(req),
      this.getUa(req),
    );
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    // The caller's own session survives; every other session is revoked.
    const currentRefreshToken = (req as any).cookies?.[this.REFRESH_COOKIE];
    await this.changePasswordUseCase.execute(
      user.sub,
      dto.oldPassword,
      dto.newPassword,
      currentRefreshToken,
    );
    return { message: 'Password changed successfully' };
  }

  // ───────────────────────────────────────────
  // HELPERS
  // ───────────────────────────────────────────

  /**
   * Cookie name — use __Host- prefix in production (requires Secure + path=/ + no Domain).
   * In local dev (HTTP), the prefix would be rejected by browsers, so use plain name.
   */
  private get REFRESH_COOKIE(): string {
    return process.env.NODE_ENV === 'production'
      ? '__Host-refresh_token'
      : 'refresh_token';
  }

  private setRefreshCookie(res: Response, token: string, rememberMe = false): void {
    const isProd = process.env.NODE_ENV === 'production';
    const maxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000  // 30 days
      : 1  * 24 * 60 * 60 * 1000; // 1 day
    res.cookie(this.REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      // The frontend (app.wazelo.in) calls the API on another site (onrender.com): a Lax
      // cookie is never sent there, so /auth/refresh would 401 on every reload. CSRF is
      // covered by the CORS origin allowlist + required x-requested-with header.
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge,
    });
  }

  /** State/PKCE cookie for one Google sign-in attempt. Lax: it must ride along on Google's top-level redirect back. */
  private get GOOGLE_STATE_COOKIE(): string {
    return process.env.NODE_ENV === 'production' ? '__Secure-g_oauth' : 'g_oauth';
  }

  private googleStateCookieOptions(maxAge?: number) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      ...(maxAge ? { maxAge } : {}),
    };
  }

  private clearRefreshCookie(res: Response): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie(this.REFRESH_COOKIE, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });
  }

  private getIp(req: Request): string {
    // req.ip honours the app's `trust proxy` setting, so a client can't spoof
    // X-Forwarded-For into audit logs.
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private getUa(req: Request): string {
    return (req.headers['user-agent'] as string) || 'unknown';
  }
}
