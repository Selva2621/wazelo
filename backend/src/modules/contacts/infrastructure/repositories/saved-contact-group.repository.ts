import { randomUUID } from "crypto";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@/infrastructure/database/prisma.service";
import type { ContactOwnerScope } from "./contact.repository";

export interface CreateSavedContactGroupInput {
  name: string;
  contactIds: string[];
}

export interface SavedContactGroupSummary {
  id: string;
  name: string;
  contactCount: number;
  createdAt: Date;
  /** "On WhatsApp?" answers for the visible members (unchecked = never checked / failed) */
  whatsapp?: { on: number; off: number; unchecked: number };
  /** Background number check: { state, startedAt, finishedAt } */
  waCheck?: { state: string; startedAt?: string; finishedAt?: string } | null;
}

/** Groups that would lose contacts if those contacts were saved into a new group */
export interface GroupMoveImpact {
  alreadyGrouped: number;
  groups: { id: string; name: string; count: number }[];
}

/** Large saves create many rows; Prisma's 5s default isn't enough */
const TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };

function scopeOwnerIds(scope: ContactOwnerScope): string[] | undefined {
  return scope.ownerId ? [scope.ownerId] : scope.ownerIds;
}

function contactScopeWhere(orgId: string, scope: ContactOwnerScope): Prisma.ContactWhereInput {
  const ownerIds = scopeOwnerIds(scope);
  return {
    orgId,
    deletedAt: null,
    mergedIntoId: null,
    ...(ownerIds && { ownerId: { in: ownerIds } }),
  };
}

