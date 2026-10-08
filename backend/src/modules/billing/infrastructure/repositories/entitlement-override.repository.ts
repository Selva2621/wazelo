import { Injectable } from '@nestjs/common';
import { EntitlementKind, OrgEntitlementOverride } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface UpsertOverrideInput {
  orgId: string;
  kind: EntitlementKind;
  key: string;
  limitValue: number | null;
  enabled: boolean | null;
  reason: string;
  expiresAt: Date | null;
  createdById: string;
}

/** Writes happen only from the super-admin module — tenants never reach this. */
@Injectable()
export class EntitlementOverrideRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByOrg(orgId: string): Promise<OrgEntitlementOverride[]> {
    return this.prisma.orgEntitlementOverride.findMany({ where: { orgId }, orderBy: [{ kind: 'asc' }, { key: 'asc' }] });
  }

  findOne(orgId: string, kind: EntitlementKind, key: string) {
    return this.prisma.orgEntitlementOverride.findUnique({ where: { orgId_kind_key: { orgId, kind, key } } });
  }

  upsert(input: UpsertOverrideInput) {
    const { orgId, kind, key, ...data } = input;
    return this.prisma.orgEntitlementOverride.upsert({
      where: { orgId_kind_key: { orgId, kind, key } },
      create: input,
      update: data,
    });
  }

  findById(id: string) {
    return this.prisma.orgEntitlementOverride.findUnique({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.orgEntitlementOverride.delete({ where: { id } });
  }
}
