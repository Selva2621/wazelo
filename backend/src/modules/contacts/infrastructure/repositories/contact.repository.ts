import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  Contact,
  ContactSource,
  LeadStatus,
  ContactStatusHistory,
  ContactOwnerHistory,
  ContactNote,
  ContactTag,
  Tag,
  Prisma,
} from '@prisma/client';

// ─────────────────────────────────────────────
// Input interfaces
// ─────────────────────────────────────────────

export interface CreateContactInput {
  orgId: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  source: ContactSource;
  ownerId: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateContactInput {
  name?: string;
  email?: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ListContactsOptions {
  take?: number;
  skip?: number;
  leadStatus?: LeadStatus;
  ownerId?: string;
  ownerIds?: string[];
  source?: ContactSource;
  tagIds?: string[];
  productIds?: string[];
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export type ContactWithRelations = Contact & {
  owner: { id: string; firstName: string; lastName: string; email: string };
  contactTags: (ContactTag & { tag: Tag })[];
  _count: { notes: number };
};

// ─────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────

@Injectable()
export class ContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ───── Contact CRUD ─────

  /**
   * Creates a contact with an initial status history entry and owner history entry,
   * all within a transaction for atomicity.
   */
  async createWithHistory(
    data: CreateContactInput,
    createdById: string,
  ): Promise<Contact> {
    return this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.create({
        data: {
          orgId: data.orgId,
          phoneNumber: data.phoneNumber,
          name: data.name,
          email: data.email,
          source: data.source,
          ownerId: data.ownerId,
          sessionId: data.sessionId,
          leadStatus: LeadStatus.NEW,
          metadata: data.metadata as Prisma.InputJsonValue ?? undefined,
        },
      });

      // Initial status history entry
      await tx.contactStatusHistory.create({
        data: {
          contactId: contact.id,
          orgId: data.orgId,
          previousStatus: null,
          newStatus: LeadStatus.NEW,
          changedById: createdById,
          reason: 'Contact created',
        },
      });

      // Initial owner history entry
      await tx.contactOwnerHistory.create({
        data: {
          contactId: contact.id,
          orgId: data.orgId,
          previousOwnerId: null,
          newOwnerId: data.ownerId,
          assignedById: createdById,
          reason: 'Initial assignment',
        },
      });

      return contact;
    });
  }

