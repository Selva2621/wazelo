import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infrastructure/database/prisma.service";

export interface CreateSavedContactGroupInput {
  name: string;
  contactIds: string[];
}

export interface SavedContactGroupSummary {
  id: string;
  name: string;
  contactCount: number;
  createdAt: Date;
}

@Injectable()
export class SavedContactGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByOrg(orgId: string) {
    return this.prisma.savedContactGroup.findMany({
      where: { orgId },
      include: { _count: { select: { members: true } } },
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    });
  }

  countActiveContacts(orgId: string, contactIds: string[]): Promise<number> {
    return this.prisma.contact.count({
      where: {
        orgId,
        id: { in: contactIds },
        deletedAt: null,
        mergedIntoId: null,
      },
    });
  }

  async findExistingNames(orgId: string, names: string[]): Promise<string[]> {
    const groups = await this.prisma.savedContactGroup.findMany({
      where: { orgId, name: { in: names } },
      select: { name: true },
    });
    return groups.map((group) => group.name);
  }

  createManyGroups(
    orgId: string,
    groups: CreateSavedContactGroupInput[],
  ): Promise<SavedContactGroupSummary[]> {
    return this.prisma.$transaction(async (tx) => {
      const contactIds = [...new Set(groups.flatMap((group) => group.contactIds))];
      await tx.savedContactGroupMember.deleteMany({
        where: { contactId: { in: contactIds } },
      });

      const created: SavedContactGroupSummary[] = [];
      for (const group of groups) {
        const savedGroup = await tx.savedContactGroup.create({
          data: { orgId, name: group.name },
        });
        await tx.savedContactGroupMember.createMany({
          data: group.contactIds.map((contactId) => ({
            groupId: savedGroup.id,
            contactId,
          })),
        });
        created.push({
          id: savedGroup.id,
          name: savedGroup.name,
          contactCount: group.contactIds.length,
          createdAt: savedGroup.createdAt,
        });
      }
      return created;
    });
  }
}
