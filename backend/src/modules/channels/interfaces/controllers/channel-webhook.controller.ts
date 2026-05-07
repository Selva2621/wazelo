import {
  Controller,
  Post,
  Get,
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
import { Public } from '@/common/decorators/public.decorator';
import { ChannelWebhookService } from '../../domain/services/channel-webhook.service';

@Controller('webhooks/channels')
@Public()
export class ChannelWebhookController {
  constructor(
    private readonly webhookService: ChannelWebhookService,
  ) {}

  /**
   * GET /webhooks/channels/:channelId — Webhook verification (Meta challenge)
   */
  @Get(':channelId')
  async verifyWebhook(
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe') {
      const valid = await this.webhookService.verifyChallenge(
        channelId,
        verifyToken,
      );
      if (valid) {
        return res.status(200).send(challenge);
      }
    }
    return res.status(403).send('Verification failed');
  }

  /**
   * POST /webhooks/channels/:channelId — Receive inbound messages & status updates
   */
  @Post(':channelId')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const signature = (req.headers['x-hub-signature-256'] ||
      req.headers['x-hub-signature']) as string | undefined;
    const rawBody = req.rawBody;

    await this.webhookService.handleInbound(
      channelId,
      rawBody,
      signature,
      req.body,
    );

    return { status: 'ok' };
  }
}
