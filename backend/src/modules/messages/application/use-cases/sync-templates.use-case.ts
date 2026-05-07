import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ChannelService } from '@/modules/channels/domain/services/channel.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { TemplateRepository } from '../../infrastructure/repositories/template.repository';

const META_GRAPH_API = 'https://graph.facebook.com/v19.0';

@Injectable()
export class SyncTemplatesUseCase {
  private readonly logger = new Logger(SyncTemplatesUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateRepo: TemplateRepository,
    private readonly channelService: ChannelService,
  ) {}

  /**
   * Sync WhatsApp message templates from Meta Business API.
   * Fetches all templates for the given channel's WhatsApp Business Account.
   */
  async execute(orgId: string, channelId: string): Promise<number> {
    // Get channel credentials
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, orgId, type: 'WHATSAPP', deletedAt: null },
    });
    if (!channel) {
      throw new BadRequestException('WhatsApp channel not found');
    }

    const config = await this.channelService.getDecryptedConfig(channelId);
    const accessToken = config.accessToken as string;
    const businessAccountId = config.businessAccountId as string;

    if (!businessAccountId) {
      throw new BadRequestException('Channel is missing businessAccountId');
    }

    // Fetch templates from Meta API
    const url = `${META_GRAPH_API}/${businessAccountId}/message_templates?access_token=${accessToken}&limit=100`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new BadRequestException(
        `Failed to fetch templates: ${errorData?.error?.message || response.status}`,
      );
    }

    const data = await response.json();
    const templates = data.data || [];

    let syncedCount = 0;
    for (const tpl of templates) {
      await this.templateRepo.upsert({
        orgId,
        channelId,
        name: tpl.name,
        language: tpl.language,
        category: tpl.category,
        status: tpl.status === 'APPROVED' ? 'APPROVED' : tpl.status,
        whatsappTemplateId: tpl.id,
        components: tpl.components || [],
      });
      syncedCount++;
    }

    this.logger.log(
      `Synced ${syncedCount} templates for org ${orgId} from channel ${channelId}`,
    );

    return syncedCount;
  }
}
