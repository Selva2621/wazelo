import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface ExportAnalyticsParams {
  orgId: string;
  type: 'messages' | 'conversions' | 'campaigns';
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class ExportAnalyticsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: ExportAnalyticsParams): Promise<string> {
    switch (params.type) {
      case 'messages':
        return this.exportMessages(params);
      case 'conversions':
        return this.exportConversions(params);
      case 'campaigns':
        return this.exportCampaigns(params);
      default:
        return this.exportMessages(params);
    }
  }

  private async exportMessages(params: ExportAnalyticsParams): Promise<string> {
    const records = await this.prisma.analyticsMessageDaily.findMany({
      where: {
        orgId: params.orgId,
        ...(params.startDate && { date: { gte: params.startDate } }),
        ...(params.endDate && { date: { lte: params.endDate } }),
      },
      orderBy: { date: 'desc' },
    });

    const headers = ['Date', 'Inbound', 'Outbound', 'Sent', 'Delivered', 'Read', 'Failed'];
    const rows = records.map((r) => [
      r.date.toISOString().split('T')[0],
      r.inboundCount,
      r.outboundCount,
      r.sentCount,
      r.deliveredCount,
      r.readCount,
      r.failedCount,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  private async exportConversions(params: ExportAnalyticsParams): Promise<string> {
    const records = await this.prisma.analyticsConversionDaily.findMany({
      where: {
        orgId: params.orgId,
        ...(params.startDate && { date: { gte: params.startDate } }),
        ...(params.endDate && { date: { lte: params.endDate } }),
      },
      orderBy: { date: 'desc' },
    });

    const headers = ['Date', 'New', 'Contacted', 'Interested', 'Converted', 'Closed'];
    const rows = records.map((r) => [
      r.date.toISOString().split('T')[0],
      r.newCount,
      r.contactedCount,
      r.interestedCount,
      r.convertedCount,
      r.closedCount,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  private async exportCampaigns(params: ExportAnalyticsParams): Promise<string> {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        orgId: params.orgId,
        deletedAt: null,
        ...(params.startDate && { createdAt: { gte: params.startDate } }),
        ...(params.endDate && { createdAt: { lte: params.endDate } }),
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Name', 'Status', 'Total Recipients', 'Sent', 'Delivered', 'Failed', 'Read', 'Created At'];
    const rows = campaigns.map((c) => [
      this.escapeCsv(c.name),
      c.status,
      c.totalRecipients,
      c.sentCount,
      c.deliveredCount,
      c.failedCount,
      c.readCount,
      c.createdAt.toISOString().split('T')[0],
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  private escapeCsv(value: string): string {
    // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR)
    if (/^[=+\-@\t\r]/.test(value)) {
      value = `'${value}`;
    }
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
