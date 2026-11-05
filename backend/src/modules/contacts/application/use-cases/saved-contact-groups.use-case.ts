import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CAMPAIGN_CONFIG } from "@/common/constants";
import {
  CreateSavedContactGroupInput,
  SavedContactGroupRepository,
  SavedContactGroupSummary,
} from "../../infrastructure/repositories/saved-contact-group.repository";

@Injectable()
export class SavedContactGroupsUseCase {
  constructor(private readonly groups: SavedContactGroupRepository) {}

  async list(orgId: string) {
    const groups = await this.groups.findByOrg(orgId);
    return groups.map(({ _count, ...group }) => ({
      ...group,
      contactCount: _count.members,
    }));
  }

  async create(
    orgId: string,
    name: string,
    contactIds: string[],
  ): Promise<{
    groups: SavedContactGroupSummary[];
    batchSize: number;
  }> {
    const normalizedName = name.trim();
    const uniqueContactIds = [...new Set(contactIds)];
    if (!normalizedName)
      throw new BadRequestException("Group name is required");
    if (uniqueContactIds.length === 0)
      throw new BadRequestException("Select at least one contact");
    if (uniqueContactIds.length > CAMPAIGN_CONFIG.MAX_RECIPIENTS) {
      throw new BadRequestException(
        `Cannot save more than ${CAMPAIGN_CONFIG.MAX_RECIPIENTS} contacts at once`,
      );
    }

    const activeCount = await this.groups.countActiveContacts(
      orgId,
      uniqueContactIds,
    );
    if (activeCount !== uniqueContactIds.length) {
      throw new BadRequestException(
        "One or more selected contacts are unavailable",
      );
    }

    const groupCount = Math.ceil(
      uniqueContactIds.length / CAMPAIGN_CONFIG.BATCH_SIZE,
    );
    const groups: CreateSavedContactGroupInput[] = Array.from(
      { length: groupCount },
      (_, index) => {
        const start = index * CAMPAIGN_CONFIG.BATCH_SIZE;
        const suffix =
          groupCount === 1 ? "" : ` - ${String(index + 1).padStart(3, "0")}`;
        const groupName = `${normalizedName.slice(0, 100 - suffix.length)}${suffix}`;
        return {
          name: groupName,
          contactIds: uniqueContactIds.slice(
            start,
            start + CAMPAIGN_CONFIG.BATCH_SIZE,
          ),
        };
      },
    );

    const existingNames = await this.groups.findExistingNames(
      orgId,
      groups.map((group) => group.name),
    );
    if (existingNames.length > 0) {
      throw new ConflictException(
        `A contact group named "${existingNames[0]}" already exists`,
      );
    }

    try {
      const created = await this.groups.createManyGroups(orgId, groups);
      return { groups: created, batchSize: CAMPAIGN_CONFIG.BATCH_SIZE };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = error.meta?.target;
        const targetText = Array.isArray(target)
          ? target.join(",")
          : String(target ?? "");
        if (targetText.includes("contact_id")) {
          throw new ConflictException(
            "One or more selected contacts were moved to another group at the same time. Please try again",
          );
        }
        throw new ConflictException(
          "A contact group with that name already exists",
        );
      }
      throw error;
    }
  }
}
