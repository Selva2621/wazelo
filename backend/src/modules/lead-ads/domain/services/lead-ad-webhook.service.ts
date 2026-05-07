import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { LeadAdRepository } from '../../infrastructure/repositories/lead-ad.repository';
import { QUEUE_NAMES } from '@/common/constants';

export interface LeadgenWebhookEntry {
  leadgenId: string;
  pageId: string;
  formId?: string;
  adId?: string;
  createdTime: number;
}

@Injectable()
export class LeadAdWebhookService {
  private readonly logger = new Logger(LeadAdWebhookService.name);

  constructor(
    private readonly leadAdRepo: LeadAdRepository,
    private readonly queueService: QueueService,
  ) {}

  verifySignature(
    rawBody: Buffer,
    signature: string,
    appSecret: string,
  ): boolean {
    const expected = createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    return `sha256=${expected}` === signature;
  }

  verifyChallenge(verifyToken: string, expectedToken: string): boolean {
    return verifyToken === expectedToken;
  }

  parseWebhookBody(body: Record<string, unknown>): LeadgenWebhookEntry[] {
    const entries: LeadgenWebhookEntry[] = [];
    const bodyEntries = (body as any)?.entry;

    if (!Array.isArray(bodyEntries)) return entries;

    for (const entry of bodyEntries) {
      const changes = entry.changes;
      if (!Array.isArray(changes)) continue;

      for (const change of changes) {
        if (change.field !== 'leadgen') continue;
        const value = change.value;
        if (!value?.leadgen_id) continue;

        entries.push({
          leadgenId: String(value.leadgen_id),
          pageId: String(entry.id || value.page_id),
          formId: value.form_id ? String(value.form_id) : undefined,
          adId: value.ad_id ? String(value.ad_id) : undefined,
          createdTime: value.created_time || Date.now() / 1000,
        });
      }
    }

    return entries;
  }

  async processWebhookEntries(
    entries: LeadgenWebhookEntry[],
    rawBody: Record<string, unknown>,
  ): Promise<void> {
    for (const entry of entries) {
      // Resolve org from page_id
      const orgId = await this.leadAdRepo.findOrgByPageId(entry.pageId);
      if (!orgId) {
        this.logger.warn(
          `No org found for page_id ${entry.pageId}, skipping lead ${entry.leadgenId}`,
        );
        continue;
      }

      // Check for duplicate
      const existing = await this.leadAdRepo.findByLeadgenId(
        orgId,
        entry.leadgenId,
      );
      if (existing) {
        this.logger.debug(
          `Duplicate lead ${entry.leadgenId} for org ${orgId}, skipping`,
        );
        continue;
      }

      // Determine platform from page type
      const channel = await this.leadAdRepo.findChannelByPageId(entry.pageId);
      const platform = this.resolvePlatform(channel?.type);

      // Create LeadAdEntry
      const leadAdEntry = await this.leadAdRepo.create({
        orgId,
        leadgenId: entry.leadgenId,
        pageId: entry.pageId,
        formId: entry.formId,
        adId: entry.adId,
        platform,
        leadData: {},
        status: 'PENDING',
        rawWebhookData: rawBody as any,
        channelId: channel?.id,
      });

      // Queue for async processing
      await this.queueService.publish(
        QUEUE_NAMES.PROCESS_LEAD_AD,
        {
          leadAdEntryId: leadAdEntry.id,
          orgId,
          leadgenId: entry.leadgenId,
        },
        { singletonKey: `lead-${entry.leadgenId}` },
      );

      this.logger.log(
        `Queued lead ${entry.leadgenId} for org ${orgId} (platform: ${platform})`,
      );
    }
  }

  private resolvePlatform(channelType?: string | null): string {
    switch (channelType) {
      case 'INSTAGRAM':
        return 'instagram';
      case 'FACEBOOK_MESSENGER':
        return 'facebook';
      case 'WHATSAPP':
        return 'whatsapp';
      default:
        return 'facebook';
    }
  }
}
