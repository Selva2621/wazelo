import { Injectable } from '@nestjs/common';
import { AnnouncementSeverity, AnnouncementTarget } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  targetType: AnnouncementTarget;
  targetPlanSlug: string | null;
  targetOrgId: string | null;
  startsAt: Date;
  endsAt: Date | null;
  dismissible: boolean;
  createdById: string;
}

const TENANT_FIELDS = {
  id: true,
  title: true,
  body: true,
  severity: true,
  dismissible: true,
  startsAt: true,
  endsAt: true,
  targetType: true,
  targetPlanSlug: true,
  targetOrgId: true,
  archivedAt: true,
} as const;

@Injectable()
export class AnnouncementRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateAnnouncementInput) {
    return this.prisma.platformAnnouncement.create({ data: input });
  }

  findById(id: string) {
    return this.prisma.platformAnnouncement.findUnique({ where: { id } });
  }

  /** Super admin list, newest first, with how many users dismissed each. */
  findAll() {
    return this.prisma.platformAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { _count: { select: { dismissals: true } } },
    });
  }

  archive(id: string) {
    return this.prisma.platformAnnouncement.update({ where: { id }, data: { archivedAt: new Date() } });
  }

  /** Unarchived announcements that have started and not ended — targeting is applied by the caller. */
  findLiveCandidates(now: Date) {
    return this.prisma.platformAnnouncement.findMany({
      where: {
        archivedAt: null,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: [{ severity: 'desc' }, { startsAt: 'desc' }],
      select: TENANT_FIELDS,
    });
  }

  async dismissedIds(userId: string, announcementIds: string[]): Promise<Set<string>> {
    if (!announcementIds.length) return new Set();
    const rows = await this.prisma.announcementDismissal.findMany({
      where: { userId, announcementId: { in: announcementIds } },
      select: { announcementId: true },
    });
    return new Set(rows.map((r) => r.announcementId));
  }

  async dismiss(announcementId: string, userId: string): Promise<void> {
    await this.prisma.announcementDismissal.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      update: {},
      create: { announcementId, userId },
    });
  }

  orgExists(orgId: string) {
    return this.prisma.organization.count({ where: { id: orgId, deletedAt: null } }).then((n) => n > 0);
  }

  planSlugExists(slug: string) {
    return this.prisma.plan.count({ where: { slug, deletedAt: null } }).then((n) => n > 0);
  }
}
