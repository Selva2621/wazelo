import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class AnalyticsAggregationRepository {
  private readonly logger = new Logger(AnalyticsAggregationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute and upsert daily message aggregates for a given date.
   * Groups by org_id and session owner (user who owns the WhatsApp session).
   */
  async aggregateMessageDaily(targetDate: Date): Promise<number> {
    const dateStr = targetDate.toISOString().slice(0, 10);

    const result = await this.prisma.$executeRaw`
      INSERT INTO analytics_message_daily (
        id, org_id, user_id, date,
        inbound_count, outbound_count, sent_count, delivered_count, read_count, failed_count,
        created_at, updated_at
      )
      SELECT
        gen_random_uuid(),
        m.org_id,
        ws.user_id,
        ${dateStr}::date,
        COUNT(*) FILTER (WHERE m.direction = 'INBOUND'),
        COUNT(*) FILTER (WHERE m.direction = 'OUTBOUND'),
        COUNT(*) FILTER (WHERE m.status IN ('SENT', 'DELIVERED', 'READ')),
        COUNT(*) FILTER (WHERE m.status IN ('DELIVERED', 'READ')),
        COUNT(*) FILTER (WHERE m.status = 'READ'),
        COUNT(*) FILTER (WHERE m.status = 'FAILED'),
        NOW(),
        NOW()
      FROM messages m
      JOIN whatsapp_sessions ws ON ws.id = m.session_id
      WHERE m.created_at >= ${dateStr}::date
        AND m.created_at < (${dateStr}::date + interval '1 day')
        AND m.deleted_at IS NULL
      GROUP BY m.org_id, ws.user_id
      ON CONFLICT (org_id, user_id, date)
      DO UPDATE SET
        inbound_count = EXCLUDED.inbound_count,
        outbound_count = EXCLUDED.outbound_count,
        sent_count = EXCLUDED.sent_count,
        delivered_count = EXCLUDED.delivered_count,
        read_count = EXCLUDED.read_count,
        failed_count = EXCLUDED.failed_count,
        updated_at = NOW()
    `;

    this.logger.debug(`aggregateMessageDaily(${dateStr}): ${result} rows upserted`);
    return result;
  }

  /**
   * Compute and upsert hourly message aggregates for a given hour.
   */
  async aggregateMessageHourly(targetHour: Date): Promise<number> {
    const hourStart = new Date(targetHour);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 3_600_000);

    const result = await this.prisma.$executeRaw`
      INSERT INTO analytics_message_hourly (
        id, org_id, hour, inbound_count, outbound_count, created_at
      )
      SELECT
        gen_random_uuid(),
        m.org_id,
        ${hourStart}::timestamptz,
        COUNT(*) FILTER (WHERE m.direction = 'INBOUND'),
        COUNT(*) FILTER (WHERE m.direction = 'OUTBOUND'),
        NOW()
      FROM messages m
      WHERE m.created_at >= ${hourStart}::timestamptz
        AND m.created_at < ${hourEnd}::timestamptz
        AND m.deleted_at IS NULL
      GROUP BY m.org_id
      ON CONFLICT (org_id, hour)
      DO UPDATE SET
        inbound_count = EXCLUDED.inbound_count,
        outbound_count = EXCLUDED.outbound_count
    `;

    this.logger.debug(`aggregateMessageHourly(${hourStart.toISOString()}): ${result} rows upserted`);
    return result;
  }

  /**
   * Compute response time aggregates for a given date.
   * Response time = time between INBOUND message and first subsequent OUTBOUND reply
   * in the same conversation, capped at 24 hours.
   */
  async aggregateResponseTimeDaily(targetDate: Date): Promise<number> {
    const dateStr = targetDate.toISOString().slice(0, 10);

    const result = await this.prisma.$executeRaw`
      WITH inbound_msgs AS (
        SELECT
          m.id,
          m.org_id,
          m.conversation_id,
          m.session_id,
          m.created_at AS inbound_at
        FROM messages m
        WHERE m.direction = 'INBOUND'
          AND m.created_at >= ${dateStr}::date
          AND m.created_at < (${dateStr}::date + interval '1 day')
          AND m.deleted_at IS NULL
          AND m.conversation_id IS NOT NULL
      ),
      first_reply AS (
        SELECT DISTINCT ON (i.id)
          i.org_id,
          ws.user_id,
          EXTRACT(EPOCH FROM (r.created_at - i.inbound_at)) * 1000 AS response_time_ms
        FROM inbound_msgs i
        JOIN messages r ON r.conversation_id = i.conversation_id
          AND r.session_id = i.session_id
          AND r.direction = 'OUTBOUND'
          AND r.created_at > i.inbound_at
          AND r.created_at < i.inbound_at + interval '24 hours'
          AND r.deleted_at IS NULL
        JOIN whatsapp_sessions ws ON ws.id = r.session_id
        ORDER BY i.id, r.created_at ASC
      ),
      agg AS (
        SELECT
          org_id,
          user_id,
          SUM(response_time_ms)::bigint AS total_ms,
          COUNT(*)::int AS cnt,
          MIN(response_time_ms)::int AS min_ms,
          MAX(response_time_ms)::int AS max_ms,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms)::int AS p50_ms,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::int AS p95_ms
        FROM first_reply
        GROUP BY org_id, user_id
      )
      INSERT INTO analytics_response_time (
        id, org_id, user_id, date,
        total_response_time_ms, response_count,
        min_response_time_ms, max_response_time_ms,
        p50_response_time_ms, p95_response_time_ms,
        created_at, updated_at
      )
      SELECT
        gen_random_uuid(),
        org_id,
        user_id,
        ${dateStr}::date,
        total_ms, cnt, min_ms, max_ms, p50_ms, p95_ms,
        NOW(), NOW()
      FROM agg
      ON CONFLICT (org_id, user_id, date)
      DO UPDATE SET
        total_response_time_ms = EXCLUDED.total_response_time_ms,
        response_count = EXCLUDED.response_count,
        min_response_time_ms = EXCLUDED.min_response_time_ms,
        max_response_time_ms = EXCLUDED.max_response_time_ms,
        p50_response_time_ms = EXCLUDED.p50_response_time_ms,
        p95_response_time_ms = EXCLUDED.p95_response_time_ms,
        updated_at = NOW()
    `;

    this.logger.debug(`aggregateResponseTimeDaily(${dateStr}): ${result} rows upserted`);
    return result;
  }

  /**
   * Compute conversion funnel snapshot for a given date.
   * Counts current lead statuses + transitions that happened on that date.
   */
  async aggregateConversionDaily(targetDate: Date): Promise<number> {
    const dateStr = targetDate.toISOString().slice(0, 10);
    const targetDateObj = new Date(dateStr);

    // Step 1: Get current lead status counts per org
    const statusCounts = await this.prisma.$queryRaw<
      { org_id: string; lead_status: string; cnt: number }[]
    >`
      SELECT org_id, lead_status, COUNT(*)::int AS cnt
      FROM contacts
      WHERE deleted_at IS NULL AND merged_into_id IS NULL
      GROUP BY org_id, lead_status
    `;

    // Step 2: Get transitions for the date
    const transitions = await this.prisma.$queryRaw<
      { org_id: string; previous_status: string; new_status: string; cnt: number }[]
    >`
      SELECT org_id, previous_status, new_status, COUNT(*)::int AS cnt
      FROM contact_status_history
      WHERE created_at >= ${dateStr}::date
        AND created_at < (${dateStr}::date + interval '1 day')
        AND previous_status IS NOT NULL
      GROUP BY org_id, previous_status, new_status
    `;

    // Step 3: Build per-org maps and upsert
    const orgMap = new Map<
      string,
      { statuses: Record<string, number>; transitions: Record<string, number> }
    >();

    for (const row of statusCounts) {
      if (!orgMap.has(row.org_id)) {
        orgMap.set(row.org_id, { statuses: {}, transitions: {} });
      }
      orgMap.get(row.org_id)!.statuses[row.lead_status] = row.cnt;
    }

    for (const row of transitions) {
      if (!orgMap.has(row.org_id)) {
        orgMap.set(row.org_id, { statuses: {}, transitions: {} });
      }
      const key = `${row.previous_status}_TO_${row.new_status}`;
      orgMap.get(row.org_id)!.transitions[key] = row.cnt;
    }

    let count = 0;
    for (const [orgId, data] of orgMap) {
      await this.prisma.analyticsConversionDaily.upsert({
        where: {
          unique_conversion_daily_org_date: { orgId, date: targetDateObj },
        },
        create: {
          orgId,
          date: targetDateObj,
          newCount: data.statuses['NEW'] ?? 0,
          contactedCount: data.statuses['CONTACTED'] ?? 0,
          interestedCount: data.statuses['INTERESTED'] ?? 0,
          convertedCount: data.statuses['CONVERTED'] ?? 0,
          closedCount: data.statuses['CLOSED'] ?? 0,
          transitionsJson: data.transitions,
        },
        update: {
          newCount: data.statuses['NEW'] ?? 0,
          contactedCount: data.statuses['CONTACTED'] ?? 0,
          interestedCount: data.statuses['INTERESTED'] ?? 0,
          convertedCount: data.statuses['CONVERTED'] ?? 0,
          closedCount: data.statuses['CLOSED'] ?? 0,
          transitionsJson: data.transitions,
        },
      });
      count++;
    }

    this.logger.debug(`aggregateConversionDaily(${dateStr}): ${count} orgs upserted`);
    return count;
  }

  /**
   * Compute campaign summary for a given date.
   */
  async aggregateCampaignSummaryDaily(targetDate: Date): Promise<number> {
    const dateStr = targetDate.toISOString().slice(0, 10);

    const result = await this.prisma.$executeRaw`
      INSERT INTO analytics_campaign_summary (
        id, org_id, date,
        total_campaigns, completed_campaigns,
        total_recipients, total_sent, total_delivered, total_failed, total_read,
        avg_delivery_rate_pct, created_at, updated_at
      )
      SELECT
        gen_random_uuid(),
        c.org_id,
        ${dateStr}::date,
        COUNT(DISTINCT c.id)::int,
        COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'COMPLETED')::int,
        COALESCE(SUM(c.total_recipients), 0)::int,
        COALESCE(SUM(c.sent_count), 0)::int,
        COALESCE(SUM(c.delivered_count), 0)::int,
        COALESCE(SUM(c.failed_count), 0)::int,
        COALESCE(SUM(c.read_count), 0)::int,
        CASE WHEN SUM(c.total_recipients) > 0
          THEN (SUM(c.delivered_count)::float / SUM(c.total_recipients) * 100)
          ELSE 0
        END,
        NOW(), NOW()
      FROM campaigns c
      WHERE c.started_at >= ${dateStr}::date
        AND c.started_at < (${dateStr}::date + interval '1 day')
        AND c.deleted_at IS NULL
        AND c.status != 'DRAFT'
      GROUP BY c.org_id
      ON CONFLICT (org_id, date)
      DO UPDATE SET
        total_campaigns = EXCLUDED.total_campaigns,
        completed_campaigns = EXCLUDED.completed_campaigns,
        total_recipients = EXCLUDED.total_recipients,
        total_sent = EXCLUDED.total_sent,
        total_delivered = EXCLUDED.total_delivered,
        total_failed = EXCLUDED.total_failed,
        total_read = EXCLUDED.total_read,
        avg_delivery_rate_pct = EXCLUDED.avg_delivery_rate_pct,
        updated_at = NOW()
    `;

    this.logger.debug(`aggregateCampaignSummaryDaily(${dateStr}): ${result} rows upserted`);
    return result;
  }

  /**
   * Delete analytics data older than a retention period.
   */
  async deleteOlderThan(cutoffDate: Date): Promise<{
    daily: number;
    hourly: number;
    response: number;
    conversion: number;
    campaign: number;
  }> {
    const [daily, hourly, response, conversion, campaign] = await Promise.all([
      this.prisma.analyticsMessageDaily.deleteMany({
        where: { date: { lt: cutoffDate } },
      }),
      this.prisma.analyticsMessageHourly.deleteMany({
        where: { hour: { lt: cutoffDate } },
      }),
      this.prisma.analyticsResponseTime.deleteMany({
        where: { date: { lt: cutoffDate } },
      }),
      this.prisma.analyticsConversionDaily.deleteMany({
        where: { date: { lt: cutoffDate } },
      }),
      this.prisma.analyticsCampaignSummary.deleteMany({
        where: { date: { lt: cutoffDate } },
      }),
    ]);

    return {
      daily: daily.count,
      hourly: hourly.count,
      response: response.count,
      conversion: conversion.count,
      campaign: campaign.count,
    };
  }
}
