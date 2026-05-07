import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { CampaignAudienceType, Prisma } from '@prisma/client';

export interface AudienceFilters {
  leadStatuses?: string[];
  tagIds?: string[];
  ownerIds?: string[];
  sources?: string[];
  productIds?: string[];
  teamIds?: string[];
}

export interface ResolvedContact {
  id: string;
  phoneNumber: string;
}

export interface AudienceResult {
  contacts: ResolvedContact[];
  total: number;
}

const E164_REGEX = /^\+?[1-9]\d{6,14}$/;

@Injectable()
export class AudienceResolverService {
  private readonly logger = new Logger(AudienceResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the target audience for a campaign.
   *
   * 1. Builds query from audience type + filters
   * 2. Excludes: deleted, merged, opted-out contacts
   * 3. Validates phone numbers (E.164)
   * 4. Deduplicates by phone number (keeps first contact per phone)
   * 5. Uses cursor-based pagination for large datasets
   */
  async resolveAudience(
    orgId: string,
    audienceType: CampaignAudienceType,
    filters?: AudienceFilters,
  ): Promise<AudienceResult> {
    if (filters) await this.resolveTeamIds(filters);
    const where = this.buildWhereClause(orgId, audienceType, filters);

    const contacts: ResolvedContact[] = [];
    const seenPhones = new Set<string>();
    const batchSize = 1000;
    let cursor: string | undefined;

    // Cursor-based pagination for large datasets
    while (true) {
      const batch = await this.prisma.contact.findMany({
        where,
        select: { id: true, phoneNumber: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
      });

      if (batch.length === 0) break;

      for (const contact of batch) {
        // Validate E.164 phone number
        if (!E164_REGEX.test(contact.phoneNumber)) {
          continue;
        }

        // Deduplicate by phone number within org
        const normalizedPhone = contact.phoneNumber.replace(/^\+/, '');
        if (seenPhones.has(normalizedPhone)) {
          continue;
        }

        seenPhones.add(normalizedPhone);
        contacts.push({
          id: contact.id,
          phoneNumber: contact.phoneNumber,
        });
      }

      cursor = batch[batch.length - 1].id;

      // If batch was smaller than requested, we've reached the end
      if (batch.length < batchSize) break;
    }

    this.logger.log(
      `Resolved ${contacts.length} recipients for org ${orgId} (audience: ${audienceType})`,
    );

    return { contacts, total: contacts.length };
  }

  /**
   * Preview audience count without fetching all contacts.
   * Used by the preview-audience endpoint for fast feedback.
   */
  async previewAudienceCount(
    orgId: string,
    audienceType: CampaignAudienceType,
    filters?: AudienceFilters,
  ): Promise<number> {
    if (filters) await this.resolveTeamIds(filters);
    const where = this.buildWhereClause(orgId, audienceType, filters);
    return this.prisma.contact.count({ where });
  }

  private buildWhereClause(
    orgId: string,
    audienceType: CampaignAudienceType,
    filters?: AudienceFilters,
  ): Prisma.ContactWhereInput {
    const where: Prisma.ContactWhereInput = {
      orgId,
      deletedAt: null,
      mergedIntoId: null,
      optedOut: false,
    };

    if (audienceType === CampaignAudienceType.FILTERED && filters) {
      if (filters.leadStatuses && filters.leadStatuses.length > 0) {
        where.leadStatus = { in: filters.leadStatuses as any };
      }

      if (filters.ownerIds && filters.ownerIds.length > 0) {
        where.ownerId = { in: filters.ownerIds };
      }

      if (filters.sources && filters.sources.length > 0) {
        where.source = { in: filters.sources as any };
      }

      if (filters.tagIds && filters.tagIds.length > 0) {
        where.contactTags = {
          some: { tagId: { in: filters.tagIds } },
        };
      }

      if (filters.productIds && filters.productIds.length > 0) {
        where.contactProducts = {
          some: { productId: { in: filters.productIds } },
        };
      }
    }

    return where;
  }

  /**
   * Resolves teamIds to ownerIds by looking up team members.
   * Mutates the filters object in place.
   */
  private async resolveTeamIds(filters: AudienceFilters): Promise<void> {
    if (!filters.teamIds?.length) return;

    const members = await this.prisma.teamMember.findMany({
      where: { teamId: { in: filters.teamIds } },
      select: { userId: true },
    });
    const teamUserIds = [...new Set(members.map((m) => m.userId))];

    if (filters.ownerIds?.length) {
      // Intersection: only owners that are also in the team
      filters.ownerIds = filters.ownerIds.filter((id) => teamUserIds.includes(id));
    } else {
      filters.ownerIds = teamUserIds;
    }
  }
}
