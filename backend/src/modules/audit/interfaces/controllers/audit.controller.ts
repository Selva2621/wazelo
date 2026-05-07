import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { QueryAuditLogsUseCase } from '../../application/use-cases/query-audit-logs.use-case';
import { QueryAuditLogsDto, AuditLogStatsDto } from '../../application/dto/query-audit-logs.dto';
import { AuditService } from '../../domain/services/audit.service';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly queryAuditLogsUseCase: QueryAuditLogsUseCase,
    private readonly auditService: AuditService,
  ) {}

  /**
   * GET /audit/logs
   * Query audit logs with filters. Scoped to caller's org.
   * AC3: Query performance ≤2s (enforced by DB indexes).
   */
  @Get('logs')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.AUDIT_READ)
  async queryLogs(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryAuditLogsDto,
  ) {
    return this.queryAuditLogsUseCase.execute(user.orgId, query);
  }

  /**
   * GET /audit/stats
   * Get audit log statistics (action type breakdown) for dashboard.
   */
  @Get('stats')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.AUDIT_READ)
  async getStats(
    @CurrentUser() user: JwtPayload,
    @Query() query: AuditLogStatsDto,
  ) {
    const now = new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(now.getTime() - 24 * 60 * 60 * 1000); // default: last 24h
    const endDate = query.endDate ? new Date(query.endDate) : now;

    return this.auditService.getStats(user.orgId, startDate, endDate);
  }
}
