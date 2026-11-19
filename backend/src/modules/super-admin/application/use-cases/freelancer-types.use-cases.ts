import { Injectable } from '@nestjs/common';
import { PlatformAuditAction } from '@prisma/client';
import { FreelancerProfileResolverService } from '@/modules/org/application/services/freelancer-profile-resolver.service';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';
import { CreateFreelancerTypeDto, UpdateFreelancerTypeDto } from '../dto/freelancer-types.dto';

/**
 * Super admin: the freelancer lines of work offered in setup. Built-in ones are
 * read-only (they live in code); super admin ones can be added, edited, hidden or deleted.
 */
@Injectable()
export class FreelancerTypesUseCases {
  constructor(
    private readonly catalog: FreelancerProfileResolverService,
    private readonly audit: PlatformAuditService,
  ) {}

  list() {
    return this.catalog.adminList();
  }

  async create(dto: CreateFreelancerTypeDto, actor: AuditActor, meta: RequestMeta) {
    const entry = await this.catalog.adminCreate({ ...dto, pitch: { ...dto.pitch } });
    await this.record(actor, meta, entry.id, { change: 'created', key: entry.key, label: entry.label });
    return entry;
  }

  async update(id: string, dto: UpdateFreelancerTypeDto, actor: AuditActor, meta: RequestMeta) {
    const entry = await this.catalog.adminUpdate(id, { ...dto, pitch: dto.pitch ? { ...dto.pitch } : undefined });
    const change = dto.isActive === false ? 'hidden' : dto.isActive === true ? 'shown' : 'edited';
    await this.record(actor, meta, id, { change, key: entry.key, label: entry.label });
    return entry;
  }

  async remove(id: string, actor: AuditActor, meta: RequestMeta) {
    await this.catalog.adminDelete(id);
    await this.record(actor, meta, id, { change: 'deleted' });
  }

  private record(actor: AuditActor, meta: RequestMeta, id: string, metadata: Record<string, unknown>) {
    return this.audit.record({
      action: PlatformAuditAction.PLATFORM_SETTING_CHANGED,
      actor,
      targetType: 'FreelancerType',
      targetId: id,
      metadata: { label: 'Freelancer types', ...metadata },
      meta,
    });
  }
}
