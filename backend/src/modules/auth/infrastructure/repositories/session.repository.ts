import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Session } from '@prisma/client';

/**
 * Refresh tokens are stored as SHA-256 hex digests, never raw, so a database leak does not
 * hand out live sessions. Every method here takes the RAW token and hashes it internally;
 * callers outside this repository that match on `refreshToken` must use this helper too.
 */
export function hashRefreshToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken, 'utf8').digest('hex');
}

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param data.familyId omit for a fresh login (starts a new family) */
  async create(data: {
    userId: string;
    orgId: string;
    refreshToken: string;
    familyId?: string;
    expiresAt: Date;
    rememberMe?: boolean;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<Session> {
    const { refreshToken, familyId, ...rest } = data;
    return this.prisma.session.create({
      data: {
        ...rest,
        refreshToken: hashRefreshToken(refreshToken),
        familyId: familyId ?? randomUUID(),
      },
    });
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: {
        refreshToken: hashRefreshToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /** Includes revoked and rotated sessions, so the caller can tell a race from token reuse. */
  async findByRefreshTokenAnyState(refreshToken: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { refreshToken: hashRefreshToken(refreshToken) },
    });
  }

  /**
   * Atomically marks an active session as rotated. Returns false if another request got
   * there first, so two concurrent refreshes can never both mint a new token.
   */
  async claimForRotation(sessionId: string): Promise<boolean> {
    const now = new Date();
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now, rotatedAt: now },
    });
    return result.count === 1;
  }

  /** False once the family was logged out or revoked (so the grace path can't revive it). */
  async familyHasActiveSession(familyId: string): Promise<boolean> {
    const active = await this.prisma.session.findFirst({
      where: { familyId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    return active !== null;
  }

  /** Revokes every still-active session descended from the same login. */
  async revokeFamily(familyId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
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
      where: { refreshToken: hashRefreshToken(refreshToken), revokedAt: null },
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

  /**
   * Rotated sessions are kept until they expire: they are the evidence that lets a replayed
   * (stolen) refresh token be recognised and its family revoked.
   */
  async deleteExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null }, rotatedAt: null },
        ],
      },
    });
    return result.count;
  }
}