@Injectable()
export class SavedContactGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Live groups with the number of members the caller may see. */
  async findByOrg(orgId: string, scope: ContactOwnerScope): Promise<SavedContactGroupSummary[]> {
    const restricted = scopeOwnerIds(scope) !== undefined;
    const groups = await this.prisma.savedContactGroup.findMany({
      where: { orgId, deletedAt: null },
      select: {
        id: true,
        name: true,
        createdAt: true,
        waCheck: true,
        _count: {
          select: { members: { where: { contact: contactScopeWhere(orgId, scope) } } },
        },
      },
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    });
    const waCounts = await this.whatsappCounts(orgId, scope, groups.map((g) => g.id));

    return groups
      .map(({ _count, waCheck, ...group }) => {
        const counts = waCounts.get(group.id) ?? { on: 0, off: 0 };
        const check = waCheck as { state?: string; startedAt?: string; finishedAt?: string } | null;
        return {
          ...group,
          contactCount: _count.members,
          whatsapp: {
            on: counts.on,
            off: counts.off,
            unchecked: Math.max(0, _count.members - counts.on - counts.off),
          },
          // The job token stays server-side
          waCheck: check?.state
            ? { state: check.state, startedAt: check.startedAt, finishedAt: check.finishedAt }
            : null,
        };
      })
      // Employees / managers only see groups that hold some of their contacts
      .filter((group) => !restricted || group.contactCount > 0);
  }

  /** Per group: visible members known on / not on WhatsApp. */
  private async whatsappCounts(
    orgId: string,
    scope: ContactOwnerScope,
    groupIds: string[],
  ): Promise<Map<string, { on: number; off: number }>> {
    const result = new Map<string, { on: number; off: number }>();
    if (groupIds.length === 0) return result;
    const ownerIds = scopeOwnerIds(scope);
    if (ownerIds && ownerIds.length === 0) return result; // sees no contacts
    // One grouped query for all groups (not two counts per group)
    const rows = await this.prisma.$queryRaw<{ group_id: string; wa_exists: boolean; n: bigint }[]>`
      SELECT m.group_id, c.wa_exists, COUNT(*)::bigint AS n
      FROM saved_contact_group_members m
      JOIN contacts c ON c.id = m.contact_id
      WHERE m.group_id IN (${Prisma.join(groupIds.map((id) => Prisma.sql`${id}::uuid`))})
        AND c.org_id = ${orgId}::uuid
        AND c.deleted_at IS NULL
        AND c.merged_into_id IS NULL
        AND c.wa_exists IS NOT NULL
        ${ownerIds ? Prisma.sql`AND c.owner_id IN (${Prisma.join(ownerIds.map((id) => Prisma.sql`${id}::uuid`))})` : Prisma.empty}
      GROUP BY m.group_id, c.wa_exists`;
    for (const row of rows) {
      const entry = result.get(row.group_id) ?? { on: 0, off: 0 };
      if (row.wa_exists) entry.on = Number(row.n);
      else entry.off = Number(row.n);
      result.set(row.group_id, entry);
    }
    return result;
  }

  findById(orgId: string, id: string) {
    return this.prisma.savedContactGroup.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true, name: true },
    });
  }

  countActiveContacts(orgId: string, scope: ContactOwnerScope, contactIds: string[]): Promise<number> {
    return this.prisma.contact.count({
      where: { ...contactScopeWhere(orgId, scope), id: { in: contactIds } },
    });
  }

  /** Visible contacts not in any live group, oldest first (for "split into groups"). */
  async findUngroupedContactIds(orgId: string, scope: ContactOwnerScope, take: number): Promise<{ ids: string[]; total: number }> {
    const where: Prisma.ContactWhereInput = {
      ...contactScopeWhere(orgId, scope),
      optedOut: false,
      savedGroupMemberships: { none: { group: { deletedAt: null } } },
    };
    const [rows, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        select: { id: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take,
      }),
      this.prisma.contact.count({ where }),
    ]);
    return { ids: rows.map((r) => r.id), total };
  }

  /** Visible contacts that are not in any live group (what "Make groups → not in a group yet" uses). */
  countUngrouped(orgId: string, scope: ContactOwnerScope): Promise<number> {
    return this.prisma.contact.count({
      where: {
        ...contactScopeWhere(orgId, scope),
        optedOut: false,
        savedGroupMemberships: { none: { group: { deletedAt: null } } },
      },
    });
  }

  /** The given contacts that are not in any live group yet. */
  async filterUngrouped(orgId: string, contactIds: string[]): Promise<string[]> {
    if (contactIds.length === 0) return [];
    const grouped = await this.prisma.savedContactGroupMember.findMany({
      where: { contactId: { in: contactIds }, group: { orgId, deletedAt: null } },
      select: { contactId: true },
    });
    const taken = new Set(grouped.map((g) => g.contactId));
    return contactIds.filter((id) => !taken.has(id));
  }

  async findExistingNames(orgId: string, names: string[]): Promise<string[]> {
    const groups = await this.prisma.savedContactGroup.findMany({
      where: { orgId, deletedAt: null, name: { in: names } },
      select: { name: true },
    });
    return groups.map((group) => group.name);
  }

  /** Live group names starting with a prefix (to continue "Group 1, Group 2…"). */
  async findNamesWithPrefix(orgId: string, prefix: string): Promise<string[]> {
    const groups = await this.prisma.savedContactGroup.findMany({
      where: { orgId, deletedAt: null, name: { startsWith: prefix } },
      select: { name: true },
    });
    return groups.map((g) => g.name);
  }

  /** Which live groups the given contacts are in now. */
  async moveImpact(orgId: string, contactIds: string[], excludeGroupId?: string): Promise<GroupMoveImpact> {
    const rows = await this.prisma.savedContactGroupMember.groupBy({
      by: ["groupId"],
      where: {
        contactId: { in: contactIds },
        group: { orgId, deletedAt: null, ...(excludeGroupId && { id: { not: excludeGroupId } }) },
      },
      _count: { id: true },
    });
    if (rows.length === 0) return { alreadyGrouped: 0, groups: [] };

    const names = await this.prisma.savedContactGroup.findMany({
      where: { id: { in: rows.map((r) => r.groupId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(names.map((n) => [n.id, n.name]));
    const groups = rows
      .map((r) => ({ id: r.groupId, name: nameById.get(r.groupId) ?? "Group", count: r._count.id }))
      .sort((a, b) => b.count - a.count);
    return { alreadyGrouped: groups.reduce((sum, g) => sum + g.count, 0), groups };
  }

  /**
   * Create groups and move their contacts in (a contact is in one group only).
   * Groups left empty by the move are soft-deleted. Bulk inserts keep 10k
   * contacts to a handful of statements.
   */
  createManyGroups(orgId: string, groups: CreateSavedContactGroupInput[]): Promise<SavedContactGroupSummary[]> {
    return this.prisma.$transaction(async (tx) => {
      const contactIds = [...new Set(groups.flatMap((group) => group.contactIds))];
      const affected = await this.removeMemberships(tx, orgId, contactIds);

      const createdAt = new Date();
      const rows = groups.map((group) => ({ id: randomUUID(), orgId, name: group.name, createdAt }));
      await tx.savedContactGroup.createMany({ data: rows });
      await tx.savedContactGroupMember.createMany({
        data: groups.flatMap((group, index) =>
          group.contactIds.map((contactId) => ({ groupId: rows[index].id, contactId })),
        ),
      });

      await this.softDeleteIfEmpty(tx, affected);

      return rows.map((row, index) => ({
        id: row.id,
        name: row.name,
        contactCount: groups[index].contactIds.length,
        createdAt,
      }));
    }, TX_OPTIONS);
  }

  /** Move contacts into an existing group, or out of every group (groupId null). */
  moveContacts(orgId: string, contactIds: string[], groupId: string | null): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const affected = await this.removeMemberships(tx, orgId, contactIds);
      let moved = contactIds.length;
      if (groupId) {
        const result = await tx.savedContactGroupMember.createMany({
          data: contactIds.map((contactId) => ({ groupId, contactId })),
          skipDuplicates: true,
        });
        moved = result.count;
        affected.delete(groupId);
      }
      await this.softDeleteIfEmpty(tx, affected);
      return moved;
    }, TX_OPTIONS);
  }

  rename(orgId: string, id: string, name: string) {
    return this.prisma.savedContactGroup.update({
      where: { id, orgId },
      data: { name },
      select: { id: true, name: true },
    });
  }

  /** Soft-delete the group and free its contacts so they can join another group. */
  async softDelete(orgId: string, id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.savedContactGroupMember.deleteMany({ where: { groupId: id, group: { orgId } } }),
      this.prisma.savedContactGroup.updateMany({
        where: { id, orgId, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  private async removeMemberships(
    tx: Prisma.TransactionClient,
    orgId: string,
    contactIds: string[],
  ): Promise<Set<string>> {
    if (contactIds.length === 0) return new Set();
    const previous = await tx.savedContactGroupMember.findMany({
      where: { contactId: { in: contactIds }, group: { orgId } },
      select: { groupId: true },
      distinct: ["groupId"],
    });
    await tx.savedContactGroupMember.deleteMany({
      where: { contactId: { in: contactIds }, group: { orgId } },
    });
    return new Set(previous.map((p) => p.groupId));
  }

  private async softDeleteIfEmpty(tx: Prisma.TransactionClient, groupIds: Set<string>): Promise<void> {
    if (groupIds.size === 0) return;
    await tx.savedContactGroup.updateMany({
      where: { id: { in: [...groupIds] }, deletedAt: null, members: { none: {} } },
      data: { deletedAt: new Date() },
    });
  }
}
