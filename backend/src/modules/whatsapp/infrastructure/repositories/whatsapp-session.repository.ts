import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { WhatsAppProvider, WhatsAppSessionStatus } from '@prisma/client';

export interface CreateCloudSessionInput {
  orgId: string;
  userId: string;
  phoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  encryptedToken: string;
  encryptedAppSecret: string;
  verifyToken: string;
  verifiedName?: string | null;
  qualityRating?: string | null;
  messagingTier?: string | null;
}

export interface CreateSessionInput {
  orgId: string;
  userId: string;
  idempotencyKey?: string;
}

export interface UpdateSessionStatusInput {
  status: WhatsAppSessionStatus;
  phoneNumber?: string;
  encryptedCreds?: string;
  lastActiveAt?: Date;
  lastHeartbeatAt?: Date;
  reconnectCount?: number;
  disconnectedAt?: Date;
  disconnectCode?: number | null;
  disconnectReason?: string | null;
  linkedAt?: Date;
  lastPhoneActivityAt?: Date;
}

@Injectable()
export class WhatsAppSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSessionInput) {
    return this.prisma.whatsAppSession.create({
      data: {
        orgId: input.orgId,
        userId: input.userId,
        status: WhatsAppSessionStatus.CONNECTING,
        idempotencyKey: input.idempotencyKey || null,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdAndOrg(id: string, orgId: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async findConnectedByIdsAndOrg(ids: string[], orgId: string) {
    if (ids.length === 0) return [];
    return this.prisma.whatsAppSession.findMany({
      where: {
        id: { in: ids },
        orgId,
        status: WhatsAppSessionStatus.CONNECTED,
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  /** The user's own QR-linked number (official numbers are the org's, not "theirs") */
  async findAnyByUserId(userId: string, orgId: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: { userId, orgId, deletedAt: null, provider: WhatsAppProvider.QR },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllSessionIdsByUserId(userId: string, orgId: string): Promise<string[]> {
    const sessions = await this.prisma.whatsAppSession.findMany({
      where: { userId, orgId },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map((s) => s.id);
  }

  async findActiveByUserId(userId: string, orgId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    return this.prisma.whatsAppSession.findFirst({
      where: {
        userId,
        orgId,
        deletedAt: null,
        provider: WhatsAppProvider.QR,
        OR: [
          { status: WhatsAppSessionStatus.CONNECTED },
          { status: WhatsAppSessionStatus.RECONNECTING, phoneNumber: { not: null } },
          { status: WhatsAppSessionStatus.CONNECTING, createdAt: { gt: fiveMinutesAgo } },
          // DISCONNECTED with creds intact — user should reconnect, not create a new session
          { status: WhatsAppSessionStatus.DISCONNECTED, encryptedCreds: { not: null } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Fallback: find any connected session in the org (for system-triggered messages) */
  async findAnyActiveByOrgId(orgId: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: {
        orgId,
        deletedAt: null,
        status: WhatsAppSessionStatus.CONNECTED,
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  async findByIdempotencyKey(key: string) {
    return this.prisma.whatsAppSession.findUnique({
      where: { idempotencyKey: key },
    });
  }

  async updateStatus(id: string, input: UpdateSessionStatusInput) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.phoneNumber !== undefined && { phoneNumber: input.phoneNumber }),
        ...(input.encryptedCreds !== undefined && { encryptedCreds: input.encryptedCreds }),
        ...(input.lastActiveAt !== undefined && { lastActiveAt: input.lastActiveAt }),
        ...(input.lastHeartbeatAt !== undefined && { lastHeartbeatAt: input.lastHeartbeatAt }),
        ...(input.reconnectCount !== undefined && { reconnectCount: input.reconnectCount }),
        ...(input.disconnectedAt !== undefined && { disconnectedAt: input.disconnectedAt }),
        ...(input.disconnectCode !== undefined && { disconnectCode: input.disconnectCode }),
        ...(input.disconnectReason !== undefined && { disconnectReason: input.disconnectReason }),
        ...(input.linkedAt !== undefined && { linkedAt: input.linkedAt }),
        ...(input.lastPhoneActivityAt !== undefined && { lastPhoneActivityAt: input.lastPhoneActivityAt }),
      },
    });
  }

  async updatePhoneActivity(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: { lastPhoneActivityAt: new Date() },
    });
  }

  /** Connected sessions whose phone hasn't been seen since `before` */
  async findPhoneInactiveSessions(before: Date) {
    return this.prisma.whatsAppSession.findMany({
      where: {
        deletedAt: null,
        provider: WhatsAppProvider.QR,
        status: WhatsAppSessionStatus.CONNECTED,
        lastPhoneActivityAt: { lt: before },
      },
      select: {
        id: true,
        orgId: true,
        userId: true,
        phoneNumber: true,
        lastPhoneActivityAt: true,
      },
    });
  }

  async updateHeartbeat(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        lastHeartbeatAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
  }

  async markConnectedFromHealthCheck(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: WhatsAppSessionStatus.CONNECTED,
        reconnectCount: 0,
        disconnectedAt: null,
        lastHeartbeatAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
  }

  async incrementReconnectCount(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        reconnectCount: { increment: 1 },
        status: WhatsAppSessionStatus.RECONNECTING,
      },
    });
  }

  async softDelete(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: WhatsAppSessionStatus.DISCONNECTED,
        disconnectedAt: new Date(),
        deletedAt: new Date(),
        encryptedCreds: null,
      },
    });
  }

  async disconnectSession(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: WhatsAppSessionStatus.DISCONNECTED,
        disconnectedAt: new Date(),
        encryptedCreds: null,
      },
    });
  }

  // Soft disconnect — preserves encryptedCreds so reconnect works without a new QR scan.
  // Use this for natural disconnects (network loss, phone offline, health worker exhaustion).
  // Only use disconnectSession() for explicit mobile logout (creds must be wiped).
  async markAsDisconnected(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: WhatsAppSessionStatus.DISCONNECTED,
        disconnectedAt: new Date(),
      },
    });
  }

