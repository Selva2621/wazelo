import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { ListPlatformAuditLogsUseCase } from '../../application/use-cases/list-platform-audit-logs.use-case';
import { ListPlatformAuditLogsQueryDto } from '../../application/dto/platform-audit.dto';
import { sendCsv } from '../csv-response';

/** Read-only view of the platform audit log. Entries are never edited or deleted. */
@Controller('super-admin/audit-logs')
@SuperAdminOnly()
export class SuperAdminAuditController {
  constructor(private readonly listAuditLogsUseCase: ListPlatformAuditLogsUseCase) {}

  @Get()
  async list(@Query() query: ListPlatformAuditLogsQueryDto) {
    return this.listAuditLogsUseCase.execute(query);
  }

  /** Same filters and sort as the list, as a CSV download (max 10,000 rows); page/limit are ignored. */
  @Get('export.csv')
  async export(@Query() query: ListPlatformAuditLogsQueryDto, @Res() res: Response) {
    sendCsv(res, await this.listAuditLogsUseCase.exportCsv(query));
  }
}
