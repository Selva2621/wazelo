import { Injectable } from '@nestjs/common';
import { PlatformAuditRepository } from '../../infrastructure/repositories/platform-audit.repository';
import { ListPlatformAuditLogsQueryDto } from '../dto/platform-audit.dto';

/** A bare date (YYYY-MM-DD) as `to` means "through the end of that day". */
function endOfDayIfDateOnly(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value);
}

@Injectable()
export class ListPlatformAuditLogsUseCase {
  constructor(private readonly auditRepo: PlatformAuditRepository) {}

  async execute(query: ListPlatformAuditLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const { items, total } = await this.auditRepo.findMany({
      skip: (page - 1) * limit,
      take: limit,
      action: query.action,
      actorId: query.actorId,
      orgId: query.orgId,
      targetType: query.targetType,
      targetId: query.targetId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? endOfDayIfDateOnly(query.to) : undefined,
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
