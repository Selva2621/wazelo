import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CampaignRecipientStatus } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EVENT_NAMES } from '@/common/constants';
import type { WhatsAppMessageReceivedEvent } from '@/events/event-bus';

/** A message from the contact within this long of a campaign counts as a reply to it */
export const CAMPAIGN_REPLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Campaign "Replied": the first message a contact sends within a week of a
 * campaign reaching them marks that recipient as replied and counts it once
 * on the campaign. Only campaigns that actually went out to them count.
 */
@Injectable()
export class CampaignRepliesService {
  private readonly logger = new Logger(CampaignRepliesService.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED, { async: true })
  async onMessageReceived(payload: WhatsAppMessageReceivedEvent): Promise<void> {
    if (!payload?.orgId || !payload.contactPhone) return;
    try {
      await this.markReplied(payload.orgId, payload.contactPhone, new Date());
    } catch (err) {
      this.logger.warn(`Couldn't record a campaign reply: ${(err as Error).message}`);
    }
  }

  /** Returns how many campaign recipients were marked replied. */
  async markReplied(orgId: string, contactPhone: string, at: Date): Promise<number> {
    const digits = contactPhone.replace(/^\+/, '');
    const recipients = await this.prisma.campaignRecipient.findMany({
      where: {
        orgId,
        contactPhone: { in: [digits, `+${digits}`] },
        repliedAt: null,
        status: { in: [CampaignRecipientStatus.SENT, CampaignRecipientStatus.DELIVERED] },
        message: { sentAt: { gte: new Date(at.getTime() - CAMPAIGN_REPLY_WINDOW_MS), lte: at } },
      },
      select: { id: true, campaignId: true },
    });

    let marked = 0;
    for (const r of recipients) {
      // Conditional update: two messages arriving together count the reply once
      const { count } = await this.prisma.campaignRecipient.updateMany({
        where: { id: r.id, repliedAt: null },
        data: { repliedAt: at },
      });
      if (count) {
        await this.prisma.campaign.update({
          where: { id: r.campaignId },
          data: { repliedCount: { increment: 1 } },
        });
        marked++;
      }
    }
    return marked;
  }
}
