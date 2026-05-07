import { Injectable, NotFoundException } from '@nestjs/common';
import { WidgetRepository } from '../../infrastructure/repositories/widget.repository';

@Injectable()
export class StartWidgetSessionUseCase {
  constructor(private readonly widgetRepository: WidgetRepository) {}

  /**
   * Called by the public widget when a visitor opens the chat.
   * Resolves the org by slug, checks widget is enabled, then
   * creates or resumes the visitor's session.
   */
  async execute(
    orgSlug: string,
    visitorId: string,
    pageUrl?: string,
    userAgent?: string,
  ) {
    const orgId = await this.widgetRepository.findOrgIdBySlug(orgSlug);
    if (!orgId) throw new NotFoundException('Widget not found');

    const config = await this.widgetRepository.findConfigByOrgId(orgId);
    if (!config?.enabled) throw new NotFoundException('Widget not found or disabled');

    const session = await this.widgetRepository.findOrCreateSession({
      orgId,
      visitorId,
      pageUrl,
      userAgent,
    });

    return {
      sessionId: session.id,
      preChatFormEnabled: config.preChatFormEnabled,
      visitorName: session.visitorName,
      visitorPhone: session.visitorPhone,
    };
  }
}
