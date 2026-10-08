import { Controller, Get, Query } from '@nestjs/common';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { ListPlatformAuditLogsUseCase } from '../../application/use-cases/list-platform-audit-logs.use-case';
import { ListPlatformAuditLogsQueryDto } from '../../application/dto/platform-audit.dto';

/** Read-only view of the platform audit log. Entries are never edited or deleted. */
@Controller('super-admin/audit-logs')
@SuperAdminOnly()
export class SuperAdminAuditController {
  constructor(private readonly listAuditLogsUseCase: ListPlatformAuditLogsUseCase) {}

  @Get()
  async list(@Query() query: ListPlatformAuditLogsQueryDto) {
    return this.listAuditLogsUseCase.execute(query);
  }
}
