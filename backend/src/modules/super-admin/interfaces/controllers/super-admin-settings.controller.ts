import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import {
  GetPlatformSettingsUseCase,
  UpdatePlatformSettingsUseCase,
} from '../../application/use-cases/platform-settings.use-cases';
import { UpdatePlatformSettingsDto } from '../../application/dto/platform-settings.dto';
import { requestMeta } from '../request-meta';

/** Platform-wide settings: Google sign-in credentials and whether new users may sign up with Google. */
@Controller('super-admin/settings')
@SuperAdminOnly()
export class SuperAdminSettingsController {
  constructor(
    private readonly getSettingsUseCase: GetPlatformSettingsUseCase,
    private readonly updateSettingsUseCase: UpdatePlatformSettingsUseCase,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async get(@Req() req: Request) {
    return this.getSettingsUseCase.execute(this.callbackUrl(req));
  }

  @Patch()
  async update(@Body() dto: UpdatePlatformSettingsDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.updateSettingsUseCase.execute(dto, { id: user.sub, email: user.email }, requestMeta(req), this.callbackUrl(req));
  }

  /**
   * This backend's Google callback as the browser reaches it. Express 5 `req.protocol` and
   * `req.host` honour the app's trust proxy setting (X-Forwarded-Proto/-Host), so behind
   * Nginx or the frontend's /api/v1 rewrite this is the public URL.
   */
  private callbackUrl(req: Request): string {
    const prefix = this.config.get<string>('app.apiPrefix', 'api/v1').replace(/^\/+|\/+$/g, '');
    return `${req.protocol}://${req.host}/${prefix}/auth/google/callback`;
  }
}
