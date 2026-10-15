import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { requestMeta } from '../request-meta';
import {
  CreateCouponDto,
  CreateManualInvoiceDto,
  CreditAdjustmentDto,
  MarkInvoicePaidDto,
  VoidInvoiceDto,
} from '../../application/dto/billing-ops.dto';
import { GetOrgCreditsUseCase, GrantCreditUseCase, RevokeCreditUseCase } from '../../application/use-cases/credits.use-cases';
import {
  CreateManualInvoiceUseCase,
  MarkInvoicePaidUseCase,
  VoidInvoiceUseCase,
} from '../../application/use-cases/manual-invoices.use-cases';
import { CreateCouponUseCase, DeactivateCouponUseCase, ListCouponsUseCase } from '../../application/use-cases/coupons.use-cases';

function actor(user: JwtPayload) {
  return { id: user.sub, email: user.email };
}

/** Account credits, manual invoices and coupons. Every write is audited. */
@Controller('super-admin')
@SuperAdminOnly()
export class SuperAdminBillingOpsController {
  constructor(
    private readonly getCreditsUseCase: GetOrgCreditsUseCase,
    private readonly grantCreditUseCase: GrantCreditUseCase,
    private readonly revokeCreditUseCase: RevokeCreditUseCase,
    private readonly createInvoiceUseCase: CreateManualInvoiceUseCase,
    private readonly markPaidUseCase: MarkInvoicePaidUseCase,
    private readonly voidInvoiceUseCase: VoidInvoiceUseCase,
    private readonly listCouponsUseCase: ListCouponsUseCase,
    private readonly createCouponUseCase: CreateCouponUseCase,
    private readonly deactivateCouponUseCase: DeactivateCouponUseCase,
  ) {}

  // ── Account credits ──

  @Get('organizations/:id/credits')
  async getCredits(@Param('id', ParseUUIDPipe) id: string) {
    return this.getCreditsUseCase.execute(id);
  }

  @Post('organizations/:id/credits')
  async grantCredit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreditAdjustmentDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.grantCreditUseCase.execute(id, dto, actor(user), requestMeta(req));
  }

  @Post('organizations/:id/credits/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeCredit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreditAdjustmentDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.revokeCreditUseCase.execute(id, dto, actor(user), requestMeta(req));
  }

  // ── Manual invoices ──

  @Post('invoices')
  async createInvoice(@Body() dto: CreateManualInvoiceDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.createInvoiceUseCase.execute(dto, actor(user), requestMeta(req));
  }

  @Post('invoices/:id/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkInvoicePaidDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.markPaidUseCase.execute(id, dto, actor(user), requestMeta(req));
  }

  @Post('invoices/:id/void')
  @HttpCode(HttpStatus.OK)
  async voidInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidInvoiceDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.voidInvoiceUseCase.execute(id, dto.reason, actor(user), requestMeta(req));
  }

  // ── Coupons ──

  @Get('coupons')
  async listCoupons() {
    return this.listCouponsUseCase.execute();
  }

  @Post('coupons')
  async createCoupon(@Body() dto: CreateCouponDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.createCouponUseCase.execute(dto, actor(user), requestMeta(req));
  }

  @Post('coupons/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateCoupon(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.deactivateCouponUseCase.execute(id, actor(user), requestMeta(req));
  }
}
