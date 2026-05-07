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
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public, CurrentUser, JwtPayload, Roles } from '@/common/decorators';
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
  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
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
    // Rotate the refresh token cookie
    this.setRefreshCookie(res, result.refreshToken);
    // Return only accessToken + expiresIn — never expose refreshToken
    const { refreshToken: _, ...jsonBody } = result;
    return jsonBody;
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
  ) {
    await this.changePasswordUseCase.execute(
      user.sub,
      dto.oldPassword,
      dto.newPassword,
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
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }

  private clearRefreshCookie(res: Response): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie(this.REFRESH_COOKIE, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });
  }

  private getIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private getUa(req: Request): string {
    return (req.headers['user-agent'] as string) || 'unknown';
  }
}
