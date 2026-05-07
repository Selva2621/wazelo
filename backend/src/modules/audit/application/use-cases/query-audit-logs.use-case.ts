import { Injectable } from '@nestjs/common';
import { AuditRepository } from '../../infrastructure/repositories/audit.repository';
import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';

@Injectable()
export class QueryAuditLogsUseCase {
  constructor(private readonly auditRepository: AuditRepository) {}

  async execute(orgId: string, query: QueryAuditLogsDto) {
    const { logs, total } = await this.auditRepository.query(
      orgId,
      {
        action: query.action,
        userId: query.userId,
        targetType: query.targetType,
        targetId: query.targetId,
        traceId: query.traceId,
        source: query.source,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      },
      {
        take: query.take ?? 50,
        skip: query.skip ?? 0,
      },
    );

    return {
      logs,
      total,
      take: query.take ?? 50,
      skip: query.skip ?? 0,
    };
  }
}
