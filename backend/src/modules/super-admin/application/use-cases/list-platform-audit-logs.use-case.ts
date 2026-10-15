import { Injectable } from '@nestjs/common';
import { searchTerm } from '../../domain/services/search-term';
import { listOrderBy } from '../../domain/services/list-sort';
import { buildCsvExport, CSV_EXPORT_MAX_ROWS, CsvColumn, CsvExport, maskSecretKeys } from '../../domain/services/csv';
import { PlatformAuditQuery, PlatformAuditRepository } from '../../infrastructure/repositories/platform-audit.repository';
import { ListPlatformAuditLogsQueryDto } from '../dto/platform-audit.dto';

/** A bare date (YYYY-MM-DD) as `to` means "through the end of that day". */
function endOfDayIfDateOnly(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value);
}

/** The filters and sort shared by the list and the CSV export. */
function auditFilter(query: ListPlatformAuditLogsQueryDto): Omit<PlatformAuditQuery, 'skip' | 'take'> {
  return {
    action: query.action,
    actorId: query.actorId,
    orgId: query.orgId,
    targetType: query.targetType,
    targetId: query.targetId,
    search: searchTerm(query.search),
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? endOfDayIfDateOnly(query.to) : undefined,
    orderBy: listOrderBy('auditLogs', query.sort, query.order),
  };
}

type AuditRow = Awaited<ReturnType<PlatformAuditRepository['findMany']>>['items'][number];

/** Metadata goes in one JSON column, with any secret-looking key masked. */
const AUDIT_COLUMNS: CsvColumn<AuditRow>[] = [
  { header: 'Entry ID', value: (e) => e.id },
  { header: 'Time', value: (e) => e.createdAt },
  { header: 'Action', value: (e) => e.action },
  { header: 'Actor type', value: (e) => e.actorType },
  { header: 'Actor email', value: (e) => e.actorEmail },
  { header: 'Actor ID', value: (e) => e.actorId },
  { header: 'Target type', value: (e) => e.targetType },
  { header: 'Target ID', value: (e) => e.targetId },
  { header: 'Organization ID', value: (e) => e.orgId },
  { header: 'IP address', value: (e) => e.ipAddress },
  { header: 'User agent', value: (e) => e.userAgent },
  { header: 'Details (JSON)', value: (e) => (e.metadata == null ? '' : JSON.stringify(maskSecretKeys(e.metadata))) },
];

@Injectable()
export class ListPlatformAuditLogsUseCase {
  constructor(private readonly auditRepo: PlatformAuditRepository) {}

  async execute(query: ListPlatformAuditLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const { items, total } = await this.auditRepo.findMany({
      skip: (page - 1) * limit,
      take: limit,
      ...auditFilter(query),
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Same filters and sort as the list, no paging; capped at CSV_EXPORT_MAX_ROWS. */
  async exportCsv(query: ListPlatformAuditLogsQueryDto): Promise<CsvExport> {
    const { items } = await this.auditRepo.findMany({ skip: 0, take: CSV_EXPORT_MAX_ROWS + 1, ...auditFilter(query) });
    return buildCsvExport('audit-log', items, AUDIT_COLUMNS);
  }
}
