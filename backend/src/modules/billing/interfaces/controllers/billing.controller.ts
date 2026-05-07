import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SubscriptionStatus, PaymentStatus, InvoiceStatus } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { CreatePlanDto } from '../../application/dto/create-plan.dto';
import { UpdatePlanDto } from '../../application/dto/update-plan.dto';
import { SubscribeDto, ChangePlanDto, CancelSubscriptionDto } from '../../application/dto/subscribe.dto';
import { ListInvoicesQueryDto, ListPaymentsQueryDto } from '../../application/dto/list-billing-query.dto';
import { CreateOrderDto, VerifyPaymentDto } from '../../application/dto/create-order.dto';
import { CreatePlanUseCase } from '../../application/use-cases/create-plan.use-case';
import { UpdatePlanUseCase } from '../../application/use-cases/update-plan.use-case';
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
import { UsageRepository } from '../../infrastructure/repositories/usage.repository';
import { UsageMetricType } from '@prisma/client';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly createPlanUseCase: CreatePlanUseCase,
    private readonly updatePlanUseCase: UpdatePlanUseCase,
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
    private readonly usageRepo: UsageRepository,
  ) {}

  // ── Plan Management (system/admin only) ──

  @Post('plans')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.BILLING_PLANS_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  async createPlan(
    @Body() dto: CreatePlanDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.createPlanUseCase.execute(
      user.sub,
      dto,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Patch('plans/:id')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.BILLING_PLANS_MANAGE)
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.updatePlanUseCase.execute(
      id,
      user.sub,
      dto,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Get('plans')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.BILLING_READ)
  async listPlans() {
    return this.listPlansUseCase.execute();
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
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const plan = await this.planRepo.findById(dto.planId);
    if (!plan || !plan.isActive || plan.deletedAt) {
      throw new NotFoundException('Plan not found or is no longer available');
    }
    if (plan.priceInCents === 0) {
      throw new BadRequestException('Free plans do not require a payment order');
    }

    // Razorpay receipt must be ≤ 40 chars
    const receiptId = `sub-${user.orgId.slice(0, 8)}-${Date.now().toString(36)}`;
    const order = await this.razorpayPayment.createOrder(
      plan.priceInCents,
      plan.currency,
      receiptId,
      { orgId: user.orgId, planId: dto.planId },
    );

    return {
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      planName: plan.name,
    };
  }

  /**
   * Step 2: Verify the Razorpay payment signature after checkout, then subscribe.
   * Frontend calls this after the Razorpay widget fires onSuccess.
   * Handles both: new subscription and TRIAL → ACTIVE upgrade.
   */
  @Post('verify-payment')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.BILLING_READ)
  @HttpCode(HttpStatus.CREATED)
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

    // Check if the org already has a trial subscription — if so, activate it
    const existing = await this.subscriptionRepo.findActiveByOrg(user.orgId);
    if (existing && existing.status === SubscriptionStatus.TRIAL) {
      // Transition trial → active on payment
      const plan = await this.planRepo.findById(dto.planId);
      if (!plan) throw new NotFoundException('Plan not found');

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + (plan.billingCycle === 'YEARLY' ? 12 : 1));

      const activated = await this.subscriptionRepo.transitionStatus(
        existing.id,
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.ACTIVE,
        {
          planId: plan.id,
          priceInCents: plan.priceInCents,
          trialEndsAt: null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      );

      await this.subscriptionRepo.recordEvent({
        orgId: user.orgId,
        subscriptionId: existing.id,
        previousStatus: SubscriptionStatus.TRIAL,
        newStatus: SubscriptionStatus.ACTIVE,
        triggeredById: user.sub,
        metadata: {
          planName: plan.name,
          razorpayPaymentId: dto.razorpayPaymentId,
          orderId: dto.orderId,
        },
      });

      // Record payment in history
      const payment = await this.paymentRepo.createPayment({
        orgId: user.orgId,
        subscriptionId: existing.id,
        amountInCents: plan.priceInCents,
        currency: plan.currency,
        externalId: dto.razorpayPaymentId,
        paymentMethod: 'razorpay',
        idempotencyKey: dto.idempotencyKey || `rzp-${dto.razorpayPaymentId}`,
      });
      await this.paymentRepo.transitionPaymentStatus(payment.id, PaymentStatus.PENDING, PaymentStatus.SUCCEEDED);

      // Create invoice and mark as PAID immediately
      const invoiceNumber = await this.paymentRepo.getNextInvoiceNumber();
      const invoice = await this.paymentRepo.createInvoice({
        orgId: user.orgId,
        subscriptionId: existing.id,
        paymentId: payment.id,
        invoiceNumber,
        amountInCents: plan.priceInCents,
        currency: plan.currency,
        periodStart: now,
        periodEnd,
        lineItems: [{ description: `${plan.name} — ${plan.billingCycle}`, amount: plan.priceInCents, currency: plan.currency }],
        dueDate: now,
      });
      await this.paymentRepo.transitionInvoiceStatus(invoice.id, InvoiceStatus.DRAFT, InvoiceStatus.PAID);

      // Reset usage counters to full plan limits (trial limits no longer apply)
      await this.usageRepo.resetUsageForOrg(
        user.orgId,
        now,
        periodEnd,
        {
          [UsageMetricType.MESSAGES_SENT]: plan.maxMessagesPerMonth,
          [UsageMetricType.ACTIVE_USERS]: plan.maxUsers,
          [UsageMetricType.WHATSAPP_SESSIONS]: plan.maxWhatsappSessions,
          [UsageMetricType.CAMPAIGN_EXECUTIONS]: plan.maxCampaignsPerMonth,
          [UsageMetricType.API_CALLS]: plan.maxMessagesPerMonth,
          [UsageMetricType.AI_CREDITS]: plan.aiCreditsPerMonth,
          [UsageMetricType.MESSAGE_TEMPLATES]: plan.maxMessageTemplates,
        },
      );

      return { subscription: activated, deduplicated: false };
    }

    return this.subscribeUseCase.execute(
      user.orgId,
      user.sub,
      {
        planId: dto.planId,
        razorpayPaymentId: dto.razorpayPaymentId,
        idempotencyKey: dto.idempotencyKey,
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
