import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class GdprRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ─── Consent Records ─── */

  async recordConsent(data: {
    orgId: string;
    contactId: string;
    consentType: string;
    granted: boolean;
    source: string;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.consentRecord.create({ data: data as any });
  }

  async revokeConsent(contactId: string, orgId: string, consentType: string) {
    return this.prisma.consentRecord.updateMany({
      where: { contactId, orgId, consentType, granted: true, revokedAt: null },
      data: { granted: false, revokedAt: new Date() },
    });
  }

  async getConsents(contactId: string, orgId: string) {
    return this.prisma.consentRecord.findMany({
      where: { contactId, orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActiveConsents(contactId: string, orgId: string) {
    return this.prisma.consentRecord.findMany({
      where: { contactId, orgId, granted: true, revokedAt: null },
    });
  }

  /* ─── Data Requests ─── */

  async createDataRequest(data: {
    orgId: string;
    contactId: string;
    requestType: string;
    requestedById: string;
  }) {
    return this.prisma.dataRequest.create({ data });
  }

  async updateDataRequest(id: string, data: {
    status: string;
    completedAt?: Date;
    resultUrl?: string;
  }) {
    return this.prisma.dataRequest.update({ where: { id }, data });
  }

  async findDataRequests(orgId: string, take = 50, skip = 0) {
    const [data, total] = await Promise.all([
      this.prisma.dataRequest.findMany({
        where: { orgId },
        include: {
          contact: { select: { id: true, name: true, phoneNumber: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.dataRequest.count({ where: { orgId } }),
    ]);
    return { data, total };
  }

  /* ─── Data Export (collect all contact data) ─── */

  async exportContactData(contactId: string, orgId: string) {
    const [contact, messages, conversations, notes, tags, consents, statusHistory, ownerHistory] =
      await Promise.all([
        this.prisma.contact.findFirst({
          where: { id: contactId, orgId },
          include: { owner: { select: { firstName: true, lastName: true, email: true } } },
        }),
        this.prisma.message.findMany({
          where: { contactPhone: { not: undefined }, orgId, conversation: { contactId } },
          select: { id: true, direction: true, type: true, body: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
        this.prisma.conversation.findMany({
          where: { orgId, contactId },
          select: { id: true, status: true, createdAt: true, lastMessageAt: true },
        }),
        this.prisma.contactNote.findMany({
          where: { contactId, orgId },
          select: { id: true, content: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.contactTag.findMany({
          where: { contactId, orgId },
          include: { tag: { select: { name: true } } },
        }),
        this.prisma.consentRecord.findMany({
          where: { contactId, orgId },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.contactStatusHistory.findMany({
          where: { contactId, orgId },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.contactOwnerHistory.findMany({
          where: { contactId, orgId },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      contact,
      messages,
      conversations,
      notes,
      tags: tags.map((t) => t.tag.name),
      consents,
      statusHistory,
      ownerHistory,
    };
  }

  /* ─── Data Erasure (hard delete) ─── */

  async eraseContactData(contactId: string, orgId: string) {
    // Order matters: delete child records first
    await this.prisma.$transaction([
      this.prisma.consentRecord.deleteMany({ where: { contactId, orgId } }),
      this.prisma.contactNote.deleteMany({ where: { contactId, orgId } }),
      this.prisma.contactTag.deleteMany({ where: { contactId, orgId } }),
      this.prisma.contactStatusHistory.deleteMany({ where: { contactId, orgId } }),
      this.prisma.contactOwnerHistory.deleteMany({ where: { contactId, orgId } }),
      this.prisma.contactScoreHistory.deleteMany({ where: { contactId, orgId } }),
      // Anonymize messages (keep for compliance but strip PII)
      this.prisma.message.updateMany({
        where: { orgId, conversation: { contactId } },
        data: { contactName: '[ERASED]', contactPhone: '[ERASED]' },
      }),
      // Hard delete contact
      this.prisma.contact.deleteMany({ where: { id: contactId, orgId } }),
    ]);

    return { erased: true, contactId };
  }
}
