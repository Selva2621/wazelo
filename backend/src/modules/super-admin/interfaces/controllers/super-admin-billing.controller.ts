import { Controller, Get, Query } from '@nestjs/common';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import {
  GetPlatformGrowthUseCase,
  ListPlatformInvoicesUseCase,
  ListPlatformPaymentsUseCase,
} from '../../application/use-cases/platform-billing.use-cases';

function toInt(value: string | undefined, fallback: number): number {
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** Read-only billing records and growth analytics across all orgs. */
@Controller('super-admin')
@SuperAdminOnly()
export class SuperAdminBillingController {
  constructor(
    private readonly listPaymentsUseCase: ListPlatformPaymentsUseCase,
    private readonly listInvoicesUseCase: ListPlatformInvoicesUseCase,
    private readonly getGrowthUseCase: GetPlatformGrowthUseCase,
  ) {}

  @Get('payments')
  async listPayments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('orgId') orgId?: string,
  ) {
    return this.listPaymentsUseCase.execute({ page: toInt(page, 1), limit: toInt(limit, 25), status, orgId });
  }

  @Get('invoices')
  async listInvoices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('orgId') orgId?: string,
  ) {
    return this.listInvoicesUseCase.execute({ page: toInt(page, 1), limit: toInt(limit, 25), status, orgId });
  }

  @Get('analytics/growth')
  async getGrowth(@Query('months') months?: string) {
    return this.getGrowthUseCase.execute(toInt(months, 12));
  }
}
