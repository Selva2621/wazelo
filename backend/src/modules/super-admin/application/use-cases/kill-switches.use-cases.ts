import { BadRequestException, Injectable } from '@nestjs/common';
import { PlatformAuditAction } from '@prisma/client';
import { KillSwitchRepository } from '@/modules/billing/infrastructure/repositories/kill-switch.repository';
import { KillSwitchService } from '@/modules/billing/domain/services/kill-switch.service';
import {
  FEATURE_LABELS,
  isFeatureKey,
  listKillSwitchStates,
  planKillSwitchChange,
} from '@/modules/billing/domain/services/kill-switch';
import { SuperAdminRepository } from '../../infrastructure/repositories/super-admin.repository';
import { SetKillSwitchDto } from '../dto/kill-switch.dto';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';

/** All five features with their switch state and who turned them off. */
@Injectable()
export class ListKillSwitchesUseCase {
  constructor(
    private readonly repo: KillSwitchRepository,
    private readonly superAdminRepo: SuperAdminRepository,
  ) {}

  async execute() {
    const states = listKillSwitchStates(await this.repo.findAll());
    const ids = new Set(states.map((s) => s.disabledById).filter((id): id is string => !!id));
    const admins = ids.size ? await this.superAdminRepo.findAllAccounts() : [];
    return states.map((s) => {
      const by = s.disabledById ? admins.find((a) => a.id === s.disabledById) : undefined;
      return { ...s, disabledBy: by ? { id: by.id, name: by.name, email: by.email } : null };
    });
  }
}

@Injectable()
export class SetKillSwitchUseCase {
  constructor(
    private readonly repo: KillSwitchRepository,
    private readonly killSwitches: KillSwitchService,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(feature: string, dto: SetKillSwitchDto, actor: AuditActor, meta: RequestMeta) {
    if (!isFeatureKey(feature)) throw new BadRequestException(`Unknown feature "${feature}"`);

    const current = await this.repo.findOne(feature);
    const change = planKillSwitchChange(current?.disabled ?? false, dto.disabled, dto.reason);
    if (change.kind === 'invalid') throw new BadRequestException(change.error);

    if (change.kind !== 'noop') {
      if (change.kind === 'disable') {
        await this.repo.disable(feature, change.reason, actor.id);
      } else {
        await this.repo.enable(feature);
      }
      // Takes effect immediately on this (single) instance
      this.killSwitches.invalidate();

      await this.audit.record({
        action: change.kind === 'disable' ? PlatformAuditAction.KILL_SWITCH_ON : PlatformAuditAction.KILL_SWITCH_OFF,
        actor,
        targetType: 'Feature',
        targetId: feature,
        metadata: {
          feature,
          label: FEATURE_LABELS[feature],
          ...(change.kind === 'disable'
            ? { reason: change.reason }
            : {
                previousReason: current?.reason ?? null,
                disabledSince: current?.disabledAt?.toISOString() ?? null,
              }),
        },
        meta,
      });
    }

    const row = await this.repo.findOne(feature);
    return listKillSwitchStates(row ? [row] : []).find((s) => s.feature === feature)!;
  }
}
