import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { CampaignAudienceType, Prisma } from '@prisma/client';

export interface AudienceFilters {
  contactIds?: string[];
  leadStatuses?: string[];
  tagIds?: string[];
  ownerIds?: string[];
  sources?: string[];
  productIds?: string[];
  teamIds?: string[];
  scrapeRunId?: string;
  hasPhone?: boolean;
  hasWebsite?: boolean;
  minRating?: number;
  dateAdded?: 'last_7d' | 'last_30d' | 'last_90d';
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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
    const where = await this.buildWhereClause(orgId, audienceType, filters);

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
   * Email campaigns: contacts with a valid email who haven't unsubscribed from
   * email (the WhatsApp opt-out doesn't apply), one per address.
   */
  async resolveEmailAudience(
    orgId: string,
    audienceType: CampaignAudienceType,
    filters?: AudienceFilters,
  ): Promise<{ contacts: (ResolvedContact & { email: string })[]; total: number }> {
    if (filters) await this.resolveTeamIds(filters);
    const where = this.forEmail(await this.buildWhereClause(orgId, audienceType, filters));
    const contacts: (ResolvedContact & { email: string })[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined;
    while (true) {
      const batch = await this.prisma.contact.findMany({
        where,
        select: { id: true, phoneNumber: true, email: true },
        orderBy: { id: 'asc' },
        take: 1000,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
      });
      if (batch.length === 0) break;
      for (const c of batch) {
        const email = c.email?.trim().toLowerCase();
        if (!email || !EMAIL_REGEX.test(email) || seen.has(email)) continue;
        seen.add(email);
        contacts.push({ id: c.id, phoneNumber: c.phoneNumber, email });
      }
      cursor = batch[batch.length - 1].id;
      if (batch.length < 1000) break;
    }
    this.logger.log(`Resolved ${contacts.length} email recipients for org ${orgId} (audience: ${audienceType})`);
    return { contacts, total: contacts.length };
  }

  /** Same audience, for email: has an email, not unsubscribed from email (WhatsApp opt-out doesn't apply) */
  private forEmail(where: Prisma.ContactWhereInput): Prisma.ContactWhereInput {
    const { optedOut: _whatsAppOptOut, ...rest } = where;
    return { ...rest, emailOptedOut: false, email: { not: null } };
  }

  /**
   * Preview audience count without fetching all contacts.
   * Used by the preview-audience endpoint for fast feedback.
   */
  async previewAudienceCount(
    orgId: string,
    audienceType: CampaignAudienceType,
    filters?: AudienceFilters,
    channel: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP',
  ): Promise<number> {
    if (filters) await this.resolveTeamIds(filters);
    const where = await this.buildWhereClause(orgId, audienceType, filters);
    return this.prisma.contact.count({ where: channel === 'EMAIL' ? this.forEmail(where) : where });
  }

  private async buildWhereClause(
    orgId: string,
    audienceType: CampaignAudienceType,
    filters?: AudienceFilters,
  ): Promise<Prisma.ContactWhereInput> {
    const where: Prisma.ContactWhereInput = {
      orgId,
      deletedAt: null,
      mergedIntoId: null,
      optedOut: false,
    };
    const intersectIds = (ids: string[]) => {
      const currentIds =
        where.id && typeof where.id === 'object' && 'in' in where.id
          ? (where.id.in as string[])
          : undefined;
      where.id = { in: currentIds ? currentIds.filter((id) => ids.includes(id)) : ids };
    };

    if (audienceType === CampaignAudienceType.FILTERED && filters) {
      if (filters.contactIds && filters.contactIds.length > 0) {
        intersectIds(filters.contactIds);
      }

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

      if (filters.scrapeRunId) {
        // Target only contacts imported from a specific scrape run
        const imported = await this.prisma.scrapeResult.findMany({
          where: { scrapeRunId: filters.scrapeRunId, contactId: { not: null } },
          select: { contactId: true },
        });
        const contactIds = imported.map((r) => r.contactId as string);
        intersectIds(contactIds);
      }

      // hasPhone filter
      if (filters.hasPhone === true) {
        where.phoneNumber = { not: '' };
      } else if (filters.hasPhone === false) {
        where.phoneNumber = '';
      }

      // hasWebsite filter — website lives on ScrapeResult, not Contact
      if (filters.hasWebsite !== undefined) {
        const websiteResults = await this.prisma.scrapeResult.findMany({
          where: {
            contactId: { not: null },
            website: filters.hasWebsite ? { not: null } : null,
          },
          select: { contactId: true },
        });
        const websiteContactIds = websiteResults.map((r) => r.contactId as string);
        intersectIds(websiteContactIds);
      }

      // dateAdded filter
      if (filters.dateAdded) {
        const days = filters.dateAdded === 'last_7d' ? 7 : filters.dateAdded === 'last_30d' ? 30 : 90;
        where.createdAt = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
      }

      // minRating filter — only works with scrapeRunId (subquery on ScrapeResult)
      if (filters.minRating && filters.scrapeRunId) {
        const ratedResults = await this.prisma.scrapeResult.findMany({
          where: {
            scrapeRunId: filters.scrapeRunId,
            contactId: { not: null },
            rating: { gte: filters.minRating },
          },
          select: { contactId: true },
        });
        const ratedContactIds = ratedResults.map((r) => r.contactId as string);
        intersectIds(ratedContactIds);
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