  /**
   * Upserts a contact by org_id + phone_number using a raw query with
   * ON CONFLICT for race-condition safety. Returns the contact whether
   * it was created or already existed.
   */
  async upsertByPhone(
    data: CreateContactInput,
    createdById: string,
  ): Promise<{ contact: Contact; created: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      // Attempt insert with ON CONFLICT DO NOTHING on the unique constraint.
      // Prisma doesn't support DO NOTHING natively, so we use raw SQL.
      const inserted = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO contacts (id, org_id, phone_number, name, source, lead_status, owner_id, session_id, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          ${data.orgId}::uuid,
          ${data.phoneNumber},
          ${data.name ?? null},
          ${data.source}::"ContactSource",
          'NEW'::"LeadStatus",
          ${data.ownerId}::uuid,
          ${data.sessionId ?? null}::uuid,
          now(),
          now()
        )
        ON CONFLICT (org_id, phone_number) WHERE deleted_at IS NULL
        DO NOTHING
        RETURNING id
      `;

      if (inserted.length > 0) {
        // New contact was created — add history entries
        const contactId = inserted[0].id;

        await tx.contactStatusHistory.create({
          data: {
            contactId,
            orgId: data.orgId,
            previousStatus: null,
            newStatus: LeadStatus.NEW,
            changedById: createdById,
            reason: 'Auto-created from incoming message',
          },
        });

        await tx.contactOwnerHistory.create({
          data: {
            contactId,
            orgId: data.orgId,
            previousOwnerId: null,
            newOwnerId: data.ownerId,
            assignedById: createdById,
            reason: 'Auto-assigned to session owner',
          },
        });

        const contact = await tx.contact.findUniqueOrThrow({
          where: { id: contactId },
        });

        return { contact, created: true };
      }

      // Contact already existed — fetch and return it
      const existing = await tx.contact.findFirst({
        where: {
          orgId: data.orgId,
          phoneNumber: data.phoneNumber,
          deletedAt: null,
        },
      });

      return { contact: existing!, created: false };
    });
  }

  async findById(id: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdAndOrg(id: string, orgId: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async findByIdWithRelations(
    id: string,
    orgId: string,
  ): Promise<ContactWithRelations | null> {
    return this.prisma.contact.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        contactTags: {
          include: { tag: true },
          where: { tag: { deletedAt: null } },
        },
        _count: {
          select: { notes: { where: { deletedAt: null } } },
        },
      },
    }) as Promise<ContactWithRelations | null>;
  }

  async findByPhoneAndOrg(
    phoneNumber: string,
    orgId: string,
  ): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: { phoneNumber, orgId, deletedAt: null },
    });
  }

  async update(id: string, data: UpdateContactInput): Promise<Contact> {
    return this.prisma.contact.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.metadata !== undefined && {
          metadata: data.metadata as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async softDelete(id: string): Promise<Contact> {
    return this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findByOrgPaginated(
    orgId: string,
    options: ListContactsOptions = {},
  ): Promise<{ contacts: ContactWithRelations[]; total: number }> {
    const where: Prisma.ContactWhereInput = {
      orgId,
      deletedAt: null,
      mergedIntoId: null, // Exclude merged contacts from listings
      ...(options.leadStatus && { leadStatus: options.leadStatus }),
      ...(options.ownerId && { ownerId: options.ownerId }),
      ...(options.ownerIds && { ownerId: { in: options.ownerIds } }),
      ...(options.source && { source: options.source }),
      ...(options.tagIds &&
        options.tagIds.length > 0 && {
          contactTags: {
            some: { tagId: { in: options.tagIds } },
          },
        }),
      ...(options.productIds &&
        options.productIds.length > 0 && {
          contactProducts: {
            some: { productId: { in: options.productIds } },
          },
        }),
      ...(options.search && {
        OR: [
          {
            name: { contains: options.search, mode: 'insensitive' as const },
          },
          {
            phoneNumber: { contains: options.search },
          },
          {
            email: {
              contains: options.search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
    };

    const orderBy: Prisma.ContactOrderByWithRelationInput = {
      [options.sortBy ?? 'createdAt']: options.sortOrder ?? 'desc',
    };

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        take: options.take ?? 50,
        skip: options.skip ?? 0,
        orderBy,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          contactTags: {
            include: { tag: true },
            where: { tag: { deletedAt: null } },
          },
          contactProducts: {
            include: { product: { select: { id: true, name: true, status: true } } },
            where: { product: { deletedAt: null } },
          },
          _count: {
            select: { notes: { where: { deletedAt: null } } },
          },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { contacts: contacts as ContactWithRelations[], total };
  }

  // ───── Lead Status ─────

  async updateLeadStatus(
    contactId: string,
    orgId: string,
    newStatus: LeadStatus,
    changedById: string,
    reason?: string,
  ): Promise<Contact> {
    return this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findFirstOrThrow({
        where: { id: contactId, orgId, deletedAt: null },
      });

      const previousStatus = contact.leadStatus;

      const updated = await tx.contact.update({
        where: { id: contactId },
        data: { leadStatus: newStatus },
      });

      await tx.contactStatusHistory.create({
        data: {
          contactId,
          orgId,
          previousStatus,
          newStatus,
          changedById,
          reason,
        },
      });

      return updated;
    });
  }

  async getStatusHistory(
    contactId: string,
    orgId: string,
  ): Promise<ContactStatusHistory[]> {
    return this.prisma.contactStatusHistory.findMany({
      where: { contactId, orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ───── Ownership ─────

  async reassignOwner(
    contactId: string,
    orgId: string,
    newOwnerId: string,
    assignedById: string,
    reason?: string,
  ): Promise<Contact> {
    return this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findFirstOrThrow({
        where: { id: contactId, orgId, deletedAt: null },
      });

      const previousOwnerId = contact.ownerId;

      const updated = await tx.contact.update({
        where: { id: contactId },
        data: { ownerId: newOwnerId },
      });

      await tx.contactOwnerHistory.create({
        data: {
          contactId,
          orgId,
          previousOwnerId,
          newOwnerId,
          assignedById,
          reason,
        },
      });

      return updated;
    });
  }

  async getOwnerHistory(
    contactId: string,
    orgId: string,
  ): Promise<ContactOwnerHistory[]> {
    return this.prisma.contactOwnerHistory.findMany({
      where: { contactId, orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ───── Contact Merge ─────

  /**
   * Merges secondaryId into primaryId:
   * - Moves all tags from secondary to primary (skipping duplicates)
   * - Moves all notes from secondary to primary
   * - Updates secondary contact's name/email to primary if primary is missing them
   * - Marks secondary as soft-deleted with mergedIntoId set
   */
  async mergeContacts(
    primaryId: string,
    secondaryId: string,
    orgId: string,
    mergedById: string,
  ): Promise<Contact> {
    return this.prisma.$transaction(async (tx) => {
      const [primary, secondary] = await Promise.all([
        tx.contact.findFirstOrThrow({
          where: { id: primaryId, orgId, deletedAt: null },
        }),
        tx.contact.findFirstOrThrow({
          where: { id: secondaryId, orgId, deletedAt: null },
        }),
      ]);

      // Move notes from secondary to primary
      await tx.contactNote.updateMany({
        where: { contactId: secondaryId },
        data: { contactId: primaryId },
      });

      // Get existing tags on primary to avoid duplicates
      const primaryTags = await tx.contactTag.findMany({
        where: { contactId: primaryId },
        select: { tagId: true },
      });
      const primaryTagIds = new Set(primaryTags.map((t) => t.tagId));

      // Move non-duplicate tags from secondary to primary
      const secondaryTags = await tx.contactTag.findMany({
        where: { contactId: secondaryId },
      });

      for (const st of secondaryTags) {
        if (primaryTagIds.has(st.tagId)) {
          // Duplicate tag — delete secondary's entry
          await tx.contactTag.delete({ where: { id: st.id } });
        } else {
          // Move tag to primary
          await tx.contactTag.update({
            where: { id: st.id },
            data: { contactId: primaryId },
          });
        }
      }

      // Fill in missing fields on primary from secondary
      const updateData: Prisma.ContactUpdateInput = {};
      if (!primary.name && secondary.name) updateData.name = secondary.name;
      if (!primary.email && secondary.email) updateData.email = secondary.email;
      if (!primary.avatarUrl && secondary.avatarUrl)
        updateData.avatarUrl = secondary.avatarUrl;

      if (Object.keys(updateData).length > 0) {
        await tx.contact.update({
          where: { id: primaryId },
          data: updateData,
        });
      }

      // Soft-delete secondary and mark as merged
      await tx.contact.update({
        where: { id: secondaryId },
        data: {
          deletedAt: new Date(),
          mergedIntoId: primaryId,
        },
      });

      // Return the updated primary
      return tx.contact.findUniqueOrThrow({ where: { id: primaryId } });
    });
  }

  // ───── Notes ─────

  async createNote(
    contactId: string,
    orgId: string,
    authorId: string,
    content: string,
  ): Promise<ContactNote> {
    return this.prisma.contactNote.create({
      data: { contactId, orgId, authorId, content },
    });
  }

  async getNotes(
    contactId: string,
    orgId: string,
    options?: { take?: number; skip?: number },
  ): Promise<{ notes: ContactNote[]; total: number }> {
    const where = { contactId, orgId, deletedAt: null };

    const [notes, total] = await Promise.all([
      this.prisma.contactNote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.take ?? 50,
        skip: options?.skip ?? 0,
      }),
      this.prisma.contactNote.count({ where }),
    ]);

    return { notes, total };
  }

  async softDeleteNote(noteId: string, orgId: string): Promise<ContactNote> {
    const note = await this.prisma.contactNote.findFirstOrThrow({
      where: { id: noteId, orgId, deletedAt: null },
    });
    return this.prisma.contactNote.update({
      where: { id: note.id },
      data: { deletedAt: new Date() },
    });
  }

  // ───── Tags ─────

  async findOrCreateTag(
    orgId: string,
    name: string,
    color?: string,
  ): Promise<Tag> {
    const normalizedName = name.trim().toLowerCase();

    const existing = await this.prisma.tag.findFirst({
      where: { orgId, name: normalizedName, deletedAt: null },
    });

    if (existing) return existing;

    return this.prisma.tag.create({
      data: { orgId, name: normalizedName, color },
    });
  }

  async addTagToContact(
    contactId: string,
    tagId: string,
    orgId: string,
    addedById: string,
  ): Promise<ContactTag> {
    // Upsert to handle race conditions on duplicate tag assignment
    return this.prisma.contactTag.upsert({
      where: {
        unique_contact_tag: { contactId, tagId },
      },
      create: { contactId, tagId, orgId, addedById },
      update: {}, // No-op if already exists
    });
  }

  async removeTagFromContact(
    contactId: string,
    tagId: string,
  ): Promise<void> {
    await this.prisma.contactTag.deleteMany({
      where: { contactId, tagId },
    });
  }

  async getContactTags(
    contactId: string,
  ): Promise<(ContactTag & { tag: Tag })[]> {
    return this.prisma.contactTag.findMany({
      where: { contactId, tag: { deletedAt: null } },
      include: { tag: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listOrgTags(orgId: string): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async softDeleteTag(tagId: string, orgId: string): Promise<Tag> {
    const tag = await this.prisma.tag.findFirstOrThrow({
      where: { id: tagId, orgId, deletedAt: null },
    });
    return this.prisma.tag.update({
      where: { id: tag.id },
      data: { deletedAt: new Date() },
    });
  }

  // ───── Opt-Out ─────

  async updateOptOut(
    contactId: string,
    orgId: string,
    optedOut: boolean,
  ): Promise<Contact> {
    await this.prisma.contact.findFirstOrThrow({
      where: { id: contactId, orgId, deletedAt: null },
    });

    return this.prisma.contact.update({
      where: { id: contactId },
      data: {
        optedOut,
        optedOutAt: optedOut ? new Date() : null,
      },
    });
  }

  // ───── Counts ─────

  async countByOrgAndStatus(
    orgId: string,
    status: LeadStatus,
  ): Promise<number> {
    return this.prisma.contact.count({
      where: { orgId, leadStatus: status, deletedAt: null, mergedIntoId: null },
    });
  }

  async countByOrg(orgId: string): Promise<number> {
    return this.prisma.contact.count({
      where: { orgId, deletedAt: null, mergedIntoId: null },
    });
  }
}
