import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '@prisma/client';
import { WidgetRepository } from '../../infrastructure/repositories/widget.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { UpdateWidgetConfigDto } from '../dto/update-widget-config.dto';
import { EVENT_NAMES } from '@/common/constants';

@Injectable()
export class UpdateWidgetConfigUseCase {
  private readonly logger = new Logger(UpdateWidgetConfigUseCase.name);

  constructor(
    private readonly widgetRepository: WidgetRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: UpdateWidgetConfigDto,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    const config = await this.widgetRepository.upsertConfig(orgId, dto);

    this.logger.log(`Widget config updated for org: ${orgId}`);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.WIDGET_CONFIG_UPDATED,
      targetType: 'WidgetConfig',
      targetId: config.id,
      metadata: {
        enabled: config.enabled,
        position: config.position,
        preChatFormEnabled: config.preChatFormEnabled,
      },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.WIDGET_CONFIG_UPDATED, {
      orgId,
      configId: config.id,
      enabled: config.enabled,
    });

    return config;
  }
}
