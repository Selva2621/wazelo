import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { SuperAdminSession } from '@prisma/client';

/** Refresh tokens are stored as SHA-256 hex; every method takes the RAW token. */
function hashToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken, 'utf8').digest('hex');
}

@Injectable()
export class SuperAdminSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    id: string;
    superAdminId: string;
    refreshToken: string;
    familyId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<SuperAdminSession> {
    const { refreshToken, userAgent, ...rest } = data;
    return this.prisma.superAdminSession.create({
      data: { ...rest, userAgent: userAgent?.slice(0, 512), refreshToken: hashToken(refreshToken) },
    });
  }

  /** Includes revoked and rotated rows, so the caller can tell a race from token reuse. */
  findByRefreshTokenAnyState(refreshToken: string): Promise<SuperAdminSession | null> {
    return this.prisma.superAdminSession.findUnique({
      where: { refreshToken: hashToken(refreshToken) },
    });
  }

  /** Atomically marks a session rotated. False if a concurrent request got there first. */
  async claimForRotation(id: string): Promise<boolean> {
    const now = new Date();
    const result = await this.prisma.superAdminSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: now, rotatedAt: now },
    });
    return result.count === 1;
  }

  async familyHasActiveSession(familyId: string): Promise<boolean> {
    const active = await this.prisma.superAdminSession.findFirst({
      where: { familyId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    return active !== null;
  }

  /** Revokes a login (all its rotations). Scoped to the owner so one admin can't revoke another's. */
  async revokeFamily(familyId: string, superAdminId?: string): Promise<number> {
    const result = await this.prisma.superAdminSession.updateMany({
      where: { familyId, revokedAt: null, ...(superAdminId ? { superAdminId } : {}) },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async revokeAll(superAdminId: string): Promise<number> {
    const result = await this.prisma.superAdminSession.updateMany({
      where: { superAdminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  /** One row per signed-in device: the live head of each family. */
  findActive(superAdminId: string): Promise<SuperAdminSession[]> {
    return this.prisma.superAdminSession.findMany({
      where: { superAdminId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Rotated rows are kept until expiry: they are the evidence for reuse detection. */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.superAdminSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
