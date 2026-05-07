import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { LeadAdRepository } from '../../infrastructure/repositories/lead-ad.repository';

export interface LeadAdAnalyticsResult {
  totalLeads: number;
  byPlatform: { platform: string; count: number }[];
  byCampaign: { campaignName: string; count: number }[];
  byDay: { date: string; count: number }[];
  conversionRate: number;
}

@Injectable()
export class GetLeadAdAnalyticsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadAdRepo: LeadAdRepository,
  ) {}

  async execute(
    orgId: string,
    startDate?: Date,
    endDate?: Date,
    platform?: string,
  ): Promise<LeadAdAnalyticsResult> {
    const totalLeads = await this.leadAdRepo.countTotal(orgId, startDate, endDate);

    const byPlatformRaw = await this.leadAdRepo.countByOrgAndPlatform(orgId, startDate, endDate);
    const byPlatform = byPlatformRaw.map((r) => ({
      platform: r.platform,
      count: r._count.id,
    }));

    const byCampaignRaw = await this.leadAdRepo.countByOrgAndCampaign(orgId, startDate, endDate);
    const byCampaign = byCampaignRaw.map((r) => ({
      campaignName: r.campaignName || 'Unknown',
      count: r._count.id,
    }));

    // Leads by day — use Prisma groupBy with raw date extraction
    const byDayEntries = await this.prisma.leadAdEntry.findMany({
      where: {
        orgId,
        status: 'COMPLETED',
        ...(startDate && { createdAt: { gte: startDate } }),
        ...(endDate && { createdAt: { lte: endDate } }),
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate by day in application layer
    const dayMap = new Map<string, number>();
    for (const entry of byDayEntries) {
      const day = entry.createdAt.toISOString().split('T')[0];
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }
    const byDay = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    // Conversion rate: contacts from lead ads that reached CONVERTED status
    const leadAdSources = ['FACEBOOK_LEAD_AD', 'INSTAGRAM_LEAD_AD', 'WHATSAPP_LEAD_AD'];
    const totalContacts = await this.prisma.contact.count({
      where: {
        orgId,
        source: { in: leadAdSources as any },
        deletedAt: null,
        ...(startDate && { createdAt: { gte: startDate } }),
      },
    });

    const convertedContacts = await this.prisma.contact.count({
      where: {
        orgId,
        source: { in: leadAdSources as any },
        leadStatus: 'CONVERTED',
        deletedAt: null,
        ...(startDate && { createdAt: { gte: startDate } }),
      },
    });

    const conversionRate = totalContacts > 0
      ? Math.round((convertedContacts / totalContacts) * 10000) / 100
      : 0;

    return { totalLeads, byPlatform, byCampaign, byDay, conversionRate };
  }
}
