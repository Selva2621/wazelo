import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  Headers,
} from '@nestjs/common';
import { Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { WidgetRepository } from '../../infrastructure/repositories/widget.repository';
import { StartWidgetSessionUseCase } from '../../application/use-cases/start-widget-session.use-case';
import { SendWidgetMessageUseCase } from '../../application/use-cases/send-widget-message.use-case';
import { SendWidgetMessageDto } from '../../application/dto/send-widget-message.dto';
import { generateWidgetScript } from '../../infrastructure/generators/widget-script.generator';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

@Controller('widgets')
@Public()
export class WidgetPublicController {
  constructor(
    private readonly widgetRepository: WidgetRepository,
    private readonly startWidgetSessionUseCase: StartWidgetSessionUseCase,
    private readonly sendWidgetMessageUseCase: SendWidgetMessageUseCase,
  ) {}

  /**
   * Returns the public-safe widget config for the given org slug.
   * Called by embed.js on load.
   */
  @Get(':orgSlug/config')
  async getPublicConfig(
    @Param('orgSlug') orgSlug: string,
    @Res() res: Response,
  ) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('Cache-Control', 'public, max-age=60');

    const config = await this.widgetRepository.findConfigByOrgSlug(orgSlug);
    if (!config || !config.enabled) {
      return res.status(404).json({ error: 'Widget not found or disabled' });
    }

    return res.json({
      orgSlug: config.orgSlug,
      companyName: config.companyName || config.orgName,
      position: config.position,
      primaryColor: config.primaryColor,
      welcomeMessage: config.welcomeMessage,
      placeholder: config.placeholder,
      avatarUrl: config.avatarUrl,
      whatsappNumber: config.whatsappNumber,
      preChatFormEnabled: config.preChatFormEnabled,
    });
  }

  /**
   * Serves the self-contained embeddable widget JavaScript.
   */
  @Get(':orgSlug/embed.js')
  async getScript(
    @Param('orgSlug') orgSlug: string,
    @Res() res: Response,
  ) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    return res.send(generateWidgetScript(orgSlug));
  }

  /**
   * Receives a message from a website visitor.
   * Creates/resumes visitor session, saves message, emits event.
   */
  @Post(':orgSlug/message')
  async receiveMessage(
    @Param('orgSlug') orgSlug: string,
    @Body() dto: SendWidgetMessageDto,
    @Res() res: Response,
  ) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

    const result = await this.sendWidgetMessageUseCase.execute(orgSlug, dto);
    return res.status(201).json(result);
  }

  /**
   * Starts or resumes a widget session for a visitor.
   * Called when the widget opens to get session ID + check pre-chat form status.
   */
  @Post(':orgSlug/session')
  async startSession(
    @Param('orgSlug') orgSlug: string,
    @Body() body: { visitorId: string; pageUrl?: string },
    @Res() res: Response,
    @Headers('user-agent') userAgent?: string,
  ) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

    const result = await this.startWidgetSessionUseCase.execute(
      orgSlug,
      body.visitorId,
      body.pageUrl,
      userAgent,
    );
    return res.status(200).json(result);
  }
}
