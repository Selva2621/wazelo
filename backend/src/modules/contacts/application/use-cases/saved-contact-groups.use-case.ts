import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CAMPAIGN_CONFIG } from "@/common/constants";
import {
  CreateSavedContactGroupInput,
  GroupMoveImpact,
  SavedContactGroupRepository,
  SavedContactGroupSummary,
} from "../../infrastructure/repositories/saved-contact-group.repository";
import { ListContactsUseCase } from "./list-contacts.use-case";

/** Most contacts one save / split call handles (keeps the request and transaction bounded) */
export const SAVED_GROUP_MAX_CONTACTS_PER_CALL = 10_000;
export const SAVED_GROUP_MIN_SIZE = 1;
export const SAVED_GROUP_MAX_SIZE = 1_000;

/** Split ids into chunks of `size`, named "<name> - 001", "<name> - 002"… (or just "<name>"). */
export function chunkIntoGroups(name: string, contactIds: string[], size: number): CreateSavedContactGroupInput[] {
  const count = Math.ceil(contactIds.length / size);
  return Array.from({ length: count }, (_, index) => {
    const suffix = count === 1 ? "" : ` - ${String(index + 1).padStart(3, "0")}`;
    return {
      name: `${name.slice(0, 100 - suffix.length)}${suffix}`,
      contactIds: contactIds.slice(index * size, (index + 1) * size),
    };
  });
}

