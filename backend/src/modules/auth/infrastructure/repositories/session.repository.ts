import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Session } from '@prisma/client';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    orgId: string;
    refreshToken: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: {
        refreshToken,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revokeSession(sessionId: string): Promise<Session> {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async revokeSessionByToken(refreshToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async findActiveSessionsByUserId(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveSessionsByOrgId(orgId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        orgId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });
    return result.count;
  }
}
