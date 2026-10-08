import { Injectable } from '@nestjs/common';
import { PlatformAuditAction } from '@prisma/client';
import { AlertService } from '@/modules/observability/domain/services/alert.service';
import { CreateAlertRuleDto } from '@/modules/observability/application/dto/observability.dto';
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