/** Next free number for "<prefix> N" names: existing "Group 1", "Group 7" → 8. */
export function nextGroupNumber(prefix: string, existingNames: string[]): number {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (\\d+)$`);
  return existingNames.reduce((max, name) => {
    const match = pattern.exec(name);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
}

export type GroupBuildMode = "one" | "split";

export interface GroupBuildOptions {
  mode?: GroupBuildMode;
  /** Leave contacts that are already in a group where they are */
  onlyUngrouped?: boolean;
}

@Injectable()
export class SavedContactGroupsUseCase {
  constructor(
    private readonly groups: SavedContactGroupRepository,
    private readonly listContacts: ListContactsUseCase,
  ) {}

  async list(orgId: string, userId: string, role: string) {
    const scope = await this.listContacts.resolveOwnerScope(orgId, userId, role);
    return this.groups.findByOrg(orgId, scope);
  }

  /** "Saving these moves N contacts out of <groups>" — shown before a save or move. */
  async checkMove(orgId: string, userId: string, role: string, contactIds: string[], targetGroupId?: string): Promise<GroupMoveImpact> {
    const ids = await this.visibleContactIds(orgId, userId, role, contactIds);
    return this.groups.moveImpact(orgId, ids, targetGroupId);
  }

  async create(
    orgId: string,
    userId: string,
    role: string,
    name: string,
    contactIds: string[],
    groupSize: number = CAMPAIGN_CONFIG.BATCH_SIZE,
    options: GroupBuildOptions = {},
  ): Promise<{ groups: SavedContactGroupSummary[]; batchSize: number; movedFromGroups: number; skippedGrouped: number }> {
    const normalizedName = name.trim();
    if (!normalizedName) throw new BadRequestException("Group name is required");
    const size = this.assertGroupSize(groupSize);
    const visible = await this.visibleContactIds(orgId, userId, role, contactIds);

    // Default for "Make groups": leave contacts that already have a group where they are
    const ids = options.onlyUngrouped ? await this.groups.filterUngrouped(orgId, visible) : visible;
    const skippedGrouped = visible.length - ids.length;
    if (ids.length === 0) {
      throw new BadRequestException("All selected contacts are already in a group");
    }

    const groups = await this.buildGroups(orgId, normalizedName, ids, size, options.mode);
    await this.assertNamesFree(orgId, groups);
    const impact = options.onlyUngrouped ? { alreadyGrouped: 0 } : await this.groups.moveImpact(orgId, ids);

    const created = await this.withConflictMessages(() => this.groups.createManyGroups(orgId, groups));
    return { groups: created, batchSize: size, movedFromGroups: impact.alreadyGrouped, skippedGrouped };
  }

  /** How many visible contacts are not in a group yet. */
  async ungroupedCount(orgId: string, userId: string, role: string): Promise<{ count: number }> {
    const scope = await this.listContacts.resolveOwnerScope(orgId, userId, role);
    return { count: await this.groups.countUngrouped(orgId, scope) };
  }

  /**
   * Put every visible contact that is not in a group yet into groups: split into
   * groups of `groupSize` named "<prefix> N" (continuing existing numbers), or
   * one group named `prefix` (mode "one").
   */
  async split(
    orgId: string,
    userId: string,
    role: string,
    groupSize: number = CAMPAIGN_CONFIG.BATCH_SIZE,
    prefix = "Group",
    mode: GroupBuildMode = "split",
  ): Promise<{ groups: SavedContactGroupSummary[]; remaining: number }> {
    const size = this.assertGroupSize(groupSize);
    const namePrefix = prefix.trim().slice(0, 80) || "Group";
    const scope = await this.listContacts.resolveOwnerScope(orgId, userId, role);
    const { ids, total } = await this.groups.findUngroupedContactIds(orgId, scope, SAVED_GROUP_MAX_CONTACTS_PER_CALL);
    if (ids.length === 0) throw new BadRequestException("Every contact is already in a group");

    const groups = await this.buildGroups(orgId, namePrefix, ids, size, mode);
    if (mode === "one") await this.assertNamesFree(orgId, groups);
    const created = await this.withConflictMessages(() => this.groups.createManyGroups(orgId, groups));
    return { groups: created, remaining: Math.max(0, total - ids.length) };
  }

  /**
   * one   → a single group with exactly this name
   * split → groups of `size` named "<name> N", continuing after existing "<name> N" groups
   * (none = older clients) → "<name> - 001", "<name> - 002"…
   */
  private async buildGroups(
    orgId: string,
    name: string,
    ids: string[],
    size: number,
    mode?: GroupBuildMode,
  ): Promise<CreateSavedContactGroupInput[]> {
    if (mode === "one") return [{ name: name.slice(0, 100), contactIds: ids }];
    if (mode === "split") {
      const prefix = name.slice(0, 80);
      const start = nextGroupNumber(prefix, await this.groups.findNamesWithPrefix(orgId, `${prefix} `));
      const groups: CreateSavedContactGroupInput[] = [];
      for (let i = 0; i < ids.length; i += size) {
        groups.push({ name: `${prefix} ${start + groups.length}`, contactIds: ids.slice(i, i + size) });
      }
      return groups;
    }
    return chunkIntoGroups(name, ids, size);
  }

  /** Move contacts into another group, or out of all groups (groupId null). */
  async move(orgId: string, userId: string, role: string, contactIds: string[], groupId: string | null) {
    const ids = await this.visibleContactIds(orgId, userId, role, contactIds);
    if (groupId && !(await this.groups.findById(orgId, groupId))) {
      throw new NotFoundException("Contact group not found");
    }
    const moved = await this.groups.moveContacts(orgId, ids, groupId);
    return { moved };
  }

  async rename(orgId: string, role: string, id: string, name: string) {
    this.assertCanManage(role);
    const normalized = name.trim();
    if (!normalized) throw new BadRequestException("Group name is required");
    if (!(await this.groups.findById(orgId, id))) throw new NotFoundException("Contact group not found");
    if ((await this.groups.findExistingNames(orgId, [normalized])).length > 0) {
      throw new ConflictException(`A contact group named "${normalized}" already exists`);
    }
    return this.withConflictMessages(() => this.groups.rename(orgId, id, normalized));
  }

  async remove(orgId: string, role: string, id: string) {
    this.assertCanManage(role);
    if (!(await this.groups.findById(orgId, id))) throw new NotFoundException("Contact group not found");
    await this.groups.softDelete(orgId, id);
    return { deleted: true };
  }

  private async visibleContactIds(orgId: string, userId: string, role: string, contactIds: string[]): Promise<string[]> {
    const ids = [...new Set(contactIds)];
    if (ids.length === 0) throw new BadRequestException("Select at least one contact");
    if (ids.length > SAVED_GROUP_MAX_CONTACTS_PER_CALL) {
      throw new BadRequestException(`Cannot save more than ${SAVED_GROUP_MAX_CONTACTS_PER_CALL} contacts at once`);
    }
    const scope = await this.listContacts.resolveOwnerScope(orgId, userId, role);
    const visible = await this.groups.countActiveContacts(orgId, scope, ids);
    if (visible !== ids.length) {
      throw new BadRequestException("One or more selected contacts are unavailable");
    }
    return ids;
  }

  private assertGroupSize(size: number): number {
    if (!Number.isInteger(size) || size < SAVED_GROUP_MIN_SIZE || size > SAVED_GROUP_MAX_SIZE) {
      throw new BadRequestException(`Group size must be between ${SAVED_GROUP_MIN_SIZE} and ${SAVED_GROUP_MAX_SIZE}`);
    }
    return size;
  }

  private assertCanManage(role: string) {
    // Groups are shared across the workspace; only admins and managers rename/delete them
    if (role === "EMPLOYEE") throw new ForbiddenException("Only admins and managers can rename or delete groups");
  }

  private async assertNamesFree(orgId: string, groups: CreateSavedContactGroupInput[]) {
    const existing = await this.groups.findExistingNames(orgId, groups.map((g) => g.name));
    if (existing.length > 0) {
      throw new ConflictException(`A contact group named "${existing[0]}" already exists`);
    }
  }

  private async withConflictMessages<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = error.meta?.target;
        const targetText = Array.isArray(target) ? target.join(",") : String(target ?? "");
        if (targetText.includes("contact_id")) {
          throw new ConflictException(
            "One or more selected contacts were moved to another group at the same time. Please try again",
          );
        }
        throw new ConflictException("A contact group with that name already exists");
      }
      throw error;
    }
  }
}
