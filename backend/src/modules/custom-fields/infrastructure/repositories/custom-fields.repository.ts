import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class CustomFieldsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ─── Definitions ─── */

  async createDefinition(data: {
    orgId: string;
    entity: string;
    fieldName: string;
    fieldLabel: string;
    fieldType: string;
    options?: unknown;
    isRequired?: boolean;
    defaultValue?: string;
    sortOrder?: number;
  }) {
    return this.prisma.customFieldDefinition.create({ data: data as any });
  }

  async findDefinitions(orgId: string, entity?: string) {
    return this.prisma.customFieldDefinition.findMany({
      where: { orgId, ...(entity ? { entity } : {}) },
      orderBy: [{ entity: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findDefinitionById(id: string, orgId: string) {
    return this.prisma.customFieldDefinition.findFirst({ where: { id, orgId } });
  }

  async updateDefinition(id: string, orgId: string, data: Partial<{
    fieldLabel: string;
    options: unknown;
    isRequired: boolean;
    defaultValue: string | null;
    sortOrder: number;
  }>) {
    return this.prisma.customFieldDefinition.updateMany({ where: { id, orgId }, data: data as any });
  }

  async deleteDefinition(id: string, orgId: string) {
    // Cascade deletes values via onDelete: Cascade
    return this.prisma.customFieldDefinition.deleteMany({ where: { id, orgId } });
  }

  /* ─── Values ─── */

  async setValues(orgId: string, entityId: string, values: { fieldId: string; value: string }[]) {
    const ops = values.map((v) =>
      this.prisma.customFieldValue.upsert({
        where: { fieldId_entityId: { fieldId: v.fieldId, entityId } },
        create: { orgId, fieldId: v.fieldId, entityId, value: v.value },
        update: { value: v.value },
      }),
    );
    return this.prisma.$transaction(ops);
  }

  async getValues(orgId: string, entityId: string) {
    return this.prisma.customFieldValue.findMany({
      where: { orgId, entityId },
      include: { field: { select: { fieldName: true, fieldLabel: true, fieldType: true, options: true } } },
    });
  }

  async deleteValue(fieldId: string, entityId: string) {
    return this.prisma.customFieldValue.deleteMany({ where: { fieldId, entityId } });
  }
}
