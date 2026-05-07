import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  Res,
  Query,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '@/common/decorators/public.decorator';
import { LeadAdWebhookService } from '../../domain/services/lead-ad-webhook.service';
import { LeadAdsConfigRepository } from '../../infrastructure/repositories/lead-ads-config.repository';

@Controller('webhooks/meta')
@Public()
export class LeadAdsWebhookController {
  constructor(
    private readonly webhookService: LeadAdWebhookService,
    private readonly configService: ConfigService,
    private readonly leadAdsConfigRepo: LeadAdsConfigRepository,
  ) {}

  // ─── Per-Org Routes (new — each org has their own Meta App) ───

  /**
   * GET /webhooks/meta/leadgen/:orgId — Per-org Meta webhook verification
   */
  @Get('leadgen/:orgId')
  async verifyWebhookPerOrg(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expectedToken = await this.leadAdsConfigRepo.getVerifyToken(orgId);
    if (!expectedToken) {
      return res.status(503).send('Webhook verify token not configured for this organization');
    }

    if (
      mode === 'subscribe' &&
      this.webhookService.verifyChallenge(verifyToken, expectedToken)
    ) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send('Verification failed');
  }

  /**
   * POST /webhooks/meta/leadgen/:orgId — Per-org receive leadgen events
   */
  @Post('leadgen/:orgId')
  @HttpCode(HttpStatus.OK)
  async receiveWebhookPerOrg(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = req.rawBody;

    const appSecret = await this.leadAdsConfigRepo.getDecryptedAppSecret(orgId);
    if (!appSecret) {
      return { status: 'error', message: 'Meta App Secret not configured for this organization' };
    }
    if (!signature || !rawBody) {
      return { status: 'error', message: 'Missing signature' };
    }
    const valid = this.webhookService.verifySignature(rawBody, signature, appSecret);
    if (!valid) {
      return { status: 'error', message: 'Invalid signature' };
    }

    const entries = this.webhookService.parseWebhookBody(req.body);
    if (entries.length > 0) {
      await this.webhookService.processWebhookEntries(entries, req.body);
    }

    return { status: 'ok' };
  }

  // ─── Global Fallback Routes (backward compat — uses env vars) ───

  /**
   * GET /webhooks/meta/leadgen — Global Meta webhook verification (legacy)
   */
  @Get('leadgen')
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expectedToken = this.configService.get<string>(
      'META_WEBHOOK_VERIFY_TOKEN',
    );

    if (!expectedToken) {
      return res.status(503).send('Webhook verify token not configured');
    }

    if (
      mode === 'subscribe' &&
      this.webhookService.verifyChallenge(verifyToken, expectedToken)
    ) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send('Verification failed');
  }

  /**
   * POST /webhooks/meta/leadgen — Global receive leadgen events (legacy)
   */
  @Post('leadgen')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Req() req: RawBodyRequest<Request>,
  ) {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = req.rawBody;

    const appSecret = this.configService.get<string>('META_APP_SECRET');
    if (!appSecret) {
      return { status: 'error', message: 'META_APP_SECRET not configured' };
    }
    if (!signature || !rawBody) {
      return { status: 'error', message: 'Missing signature' };
    }
    const valid = this.webhookService.verifySignature(rawBody, signature, appSecret);
    if (!valid) {
      return { status: 'error', message: 'Invalid signature' };
    }

    const entries = this.webhookService.parseWebhookBody(req.body);
    if (entries.length > 0) {
      await this.webhookService.processWebhookEntries(entries, req.body);
    }

    return { status: 'ok' };
  }
}
