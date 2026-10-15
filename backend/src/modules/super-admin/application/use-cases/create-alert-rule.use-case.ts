import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PlatformAuditAction } from '@prisma/client';
import { AlertService } from '@/modules/observability/domain/services/alert.service';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from '@/modules/observability/application/dto/observability.dto';
import { diffChanges } from '../../domain/services/audit-diff';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';

/** Alert rules are platform-wide, so only a super admin may create them (audited). */
@Injectable()
export class CreateAlertRuleUseCase {
  constructor(
    private readonly alertService: AlertService,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(dto: CreateAlertRuleDto, actor: AuditActor, meta: RequestMeta) {
    const rule = await this.alertService.createAlertRule(dto);
    await this.audit.record({
      action: PlatformAuditAction.ALERT_RULE_CREATED,
      actor,
      targetType: 'AlertRule',
      targetId: (rule as { id?: string })?.id,
      metadata: { after: { ...dto } },
      meta,
    });
    return rule;
  }
}

/** Edit or pause/resume a rule; the audit entry keeps only the fields that changed. */
@Injectable()
export class UpdateAlertRuleUseCase {
  constructor(
    private readonly alertService: AlertService,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(id: string, dto: UpdateAlertRuleDto, actor: AuditActor, meta: RequestMeta) {
    const before = await this.alertService.getAlertRule(id);
    if (!before) throw new NotFoundException('Alert rule not found');
    const rule = await this.alertService.updateAlertRule(id, dto);
    const diff = diffChanges(before as unknown as Record<string, unknown>, { ...dto });
    await this.audit.record({
      action: PlatformAuditAction.ALERT_RULE_UPDATED,
      actor,
      targetType: 'AlertRule',
      targetId: id,
      metadata: { name: before.name, ...diff },
      meta,
    });
    return rule;
  }
}

/** Deletes a rule that never fired; one with history must be disabled instead. */
@Injectable()
export class DeleteAlertRuleUseCase {
  constructor(
    private readonly alertService: AlertService,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(id: string, actor: AuditActor, meta: RequestMeta) {
    const rule = await this.alertService.getAlertRule(id);
    if (!rule) throw new NotFoundException('Alert rule not found');
    const result = await this.alertService.deleteAlertRuleIfUnused(id);
    if (result === 'has_history') {
      throw new BadRequestException('This rule has alert history, so it can\'t be deleted. Disable it instead.');
    }
    await this.audit.record({
      action: PlatformAuditAction.ALERT_RULE_DELETED,
      actor,
      targetType: 'AlertRule',
      targetId: id,
      metadata: { name: rule.name, before: { metric: rule.metric, condition: rule.condition, threshold: rule.threshold } },
      meta,
    });
    return { deleted: true };
  }
}
