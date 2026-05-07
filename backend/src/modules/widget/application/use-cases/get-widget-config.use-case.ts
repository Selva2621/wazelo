import { Injectable } from '@nestjs/common';
import { WidgetRepository } from '../../infrastructure/repositories/widget.repository';

@Injectable()
export class GetWidgetConfigUseCase {
  constructor(private readonly widgetRepository: WidgetRepository) {}

  async execute(orgId: string) {
    const [config, orgSlug] = await Promise.all([
      this.widgetRepository.findConfigByOrgId(orgId),
      this.widgetRepository.findOrgSlugById(orgId),
    ]);

    if (!config) {
      return {
        enabled: false,
        position: 'bottom-right',
        primaryColor: '#6366f1',
        welcomeMessage: 'Hi! How can we help you?',
        placeholder: 'Type a message...',
        companyName: null,
        avatarUrl: null,
        whatsappNumber: null,
        preChatFormEnabled: false,
        orgSlug: orgSlug ?? '',
      };
    }

    return { ...config, orgSlug: orgSlug ?? '' };
  }
}
