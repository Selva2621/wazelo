import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { HqProtected, NotWazeloHqGuard } from '@/modules/org/interfaces/guards/not-wazelo-hq.guard';
import { SubscriptionStatus, PaymentStatus, InvoiceStatus } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { SubscribeDto, ChangePlanDto, CancelSubscriptionDto } from '../../application/dto/subscribe.dto';
import { ListInvoicesQueryDto, ListPaymentsQueryDto } from '../../application/dto/list-billing-query.dto';
import { CreateOrderDto, ValidateCouponDto, VerifyPaymentDto } from '../../application/dto/create-order.dto';
import {
  CreateCheckoutOrderUseCase,
  ResolveCheckoutOrderUseCase,
} from '../../application/use-cases/checkout-order.use-cases';
import { ActivateTrialPaymentUseCase } from '../../application/use-cases/activate-trial-payment.use-case';
import { RenewSubscriptionPaymentUseCase } from '../../application/use-cases/renew-subscription-payment.use-case';
import { ValidateCouponUseCase } from '../../application/use-cases/validate-coupon.use-case';
import { ListPlansUseCase } from '../../application/use-cases/list-plans.use-case';
import { SubscribeUseCase } from '../../application/use-cases/subscribe.use-case';
import { ChangePlanUseCase } from '../../application/use-cases/change-plan.use-case';
import { CancelSubscriptionUseCase } from '../../application/use-cases/cancel-subscription.use-case';
import { ReactivateSubscriptionUseCase } from '../../application/use-cases/reactivate-subscription.use-case';
import { GetSubscriptionUseCase } from '../../application/use-cases/get-subscription.use-case';
import { ListInvoicesUseCase, ListPaymentsUseCase } from '../../application/use-cases/list-invoices.use-case';
import { RazorpayPaymentService } from '../../domain/services/razorpay-payment.service';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly listPlansUseCase: ListPlansUseCase,
    private readonly subscribeUseCase: SubscribeUseCase,
    private readonly changePlanUseCase: ChangePlanUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private readonly reactivateSubscriptionUseCase: ReactivateSubscriptionUseCase,
    private readonly getSubscriptionUseCase: GetSubscriptionUseCase,
    private readonly listInvoicesUseCase: ListInvoicesUseCase,
    private readonly listPaymentsUseCase: ListPaymentsUseCase,
    private readonly razorpayPayment: RazorpayPaymentService,
    private readonly planRepo: PlanRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly createCheckoutOrderUseCase: CreateCheckoutOrderUseCase,
    private readonly resolveCheckoutOrderUseCase: ResolveCheckoutOrderUseCase,
    private readonly activateTrialPaymentUseCase: ActivateTrialPaymentUseCase,
    private readonly validateCouponUseCase: ValidateCouponUseCase,
    private readonly renewSubscriptionPaymentUseCase: RenewSubscriptionPaymentUseCase,
  ) {}

  // Plans are platform-wide: create/update live only under /super-admin/plans.
  // (Tenant org ADMINs bypass permission checks, so they must never reach them.)

  @Get('plans')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.BILLING_READ)
  async listPlans(@CurrentUser('orgId') orgId: string) {
    // Only the plans in the org's billing currency (INR for India, USD elsewhere)
    return this.listPlansUseCase.execute({ orgId });
  }

  // ── Razorpay Payment Flow ──

  /**
   * Step 1: Create a Razorpay order before checkout.
   * Returns orderId + amount so the frontend can open the Razorpay widget.
   */
  @Post('create-order')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.BILLING_READ)
  @HttpCode(HttpStatus.OK)
  @HqProtected('buy a plan for', 'self')
  @UseGuards(NotWazeloHqGuard)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createCheckoutOrderUseCase.execute(user.orgId, dto);
  }

  /** Checkout preview: does this coupon apply to this plan for the caller's org? */
  @Post('coupons/validate')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.BILLING_READ)
  @HttpCode(HttpStatus.OK)
  async validateCoupon(
    @Body() dto: ValidateCouponDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.validateCouponUseCase.execute(user.orgId, dto.code, dto.planId);
  }

  /**
   * Step 2: Verify the Razorpay payment signature after checkout, then subscribe.
   * Frontend calls this after the Razorpay widget fires onSuccess.
   * Handles: renewal (same plan / unpaid plan), plan change, TRIAL → ACTIVE, new subscription.
   */
  @Post('verify-payment')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.BILLING_READ)
  @HttpCode(HttpStatus.CREATED)
  @HqProtected('buy a plan for', 'self')
  @UseGuards(NotWazeloHqGuard)
  async verifyPayment(
    @Body() dto: VerifyPaymentDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const isValid = this.razorpayPayment.verifyPaymentSignature(
      dto.orderId,
      dto.razorpayPaymentId,
      dto.signature,
    );
    if (!isValid) {
      throw new BadRequestException('Payment verification failed: invalid signature');
    }

    // The order (read back from Razorpay) must be for this org + plan at the expected
    // price; it also carries any coupon priced into it
    const { coupon } = await this.resolveCheckoutOrderUseCase.execute(user.orgId, dto.orderId, dto.planId);

    // Check if the org already has a live subscription
    const existing = await this.subscriptionRepo.findActiveByOrg(user.orgId);

    // Paying to renew: the same plan while ACTIVE (extends, no lost days), or any plan
    // while unpaid (GRACE_PERIOD / PAST_DUE → ACTIVE). EXPIRED / CANCELLED are not live,
    // so they fall through to a fresh subscription below.
    if (existing && RenewSubscriptionPaymentUseCase.handles(existing, dto.planId)) {
      if (coupon) throw new BadRequestException('Coupons apply to a first payment only');
      return this.renewSubscriptionPaymentUseCase.execute(user.orgId, user.sub, existing, {
        planId: dto.planId,
        orderId: dto.orderId,
        razorpayPaymentId: dto.razorpayPaymentId,
        idempotencyKey: dto.idempotencyKey,
      });
    }

    // If an ACTIVE subscription exists on another plan, handle the plan change
    if (existing && existing.status === SubscriptionStatus.ACTIVE) {
      const plan = await this.planRepo.findById(dto.planId);
      if (!plan) throw new NotFoundException('Plan not found');
      if (coupon) throw new BadRequestException('Coupons apply to a first payment only');

      // Different plan — upgrade or downgrade, both go through Razorpay payment
      const isUpgrade = plan.priceInCents > existing.priceInCents;
      const planChangeType = isUpgrade ? 'Upgrade' : 'Downgrade';
      const now = new Date();

      // Record payment + invoice for all plan changes via Razorpay
      const planChangePayment = await this.paymentRepo.createPayment({
        orgId: user.orgId,
        subscriptionId: existing.id,
        amountInCents: plan.priceInCents,
        currency: plan.currency,
        externalId: dto.razorpayPaymentId,
        paymentMethod: 'razorpay',
        idempotencyKey: dto.idempotencyKey || `rzp-${planChangeType.toLowerCase()}-${dto.razorpayPaymentId}`,
      });
      await this.paymentRepo.transitionPaymentStatus(planChangePayment.id, PaymentStatus.PENDING, PaymentStatus.SUCCEEDED);

      const invoiceNumber = await this.paymentRepo.getNextInvoiceNumber();
      const planChangeInvoice = await this.paymentRepo.createInvoice({
        orgId: user.orgId,
        subscriptionId: existing.id,
        paymentId: planChangePayment.id,
        invoiceNumber,
        amountInCents: plan.priceInCents,
        currency: plan.currency,
        periodStart: existing.currentPeriodStart,
        periodEnd: existing.currentPeriodEnd,
        lineItems: [{ description: `${plan.name} — ${plan.billingCycle} (${planChangeType})`, amount: plan.priceInCents, currency: plan.currency }],
        dueDate: now,
      });
      await this.paymentRepo.transitionInvoiceStatus(planChangeInvoice.id, InvoiceStatus.DRAFT, InvoiceStatus.PAID);

      return this.changePlanUseCase.execute(
        user.orgId,
        user.sub,
        { newPlanId: dto.planId, idempotencyKey: dto.idempotencyKey },
        this.extractIp(req),
        this.extractUserAgent(req),
      );
    }

    // If a TRIAL subscription exists, activate it with this payment
    if (existing && existing.status === SubscriptionStatus.TRIAL) {
      return this.activateTrialPaymentUseCase.execute(user.orgId, user.sub, existing, {
        planId: dto.planId,
        orderId: dto.orderId,
        razorpayPaymentId: dto.razorpayPaymentId,
        idempotencyKey: dto.idempotencyKey,
        coupon,
      });
    }

    return this.subscribeUseCase.execute(
      user.orgId,
      user.sub,
      {
        planId: dto.planId,
        razorpayPaymentId: dto.razorpayPaymentId,
        idempotencyKey: dto.idempotencyKey,
        checkoutCoupon: coupon,
      },
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  // ── Subscription Management ──

  @Post('subscribe')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.BILLING_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  @HqProtected('buy a plan for', 'self')
  @UseGuards(NotWazeloHqGuard)
  async subscribe(
    @Body() dto: SubscribeDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.subscribeUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Post('change-plan')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.BILLING_MANAGE)
  @HttpCode(HttpStatus.OK)
  @HqProtected('change the plan of', 'self')
  @UseGuards(NotWazeloHqGuard)
  async changePlan(
    @Body() dto: ChangePlanDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.changePlanUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Post('cancel')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.BILLING_MANAGE)
  @HttpCode(HttpStatus.OK)
  @HqProtected('cancel the subscription of', 'self')
  @UseGuards(NotWazeloHqGuard)
  async cancelSubscription(
    @Body() dto: CancelSubscriptionDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.cancelSubscriptionUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Post('reactivate')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.BILLING_MANAGE)
  @HttpCode(HttpStatus.OK)
  @HqProtected('change the subscription of', 'self')
  @UseGuards(NotWazeloHqGuard)
  async reactivateSubscription(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.reactivateSubscriptionUseCase.execute(
      user.orgId,
      user.sub,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Get('subscription')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.BILLING_READ)
  async getSubscription(@CurrentUser() user: JwtPayload) {
    return this.getSubscriptionUseCase.execute(user.orgId);
  }

  // ── Invoices & Payments ──

  @Get('invoices')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.BILLING_INVOICES_READ)
  async listInvoices(
    @Query() query: ListInvoicesQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listInvoicesUseCase.execute(user.orgId, query);
  }

  @Get('payments')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.BILLING_INVOICES_READ)
  async listPayments(
    @Query() query: ListPaymentsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listPaymentsUseCase.execute(user.orgId, query);
  }

  @Get('payments/:id')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.BILLING_INVOICES_READ)
  async getPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const payment = await this.paymentRepo.findPaymentById(id);
    if (!payment || payment.orgId !== user.orgId) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  @Get('invoices/:id')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.BILLING_INVOICES_READ)
  async getInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const invoice = await this.paymentRepo.findInvoiceById(id);
    if (!invoice || invoice.orgId !== user.orgId) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  private extractIp(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private extractUserAgent(req: Request): string {
    return (req.headers['user-agent'] as string) || 'unknown';
  }
}
