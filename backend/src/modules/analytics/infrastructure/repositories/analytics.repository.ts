import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Message Daily ────────────────────────────

  async getMessageDailySeries(
    orgId: string,
    startDate: Date,
    endDate: Date,
    userIds?: string[],
  ) {
    return this.prisma.analyticsMessageDaily.findMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
        ...(userIds ? { userId: { in: userIds } } : {}),
      },
      orderBy: { date: 'asc' },
    });
  }

  // ─── Message Hourly ───────────────────────────

  async getMessageHourlySeries(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.analyticsMessageHourly.findMany({
      where: {
        orgId,
        hour: { gte: startDate, lte: endDate },
      },
      orderBy: { hour: 'asc' },
    });
  }

  // ─── Response Time ────────────────────────────

  async getResponseTimeSeries(
    orgId: string,
    startDate: Date,
    endDate: Date,
    userIds?: string[],
  ) {
    return this.prisma.analyticsResponseTime.findMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
        ...(userIds ? { userId: { in: userIds } } : {}),
      },
      orderBy: { date: 'asc' },
    });
  }

  // ─── Conversion Daily ─────────────────────────

  async getConversionDailySeries(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.analyticsConversionDaily.findMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });
  }

  // ─── Campaign Summary ─────────────────────────

  async getCampaignSummarySeries(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.analyticsCampaignSummary.findMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });
  }

  // ─── Live Queries (not pre-aggregated) ────────

  async getCurrentLeadStatusCounts(
    orgId: string,
  ): Promise<{ leadStatus: string; count: number }[]> {
    const results = await this.prisma.contact.groupBy({
      by: ['leadStatus'],
      where: { orgId, deletedAt: null, mergedIntoId: null },
      _count: { id: true },
    });
    return results.map((r) => ({
      leadStatus: r.leadStatus,
      count: r._count.id,
    }));
  }

  async getContactsConvertedByUser(
    orgId: string,
    startDate: Date,
    endDate: Date,
    userIds?: string[],
  ): Promise<{ changedById: string; count: number }[]> {
    const results = await this.prisma.contactStatusHistory.groupBy({
      by: ['changedById'],
      where: {
        orgId,
        newStatus: 'CONVERTED',
        createdAt: { gte: startDate, lte: endDate },
        ...(userIds ? { changedById: { in: userIds } } : {}),
      },
      _count: { id: true },
    });
    return results.map((r) => ({
      changedById: r.changedById,
      count: r._count.id,
    }));
  }

  async getActiveConversationsByUser(
    orgId: string,
    userIds?: string[],
  ): Promise<{ assignedToId: string; count: number }[]> {
    const results = await this.prisma.conversation.groupBy({
      by: ['assignedToId'],
      where: {
        orgId,
        status: 'OPEN',
        deletedAt: null,
        assignedToId: { not: null, ...(userIds ? { in: userIds } : {}) },
      },
      _count: { id: true },
    });
    return results.map((r) => ({
      assignedToId: r.assignedToId!,
      count: r._count.id,
    }));
  }

  async getUsersByIds(
    orgId: string,
    userIds?: string[],
  ): Promise<{ id: string; firstName: string; lastName: string }[]> {
    return this.prisma.user.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(userIds ? { id: { in: userIds } } : {}),
      },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  // ─── Live (today) per channel — Message City ──

  /**
   * Messages since `since`, grouped by channel + direction.
   * Scoped users see messages on conversations assigned to them or on
   * WhatsApp sessions they own.
   */
  async getLiveMessageCountsByChannel(
    orgId: string,
    since: Date,
    userIds?: string[],
  ): Promise<
    {
      channel: string | null;
      direction: string;
      total: number;
      delivered: number;
      read: number;
      failed: number;
      lastAt: Date | null;
    }[]
  > {
    const scope = userIds
      ? Prisma.sql`AND (c.assigned_to_id = ANY(${userIds}::uuid[]) OR ws.user_id = ANY(${userIds}::uuid[]))`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      {
        channel: string | null;
        direction: string;
        total: bigint;
        delivered: bigint;
        read: bigint;
        failed: bigint;
        last_at: Date | null;
      }[]
    >`
      SELECT
        m.channel_type::text AS channel,
        m.direction::text AS direction,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE m.status IN ('DELIVERED', 'READ')) AS delivered,
        COUNT(*) FILTER (WHERE m.status = 'READ') AS read,
        COUNT(*) FILTER (WHERE m.status = 'FAILED') AS failed,
        MAX(m.created_at) AS last_at
      FROM messages m
      LEFT JOIN conversations c ON c.id = m.conversation_id
      LEFT JOIN whatsapp_sessions ws ON ws.id = m.session_id
      WHERE m.org_id = ${orgId}::uuid
        AND m.created_at >= ${since}
        AND m.deleted_at IS NULL
        ${scope}
      GROUP BY m.channel_type, m.direction
    `;
    return rows.map((r) => ({
      channel: r.channel,
      direction: r.direction,
      total: Number(r.total),
      delivered: Number(r.delivered),
      read: Number(r.read),
      failed: Number(r.failed),
      lastAt: r.last_at,
    }));
  }

  /** Website-chat messages since `since`, grouped by sender. */
  async getLiveWidgetMessageCounts(
    orgId: string,
    since: Date,
    userIds?: string[],
  ): Promise<{ sender: string; total: number; lastAt: Date | null }[]> {
    const scope = userIds
      ? Prisma.sql`AND s.assigned_to_id = ANY(${userIds}::uuid[])`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      { sender: string; total: bigint; last_at: Date | null }[]
    >`
      SELECT wm.sender, COUNT(*) AS total, MAX(wm.created_at) AS last_at
      FROM widget_messages wm
      JOIN widget_sessions s ON s.id = wm.session_id
      WHERE wm.org_id = ${orgId}::uuid
        AND wm.created_at >= ${since}
        ${scope}
      GROUP BY wm.sender
    `;
    return rows.map((r) => ({
      sender: r.sender,
      total: Number(r.total),
      lastAt: r.last_at,
    }));
  }

  /** Emails created since `since`, grouped by status (org-wide only). */
  async getLiveEmailCounts(
    orgId: string,
    since: Date,
  ): Promise<{ status: string; total: number; lastAt: Date | null }[]> {
    const rows = await this.prisma.emailMessage.groupBy({
      by: ['status'],
      where: { orgId, createdAt: { gte: since } },
      _count: { id: true },
      _max: { createdAt: true },
    });
    return rows.map((r) => ({
      status: r.status,
      total: r._count.id,
      lastAt: r._max.createdAt,
    }));
  }

  /** Open conversations and their unread total. */
  async getInboxSummary(
    orgId: string,
    userIds?: string[],
  ): Promise<{ openConversations: number; unread: number }> {
    const result = await this.prisma.conversation.aggregate({
      where: {
        orgId,
        status: 'OPEN',
        deletedAt: null,
        ...(userIds ? { assignedToId: { in: userIds } } : {}),
      },
      _count: { id: true },
      _sum: { unreadCount: true },
    });
    return {
      openConversations: result._count.id,
      unread: result._sum.unreadCount ?? 0,
    };
  }

  // ─── Live dashboard: waiting chats, revenue, leads ──

  /**
   * Open conversations whose latest message is from the customer and older than
   * `cutoff`, oldest first. Scoped users see the chats assigned to them.
   */
  async getWaitingConversations(
    orgId: string,
    cutoff: Date,
    userIds: string[] | undefined,
    limit: number,
  ): Promise<{
    total: number;
    rows: {
      conversationId: string;
      contactId: string | null;
      contactName: string | null;
      contactPhone: string;
      channelType: string | null;
      waitingSince: Date;
      assignedToId: string | null;
      assigneeFirstName: string | null;
      assigneeLastName: string | null;
    }[];
  }> {
    const scope = userIds
      ? Prisma.sql`AND c.assigned_to_id = ANY(${userIds}::uuid[])`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        contact_id: string | null;
        contact_name: string | null;
        contact_phone: string;
        channel_type: string | null;
        waiting_since: Date;
        assigned_to_id: string | null;
        first_name: string | null;
        last_name: string | null;
        total: bigint;
      }[]
    >`
      SELECT
        c.id, c.contact_id, ct.name AS contact_name, c.contact_phone,
        c.channel_type::text AS channel_type, lm.created_at AS waiting_since,
        c.assigned_to_id, u.first_name, u.last_name,
        COUNT(*) OVER () AS total
      FROM conversations c
      JOIN LATERAL (
        SELECT m.direction, m.created_at
        FROM messages m
        WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON TRUE
      LEFT JOIN contacts ct ON ct.id = c.contact_id
      LEFT JOIN users u ON u.id = c.assigned_to_id
      WHERE c.org_id = ${orgId}::uuid
        AND c.status = 'OPEN'
        AND c.deleted_at IS NULL
        AND lm.direction = 'INBOUND'
        AND lm.created_at < ${cutoff}
        ${scope}
      ORDER BY lm.created_at ASC
      LIMIT ${limit}
    `;
    return {
      total: rows.length ? Number(rows[0].total) : 0,
      rows: rows.map((r) => ({
        conversationId: r.id,
        contactId: r.contact_id,
        contactName: r.contact_name,
        contactPhone: r.contact_phone,
        channelType: r.channel_type,
        waitingSince: r.waiting_since,
        assignedToId: r.assigned_to_id,
        assigneeFirstName: r.first_name,
        assigneeLastName: r.last_name,
      })),
    };
  }

  /** Open and recently won deals per currency, and proposals sent/viewed since `since` */
  async getRevenueSnapshot(
    orgId: string,
    since: Date,
    userIds: string[] | undefined,
  ): Promise<{
    open: { currency: string; count: number; value: number }[];
    won: { currency: string; count: number; value: number }[];
    proposalsSent: number;
    proposalsViewed: number;
  }> {
    const dealWhere: Prisma.DealWhereInput = {
      orgId,
      deletedAt: null,
      pipeline: { deletedAt: null },
      ...(userIds ? { assignedToId: { in: userIds } } : {}),
    };
    const proposalWhere: Prisma.ProposalWhereInput = {
      orgId,
      deletedAt: null,
      sentAt: { gte: since },
      ...(userIds ? { createdById: { in: userIds } } : {}),
    };
    const [open, won, proposalsSent, proposalsViewed] = await Promise.all([
      this.prisma.deal.groupBy({
        by: ['currency'],
        where: { ...dealWhere, status: 'OPEN' },
        _count: { id: true },
        _sum: { value: true },
      }),
      this.prisma.deal.groupBy({
        by: ['currency'],
        where: { ...dealWhere, status: 'WON', closedAt: { gte: since } },
        _count: { id: true },
        _sum: { value: true },
      }),
      this.prisma.proposal.count({ where: proposalWhere }),
      this.prisma.proposal.count({ where: { ...proposalWhere, viewedAt: { not: null } } }),
    ]);
    const rows = (r: typeof open) =>
      r.map((x) => ({ currency: x.currency, count: x._count.id, value: Number(x._sum.value ?? 0) }));
    return { open: rows(open), won: rows(won), proposalsSent, proposalsViewed };
  }

  // ─── Message City insights: hourly volume + reply speed ──

  /**
   * Message counts per local hour since `since`. `localHour` is the hour start
   * shifted into the requester's zone (so +5:30 buckets on real local hours).
   */
  async getHourlyMessageCounts(
    orgId: string,
    since: Date,
    until: Date,
    offsetMinutes: number,
    userIds: string[] | undefined,
  ): Promise<{ channel: string | null; direction: string; localHour: Date; total: number }[]> {
    const scope = userIds
      ? Prisma.sql`AND (c.assigned_to_id = ANY(${userIds}::uuid[]) OR ws.user_id = ANY(${userIds}::uuid[]))`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      { channel: string | null; direction: string; local_hour: Date; total: bigint }[]
    >`
      SELECT
        m.channel_type::text AS channel,
        m.direction::text AS direction,
        date_trunc('hour', m.created_at + make_interval(mins => ${offsetMinutes}::int)) AS local_hour,
        COUNT(*) AS total
      FROM messages m
      LEFT JOIN conversations c ON c.id = m.conversation_id
      LEFT JOIN whatsapp_sessions ws ON ws.id = m.session_id
      WHERE m.org_id = ${orgId}::uuid
        AND m.created_at >= ${since}
        AND m.created_at < ${until}
        AND m.deleted_at IS NULL
        ${scope}
      GROUP BY 1, 2, 3
    `;
    return rows.map((r) => ({ channel: r.channel, direction: r.direction, localHour: r.local_hour, total: Number(r.total) }));
  }

  /** Website-chat messages per local hour (visitor = in, agent/bot = out) */
  async getHourlyWidgetCounts(
    orgId: string,
    since: Date,
    until: Date,
    offsetMinutes: number,
    userIds: string[] | undefined,
  ): Promise<{ sender: string; localHour: Date; total: number }[]> {
    const scope = userIds
      ? Prisma.sql`AND s.assigned_to_id = ANY(${userIds}::uuid[])`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ sender: string; local_hour: Date; total: bigint }[]>`
      SELECT
        wm.sender,
        date_trunc('hour', wm.created_at + make_interval(mins => ${offsetMinutes}::int)) AS local_hour,
        COUNT(*) AS total
      FROM widget_messages wm
      JOIN widget_sessions s ON s.id = wm.session_id
      WHERE wm.org_id = ${orgId}::uuid
        AND wm.created_at >= ${since}
        AND wm.created_at < ${until}
        ${scope}
      GROUP BY 1, 2
    `;
    return rows.map((r) => ({ sender: r.sender, localHour: r.local_hour, total: Number(r.total) }));
  }

  /**
   * Average first-reply time per channel for customer messages since `since`:
   * a "turn" starts at a customer message that follows one of ours (or opens the chat);
   * its reply is the next outgoing message in that conversation.
   * `lookback` (earlier) gives the previous message for chats that span midnight.
   */
  async getReplyTimes(
    orgId: string,
    since: Date,
    lookback: Date,
    userIds: string[] | undefined,
  ): Promise<{ channel: string | null; avgMinutes: number; replies: number }[]> {
    const scope = userIds
      ? Prisma.sql`AND (c.assigned_to_id = ANY(${userIds}::uuid[]) OR ws.user_id = ANY(${userIds}::uuid[]))`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ channel: string | null; avg_min: number; n: bigint }[]>`
      WITH ordered AS (
        SELECT
          m.channel_type::text AS channel,
          m.direction::text AS direction,
          m.created_at,
          LAG(m.direction) OVER w AS prev_dir,
          MIN(m.created_at) FILTER (WHERE m.direction = 'OUTBOUND') OVER (
            PARTITION BY m.conversation_id ORDER BY m.created_at
            ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING
          ) AS reply_at
        FROM messages m
        LEFT JOIN conversations c ON c.id = m.conversation_id
        LEFT JOIN whatsapp_sessions ws ON ws.id = m.session_id
        WHERE m.org_id = ${orgId}::uuid
          AND m.created_at >= ${lookback}
          AND m.deleted_at IS NULL
          AND m.conversation_id IS NOT NULL
          ${scope}
        WINDOW w AS (PARTITION BY m.conversation_id ORDER BY m.created_at)
      )
      SELECT
        channel,
        AVG(EXTRACT(EPOCH FROM (reply_at - created_at)) / 60.0)::float AS avg_min,
        COUNT(*) AS n
      FROM ordered
      WHERE direction = 'INBOUND'
        AND (prev_dir IS NULL OR prev_dir::text <> 'INBOUND')
        AND reply_at IS NOT NULL
        AND created_at >= ${since}
      GROUP BY channel
    `;
    return rows.map((r) => ({ channel: r.channel, avgMinutes: Number(r.avg_min), replies: Number(r.n) }));
  }

  /** Contacts (leads) created since `since`: the count and the newest few. Scoped by owner. */
  async getLeadsSince(
    orgId: string,
    since: Date,
    userIds: string[] | undefined,
    limit: number,
  ): Promise<{
    total: number;
    rows: { id: string; name: string | null; phoneNumber: string; source: string; createdAt: Date }[];
  }> {
    const where: Prisma.ContactWhereInput = {
      orgId,
      deletedAt: null,
      mergedIntoId: null,
      createdAt: { gte: since },
      ...(userIds ? { ownerId: { in: userIds } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, name: true, phoneNumber: true, source: true, createdAt: true },
      }),
    ]);
    return { total, rows };
  }
}
