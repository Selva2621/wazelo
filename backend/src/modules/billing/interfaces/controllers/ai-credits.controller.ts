import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { RazorpayPaymentService } from '../../domain/services/razorpay-payment.service';
import {
  CreateAiCreditOrderUseCase,
  FulfillAiCreditOrderUseCase,
  GetAiCreditsUseCase,
  ListAiCreditHistoryUseCase,
} from '../../application/use-cases/ai-credits.use-cases';

class CreateAiCreditOrderDto {
  @IsUUID()
  packId: string;
}

class VerifyAiCreditPaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}

class AiCreditHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/** The org's AI credits: balance, packs for sale, history, and buying a pack. */
@Controller('billing/ai-credits')
export class AiCreditsController {
  constructor(
    private readonly getAiCredits: GetAiCreditsUseCase,
    private readonly listHistory: ListAiCreditHistoryUseCase,
    private readonly createOrder: CreateAiCreditOrderUseCase,
    private readonly fulfillOrder: FulfillAiCreditOrderUseCase,
    private readonly razorpay: RazorpayPaymentService,
  ) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.BILLING_READ)
  get(@CurrentUser('orgId') orgId: string) {
    return this.getAiCredits.execute(orgId);
  }

  @Get('history')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.BILLING_READ)
  history(@CurrentUser('orgId') orgId: string, @Query() query: AiCreditHistoryQueryDto) {
    return this.listHistory.execute(orgId, query.page ?? 1, query.limit ?? 20);
  }

  @Post('orders')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.BILLING_READ)
  @HttpCode(HttpStatus.OK)
  order(@CurrentUser('orgId') orgId: string, @Body() dto: CreateAiCreditOrderDto) {
    return this.createOrder.execute(orgId, dto.packId);
  }

  @Post('verify')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.BILLING_READ)
  @HttpCode(HttpStatus.OK)
  verify(@CurrentUser('orgId') orgId: string, @Body() dto: VerifyAiCreditPaymentDto) {
    if (!this.razorpay.verifyPaymentSignature(dto.orderId, dto.razorpayPaymentId, dto.signature)) {
      throw new BadRequestException('Payment verification failed: invalid signature');
    }
    return this.fulfillOrder.execute({ orderId: dto.orderId, razorpayPaymentId: dto.razorpayPaymentId, orgId });
  }
}
