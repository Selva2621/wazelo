import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementSeverity, AnnouncementTarget, PlatformAuditAction } from '@prisma/client';
import { SubscriptionRepository } from '@/modules/billing/infrastructure/repositories/subscription.repository';
import { AnnouncementRepository } from '../../infrastructure/repositories/announcement.repository';
import { announcementApplies } from '../../domain/services/announcements';
import { CreateAnnouncementDto } from '../dto/announcement.dto';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';

// ─── Super admin ─────────────────────────────────────────────────────────────

@Injectable()
export class CreateAnnouncementUseCase {
  constructor(
    private readonly repo: AnnouncementRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(dto: CreateAnnouncementDto, actor: AuditActor, meta: RequestMeta) {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('End time must be after the start time');

    if (dto.targetType === AnnouncementTarget.ORG && !(await this.repo.orgExists(dto.targetOrgId!))) {
      throw new BadRequestException('Organization not found');
    }
    if (dto.targetType === AnnouncementTarget.PLAN && !(await this.repo.planSlugExists(dto.targetPlanSlug!))) {
      throw new BadRequestException('Plan not found');
    }

    const announcement = await this.repo.create({
      title: dto.title,
      body: dto.body,
      severity: dto.severity ?? AnnouncementSeverity.INFO,
      targetType: dto.targetType,
      targetPlanSlug: dto.targetType === AnnouncementTarget.PLAN ? dto.targetPlanSlug! : null,
      targetOrgId: dto.targetType === AnnouncementTarget.ORG ? dto.targetOrgId! : null,
      startsAt,
      endsAt,
      dismissible: dto.dismissible ?? true,
      createdById: actor.id,
    });

    await this.audit.record({
      action: PlatformAuditAction.ANNOUNCEMENT_CREATED,
      actor,
      targetType: 'Announcement',
      targetId: announcement.id,
      orgId: announcement.targetOrgId,
      metadata: {
        title: announcement.title,
        after: {
          severity: announcement.severity,
          target: announcement.targetType,
          plan: announcement.targetPlanSlug,
          startsAt: announcement.startsAt.toISOString(),
          endsAt: announcement.endsAt?.toISOString() ?? null,
        },
      },
      meta,
    });
    return announcement;
  }
}

@Injectable()
export class ListAnnouncementsUseCase {
  constructor(private readonly repo: AnnouncementRepository) {}

  async execute() {
    const items = await this.repo.findAll();
    return { announcements: items.map(({ _count, ...a }) => ({ ...a, dismissals: _count.dismissals })) };
  }
}

@Injectable()
export class ArchiveAnnouncementUseCase {
  constructor(
    private readonly repo: AnnouncementRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(id: string, actor: AuditActor, meta: RequestMeta) {
    const announcement = await this.repo.findById(id);
    if (!announcement) throw new NotFoundException('Announcement not found');
    if (announcement.archivedAt) return announcement;

    const archived = await this.repo.archive(id);
    await this.audit.record({
      action: PlatformAuditAction.ANNOUNCEMENT_ARCHIVED,
      actor,
      targetType: 'Announcement',
      targetId: id,
      orgId: announcement.targetOrgId,
      metadata: { title: announcement.title },
      meta,
    });
    return archived;
  }
}

// ─── Tenant ──────────────────────────────────────────────────────────────────

@Injectable()
export class GetActiveAnnouncementsUseCase {
  constructor(
    private readonly repo: AnnouncementRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
  ) {}

  /** Announcements shown to this user right now — matching their org/plan, not yet dismissed. */
  async execute(orgId: string, userId: string) {
    const now = new Date();
    const candidates = await this.repo.findLiveCandidates(now);
    if (!candidates.length) return { announcements: [] };

    const needsPlan = candidates.some((a) => a.targetType === AnnouncementTarget.PLAN);
    const planSlug = needsPlan ? ((await this.subscriptionRepo.findByOrgWithPlan(orgId))?.plan?.slug ?? null) : null;

    const applicable = candidates.filter((a) => announcementApplies(a, { orgId, planSlug, now }));
    const dismissed = await this.repo.dismissedIds(userId, applicable.map((a) => a.id));

    return {
      // Only what the banner needs — no targeting details
      announcements: applicable
        .filter((a) => !dismissed.has(a.id))
        .map(({ id, title, body, severity, dismissible }) => ({ id, title, body, severity, dismissible })),
    };
  }
}

@Injectable()
export class DismissAnnouncementUseCase {
  constructor(
    private readonly repo: AnnouncementRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
  ) {}

  async execute(id: string, orgId: string, userId: string): Promise<void> {
    const announcement = await this.repo.findById(id);
    const planSlug =
      announcement?.targetType === AnnouncementTarget.PLAN
        ? ((await this.subscriptionRepo.findByOrgWithPlan(orgId))?.plan?.slug ?? null)
        : null;

    // 404 for anything this user can't see, so other orgs' announcements can't be probed
    if (!announcement || !announcementApplies(announcement, { orgId, planSlug })) {
      throw new NotFoundException('Announcement not found');
    }
    if (!announcement.dismissible) throw new BadRequestException('This announcement cannot be dismissed');

    await this.repo.dismiss(id, userId);
  }
}