  async resetReconnectCount(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        reconnectCount: 0,
        status: WhatsAppSessionStatus.RECONNECTING,
        disconnectedAt: null,
      },
    });
  }

  async findByOrgIdPaginated(
    orgId: string,
    options: {
      status?: WhatsAppSessionStatus;
      userId?: string;
      page: number;
      limit: number;
    },
  ) {
    const where: Record<string, unknown> = {
      orgId,
      deletedAt: null,
    };
    if (options.status) where.status = options.status;
    if (options.userId) where.userId = options.userId;

    const [data, total] = await Promise.all([
      this.prisma.whatsAppSession.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.whatsAppSession.count({ where }),
    ]);

    // Never send credentials to the client
    const mapped = data.map(({
      encryptedCreds,
      encryptedCloudToken: _token,
      encryptedCloudAppSecret: _secret,
      cloudVerifyToken: _verify,
      ...rest
    }) => ({
      ...rest,
      hasCreds: encryptedCreds !== null,
    }));

    return { data: mapped, total, page: options.page, limit: options.limit };
  }

  async findStaleConnectedSessions(heartbeatThreshold: Date) {
    return this.prisma.whatsAppSession.findMany({
      where: {
        deletedAt: null,
        // Official numbers have no socket to heal
        provider: WhatsAppProvider.QR,
        OR: [
          {
            status: WhatsAppSessionStatus.CONNECTED,
            OR: [
              { lastHeartbeatAt: { lt: heartbeatThreshold } },
              { lastHeartbeatAt: null },
            ],
          },
          { status: WhatsAppSessionStatus.RECONNECTING },
        ],
      },
    });
  }

  async countActiveByOrg(orgId: string) {
    return this.prisma.whatsAppSession.count({
      where: {
        orgId,
        deletedAt: null,
        status: { not: WhatsAppSessionStatus.DISCONNECTED },
      },
    });
  }

  async findByUserIds(userIds: string[], orgId: string) {
    return this.prisma.whatsAppSession.findMany({
      where: {
        userId: { in: userIds },
        orgId,
        deletedAt: null,
        status: { not: WhatsAppSessionStatus.DISCONNECTED },
      },
      select: {
        id: true,
        userId: true,
        phoneNumber: true,
        status: true,
      },
    });
  }

  // ───── Official numbers (Meta Cloud API) ─────

  /** An official number is connected as soon as Meta accepts its token */
  async createCloud(input: CreateCloudSessionInput) {
    const now = new Date();
    return this.prisma.whatsAppSession.create({
      data: {
        orgId: input.orgId,
        userId: input.userId,
        provider: WhatsAppProvider.CLOUD_API,
        status: WhatsAppSessionStatus.CONNECTED,
        phoneNumber: input.phoneNumber,
        cloudPhoneNumberId: input.phoneNumberId,
        cloudWabaId: input.wabaId,
        encryptedCloudToken: input.encryptedToken,
        encryptedCloudAppSecret: input.encryptedAppSecret,
        cloudVerifyToken: input.verifyToken,
        cloudVerifiedName: input.verifiedName ?? null,
        cloudQualityRating: input.qualityRating ?? null,
        cloudMessagingTier: input.messagingTier ?? null,
        linkedAt: now,
        lastActiveAt: now,
        lastHeartbeatAt: now,
      },
    });
  }

  /** Which of these sessions are official numbers */
  async findCloudIdsAmong(ids: string[], orgId: string): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.whatsAppSession.findMany({
      where: { id: { in: ids }, orgId, provider: WhatsAppProvider.CLOUD_API, deletedAt: null },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /** The org's official numbers that aren't removed */
  async findCloudByOrg(orgId: string) {
    return this.prisma.whatsAppSession.findMany({
      where: { orgId, provider: WhatsAppProvider.CLOUD_API, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Any org: the official number a Meta webhook is about */
  async findCloudByPhoneNumberId(phoneNumberId: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: { cloudPhoneNumberId: phoneNumberId, provider: WhatsAppProvider.CLOUD_API, deletedAt: null },
    });
  }

  async findCloudByIdAndOrg(id: string, orgId: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: { id, orgId, provider: WhatsAppProvider.CLOUD_API, deletedAt: null },
    });
  }

  /** Swap in a new token / app secret (e.g. the old one expired) */
  async updateCloudCredentials(id: string, data: { encryptedToken?: string; encryptedAppSecret?: string }) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        ...(data.encryptedToken && { encryptedCloudToken: data.encryptedToken }),
        ...(data.encryptedAppSecret && { encryptedCloudAppSecret: data.encryptedAppSecret }),
        status: WhatsAppSessionStatus.CONNECTED,
        disconnectedAt: null,
        disconnectReason: null,
      },
    });
  }

  /** Official numbers with a token are connected; QR-only states (RECONNECTING…) don't apply to them */
  async healCloudStatuses(): Promise<number> {
    const result = await this.prisma.whatsAppSession.updateMany({
      where: {
        provider: WhatsAppProvider.CLOUD_API,
        deletedAt: null,
        encryptedCloudToken: { not: null },
        status: { in: [WhatsAppSessionStatus.RECONNECTING, WhatsAppSessionStatus.CONNECTING] },
      },
      data: { status: WhatsAppSessionStatus.CONNECTED, reconnectCount: 0, disconnectedAt: null },
    });
    return result.count;
  }

  /** Official numbers that can send right now (loaded into the sender on boot) */
  async findConnectedCloud() {
    return this.prisma.whatsAppSession.findMany({
      where: {
        provider: WhatsAppProvider.CLOUD_API,
        status: WhatsAppSessionStatus.CONNECTED,
        deletedAt: null,
        encryptedCloudToken: { not: null },
      },
      select: { id: true, orgId: true, cloudPhoneNumberId: true, encryptedCloudToken: true },
    });
  }

  async updateCloudInfo(
    id: string,
    data: { verifiedName?: string | null; qualityRating?: string | null; messagingTier?: string | null; phoneNumber?: string },
  ) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        ...(data.verifiedName !== undefined && { cloudVerifiedName: data.verifiedName }),
        ...(data.qualityRating !== undefined && { cloudQualityRating: data.qualityRating }),
        ...(data.messagingTier !== undefined && { cloudMessagingTier: data.messagingTier }),
        ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
        lastHeartbeatAt: new Date(),
      },
    });
  }

  /** Remove an official number: the token is wiped, its chats and history stay */
  async removeCloud(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: WhatsAppSessionStatus.DISCONNECTED,
        disconnectedAt: new Date(),
        deletedAt: new Date(),
        encryptedCloudToken: null,
        encryptedCloudAppSecret: null,
      },
    });
  }

  /** QR sessions to restore sockets for on boot */
  async findAllActive() {
    return this.prisma.whatsAppSession.findMany({
      where: {
        deletedAt: null,
        provider: WhatsAppProvider.QR,
        status: {
          in: [WhatsAppSessionStatus.CONNECTED, WhatsAppSessionStatus.RECONNECTING],
        },
        encryptedCreds: { not: null },
        phoneNumber: { not: null },
      },
      select: {
        id: true,
        userId: true,
        orgId: true,
        phoneNumber: true,
      },
    });
  }
}
