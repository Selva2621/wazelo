import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class ApiKeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Generate a new API key. Returns the raw key ONCE (never stored).
   */
  async createKey(data: {
    orgId: string;
    name: string;
    scopes: string[];
    expiresAt?: Date;
    createdById: string;
  }) {
    const rawKey = `crm_sk_${randomBytes(32).toString('hex')}`;
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const record = await this.prisma.apiKey.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        keyHash,
        keyPrefix,
        scopes: data.scopes,
        expiresAt: data.expiresAt,
        createdById: data.createdById,
      },
      select: {
        id: true, name: true, keyPrefix: true, scopes: true,
        expiresAt: true, createdAt: true,
      },
    });

    return { ...record, rawKey }; // rawKey shown once to user
  }

  /**
   * Validate an API key and return org/scope info. Used by auth guard.
   */
  async validateKey(rawKey: string) {
    const keyHash = this.hashKey(rawKey);
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true, orgId: true, scopes: true, isActive: true,
        expiresAt: true,
      },
    });

    if (!key || !key.isActive) return null;
    if (key.expiresAt && key.expiresAt < new Date()) return null;

    // Update last used
    await this.prisma.apiKey.update({
      where: { keyHash },
      data: { lastUsedAt: new Date() },
    });

    return key;
  }

  async findByOrg(orgId: string) {
    return this.prisma.apiKey.findMany({
      where: { orgId },
      select: {
        id: true, name: true, keyPrefix: true, scopes: true,
        isActive: true, expiresAt: true, lastUsedAt: true,
        createdAt: true, revokedAt: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeKey(id: string, orgId: string) {
    return this.prisma.apiKey.updateMany({
      where: { id, orgId },
      data: { isActive: false, revokedAt: new Date() },
    });
  }

  async rotateKey(id: string, orgId: string, createdById: string) {
    // Revoke old key
    const old = await this.prisma.apiKey.findFirst({
      where: { id, orgId },
      select: { name: true, scopes: true, expiresAt: true },
    });
    if (!old) return null;

    await this.revokeKey(id, orgId);

    // Create new key with same config
    return this.createKey({
      orgId,
      name: old.name,
      scopes: old.scopes,
      expiresAt: old.expiresAt ?? undefined,
      createdById,
    });
  }
}
