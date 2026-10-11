import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { sendCsv } from '../csv-response';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { RecordRefundDto } from '../../application/dto/refund.dto';
import { requestMeta } from '../request-meta';
import {
  GetPlatformGrowthUseCase,
  GetPlatformUsageUseCase,
  ListPlatformInvoicesUseCase,
  ListPlatformPaymentsUseCase,
  RecordPaymentRefundUseCase,
} from '../../application/use-cases/platform-billing.use-cases';

function toInt(value: string | undefined, fallback: number): number {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** Billing records (read-only, plus recorded refunds) and growth/usage analytics across all orgs. */
@Controller('super-admin')
@SuperAdminOnly()
export class SuperAdminBillingController {
  constructor(
    private readonly listPaymentsUseCase: ListPlatformPaymentsUseCase,
    private readonly listInvoicesUseCase: ListPlatformInvoicesUseCase,
    private readonly getGrowthUseCase: GetPlatformGrowthUseCase,
    private readonly getUsageUseCase: GetPlatformUsageUseCase,
    private readonly recordRefundUseCase: RecordPaymentRefundUseCase,
  ) {}

  /**
   * Record a refund ALREADY made in the gateway dashboard. Record-only: no money moves here.
   * Partial refunds allowed; the total can never exceed the amount paid.
   */
  @Post('payments/:id/refunds')
  async recordRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordRefundDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.recordRefundUseCase.execute(id, dto, { id: user.sub, email: user.email }, requestMeta(req));
  }

  @Get('payments')
  async listPayments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('orgId') orgId?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    return this.listPaymentsUseCase.execute({
      page: toInt(page, 1),
      limit: toInt(limit, 25),
      status,
      orgId,
      search,
      sort,
      order,
    });
  }

  /** Same filters and sort as the list, as a CSV download (max 10,000 rows). */
  @Get('payments/export.csv')
  async exportPayments(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('orgId') orgId?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    sendCsv(res, await this.listPaymentsUseCase.exportCsv({ status, orgId, search, sort, order }));
  }

  @Get('invoices')
  async listInvoices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('orgId') orgId?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    return this.listInvoicesUseCase.execute({
      page: toInt(page, 1),
      limit: toInt(limit, 25),
      status,
      orgId,
      search,
      sort,
      order,
    });
  }

  /** Same filters and sort as the list, as a CSV download (max 10,000 rows). */
  @Get('invoices/export.csv')
  async exportInvoices(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('orgId') orgId?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    sendCsv(res, await this.listInvoicesUseCase.exportCsv({ status, orgId, search, sort, order }));
  }

  /** Daily message volume (UTC) and the top 10 orgs by outbound messages; `days` 1-90, default 30. */
  @Get('analytics/usage')
  async getUsage(@Query('days') days?: string) {
    return this.getUsageUseCase.execute(toInt(days, 30));
  }

  @Get('analytics/growth')
  async getGrowth(@Query('months') months?: string) {
    return this.getGrowthUseCase.execute(toInt(months, 12));
  }
}
