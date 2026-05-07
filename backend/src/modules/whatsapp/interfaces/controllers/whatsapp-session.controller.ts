import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { UsageLimitGuard, USAGE_LIMIT_KEY } from '@/modules/billing/interfaces/guards/usage-limit.guard';
import { UsageMetricType } from '@prisma/client';
import {
  InitiateSessionDto,
  DisconnectSessionDto,
  ListSessionsQueryDto,
} from '../../application/dto';
import {
  InitiateSessionUseCase,
  DisconnectSessionUseCase,
  ListSessionsUseCase,
  GetSessionUseCase,
  RefreshQrUseCase,
  ReconnectSessionUseCase,
} from '../../application/use-cases';

// Messaging endpoints moved to MessagesController (POST /messaging/messages) — EPIC 5

@Controller('whatsapp')
export class WhatsAppSessionController {
  constructor(
    private readonly initiateSessionUseCase: InitiateSessionUseCase,
    private readonly disconnectSessionUseCase: DisconnectSessionUseCase,
    private readonly listSessionsUseCase: ListSessionsUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly refreshQrUseCase: RefreshQrUseCase,
    private readonly reconnectSessionUseCase: ReconnectSessionUseCase,
  ) {}

  // ───── Session Management ─────

  @Post('sessions')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_OWN)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.WHATSAPP_SESSIONS)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  async initiateSession(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InitiateSessionDto,
    @Req() req: Request,
  ) {
    return this.initiateSessionUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      this.getIp(req),
      this.getUa(req),
    );
  }

  @Post('sessions/:sessionId/reconnect')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_OWN)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async reconnectSession(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Req() req: Request,
  ) {
    return this.reconnectSessionUseCase.execute(
      user.orgId,
      user.sub,
      user.role,
      sessionId,
      this.getIp(req),
      this.getUa(req),
    );
  }

  @Post('sessions/:sessionId/refresh-qr')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_OWN)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async refreshQr(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.refreshQrUseCase.execute(user.orgId, user.sub, sessionId);
  }

  @Delete('sessions')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_OWN)
  @HttpCode(HttpStatus.OK)
  async disconnectOwnSession(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DisconnectSessionDto,
    @Req() req: Request,
  ) {
    return this.disconnectSessionUseCase.execute(
      user.orgId,
      user.sub,
      user.role,
      dto,
      this.getIp(req),
      this.getUa(req),
    );
  }

  @Get('sessions/me')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_OWN)
  async getMySession(@CurrentUser() user: JwtPayload) {
    return this.getSessionUseCase.executeForUser(user.sub, user.orgId);
  }

  @Get('sessions/:sessionId')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_VIEW_ALL)
  async getSession(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.getSessionUseCase.execute(sessionId, user.orgId);
  }

  // ───── Admin Session Management ─────

  @Get('admin/sessions')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_VIEW_ALL)
  async listAllSessions(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSessionsQueryDto,
  ) {
    return this.listSessionsUseCase.execute(user.orgId, query);
  }

  @Delete('admin/sessions/:userId')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_ADMIN)
  @HttpCode(HttpStatus.OK)
  async adminForceDisconnect(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: DisconnectSessionDto,
    @Req() req: Request,
  ) {
    return this.disconnectSessionUseCase.execute(
      user.orgId,
      user.sub,
      user.role,
      { ...dto, targetUserId },
      this.getIp(req),
      this.getUa(req),
    );
  }

  // ───── Helpers ─────

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
