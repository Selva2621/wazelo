import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  Headers,
  Ip,
  Query,
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
      // The widget shows "typing…" while the AI assistant answers (instructions stay private)
      aiAssistantEnabled: !!config.aiAssistantEnabled,
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
    @Ip() ip: string,
  ) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

    // The IP caps AI replies across visitor ids (see SendWidgetMessageUseCase)
    const result = await this.sendWidgetMessageUseCase.execute(orgSlug, dto, ip);
    return res.status(201).json(result);
  }

  /**
   * New replies for this visitor (from the team or the AI), polled by the widget every
   * few seconds while it's open. Only that visitor's own chat: the visitor id is a
   * random id kept in their browser. `after` = the newest reply they already have.
   */
  @Get(':orgSlug/messages')
  async getReplies(
    @Param('orgSlug') orgSlug: string,
    @Query('visitorId') visitorId: string,
    @Query('after') after: string | undefined,
    @Res() res: Response,
  ) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('Cache-Control', 'no-store');

    if (!visitorId || visitorId.length > 64) return res.status(200).json({ messages: [] });
    const orgId = await this.widgetRepository.findOrgIdBySlug(orgSlug);
    const session = orgId ? await this.widgetRepository.findSessionByVisitor(orgId, visitorId) : null;
    if (!session) return res.status(200).json({ messages: [] });

    const since = after && !Number.isNaN(Date.parse(after)) ? new Date(after) : new Date(0);
    const messages = await this.widgetRepository.findRepliesAfter(session.id, since);
    return res.status(200).json({ messages });
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
