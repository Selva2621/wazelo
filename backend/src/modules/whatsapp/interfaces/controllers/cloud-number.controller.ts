import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { ConnectCloudNumberDto, UpdateCloudCredentialsDto } from '../../application/dto/connect-cloud-number.dto';
import { CloudNumberUseCase } from '../../application/use-cases/cloud-number.use-case';

function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  return typeof fwd === 'string' ? fwd.split(',')[0].trim() : req.ip || 'unknown';
}

/** The org's official WhatsApp numbers (Meta Cloud API) */
@Controller('whatsapp/cloud-numbers')
export class CloudNumberController {
  constructor(private readonly cloudNumbers: CloudNumberUseCase) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_VIEW_ALL)
  list(@CurrentUser('orgId') orgId: string) {
    return this.cloudNumbers.list(orgId);
  }

  /** Approved Meta templates, for template pickers (campaigns, automations, inbox) */
  @Get('templates')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  listTemplates(
    @CurrentUser('orgId') orgId: string,
    @Query('sessionId', new ParseUUIDPipe({ optional: true })) sessionId?: string,
  ) {
    return this.cloudNumbers.listApprovedTemplates(orgId, sessionId);
  }

  @Post(':id/sync-templates')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_VIEW_ALL)
  @Throttle({ default: { ttl: 60000, limit: 6 } })
  @HttpCode(HttpStatus.OK)
  syncTemplates(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.cloudNumbers.syncTemplates(orgId, id);
  }

  @Post()
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_ADMIN)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  connect(@CurrentUser() user: JwtPayload, @Body() dto: ConnectCloudNumberDto, @Req() req: Request) {
    return this.cloudNumbers.connect(user.orgId, user.sub, dto, clientIp(req), req.headers['user-agent']);
  }

  @Post(':id/refresh')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_ADMIN)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  refresh(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.cloudNumbers.refresh(orgId, id);
  }

  @Patch(':id/credentials')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_ADMIN)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  updateCredentials(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCloudCredentialsDto,
  ) {
    return this.cloudNumbers.updateCredentials(user.orgId, user.sub, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.WHATSAPP_SESSION_ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.cloudNumbers.remove(user.orgId, user.sub, id, clientIp(req), req.headers['user-agent']);
  }
}

/** Meta calls these for each official number: handshake (GET) and messages/statuses (POST) */
@Controller('webhooks/whatsapp-cloud')
@Public()
export class WhatsAppCloudWebhookController {
  constructor(private readonly cloudNumbers: CloudNumberUseCase) {}

  @Get(':sessionId')
  async verify(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const echo = await this.cloudNumbers.verifyWebhook(sessionId, mode, token, challenge);
    return echo === null ? res.status(403).send('Verification failed') : res.status(200).send(echo);
  }

  @Post(':sessionId')
  @HttpCode(HttpStatus.OK)
  async receive(@Param('sessionId', ParseUUIDPipe) sessionId: string, @Req() req: RawBodyRequest<Request>) {
    const ok = await this.cloudNumbers.receiveWebhook(
      sessionId,
      req.rawBody,
      req.headers['x-hub-signature-256'] as string | undefined,
      req.body,
    );
    // Always 200 so Meta doesn't keep retrying; a bad signature is simply ignored
    return { status: ok ? 'ok' : 'ignored' };
  }
}
